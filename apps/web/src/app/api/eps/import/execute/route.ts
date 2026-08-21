import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, EquipmentStatus, FieldType } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { enforceRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const STATUS_REVERSE_MAP: Record<string, EquipmentStatus> = {
  'в работе': 'ACTIVE',
  'работает': 'ACTIVE',
  'active': 'ACTIVE',
  'на ремонте': 'UNDER_REPAIR',
  'ремонт': 'UNDER_REPAIR',
  'under_repair': 'UNDER_REPAIR',
  'на складе': 'IN_STORAGE',
  'склад': 'IN_STORAGE',
  'in_storage': 'IN_STORAGE',
  'списано': 'DECOMMISSIONED',
  'списание': 'DECOMMISSIONED',
  'decommissioned': 'DECOMMISSIONED',
};

function parseEquipmentStatus(val: any): EquipmentStatus {
  if (!val) return 'ACTIVE';
  const norm = String(val).toLowerCase().trim();
  return STATUS_REVERSE_MAP[norm] || 'ACTIVE';
}

function parseCommissionDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  const rateLimitError = enforceRateLimit(req, { limit: 5, windowMs: 60 * 1000, prefix: 'batch-import' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_CREATE) || !hasPermission(user, PERMISSIONS.EPS_IMPORT_EXECUTE)) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const {
      rows = [],
      columnMapping = {},
      newFieldDefinitions = [],
      ignoredHeaders = [],
      conflictStrategy = 'UPSERT', // 'UPSERT' | 'SKIP'
    } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Нет данных для импорта' }, { status: 400 });
    }

    // Step 1: Create new Custom Field Definitions in Dictionary if requested
    const newlyCreatedFields: any[] = [];
    for (const def of newFieldDefinitions) {
      if (def && def.key && def.name) {
        try {
          const existing = await prisma.customFieldDefinition.findUnique({
            where: { key: def.key },
          });

          if (!existing) {
            const created = await prisma.customFieldDefinition.create({
              data: {
                key: def.key,
                name: def.name.trim(),
                fieldType: (def.fieldType as FieldType) || 'TEXT',
                unit: def.unit?.trim() || null,
                sectionId: def.sectionId || null,
              },
            });
            newlyCreatedFields.push(created);

            await logAuditEvent({
              userId: user.userId,
              action: 'CREATE',
              entityType: 'CustomField',
              entityId: created.id,
              changes: { name: created.name, key: created.key, fieldType: created.fieldType, createdFromImport: true },
            });
          }
        } catch (err) {
          console.error(`Ошибка создания поля ${def.key}:`, err);
        }
      }
    }

    // Prepare tag lookup cache
    const allTags = await prisma.tag.findMany();
    const tagMap = new Map<string, string>();
    allTags.forEach((t) => tagMap.set(t.name.toLowerCase().trim(), t.id));

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: { row: number; error: string }[] = [];

    // Step 2: Process each row
    for (let i = 0; i < rows.length; i++) {
      const rowItem = rows[i];
      const rawData = rowItem.data || rowItem;

      try {
        // Extract base fields based on mapping
        let nameVal = '';
        let invVal: string | null = null;
        let snVal: string | null = null;
        let mfgVal: string | null = null;
        let modelVal: string | null = null;
        let locVal: string | null = null;
        let statusVal: EquipmentStatus = 'ACTIVE';
        let commDateVal: Date | null = null;
        let tagsRaw = '';

        const customFieldsObj: Record<string, any> = {};

        Object.entries(columnMapping).forEach(([header, targetField]) => {
          if (ignoredHeaders.includes(header)) return;
          const val = rawData[header];
          if (val === undefined || val === null || String(val).trim() === '') return;

          const fieldStr = String(targetField);
          if (fieldStr === 'name') nameVal = String(val).trim();
          else if (fieldStr === 'inventoryNumber') invVal = String(val).trim();
          else if (fieldStr === 'serialNumber') snVal = String(val).trim();
          else if (fieldStr === 'manufacturer') mfgVal = String(val).trim();
          else if (fieldStr === 'model') modelVal = String(val).trim();
          else if (fieldStr === 'location') locVal = String(val).trim();
          else if (fieldStr === 'status') statusVal = parseEquipmentStatus(val);
          else if (fieldStr === 'commissionDate') commDateVal = parseCommissionDate(val);
          else if (fieldStr === 'tags') tagsRaw = String(val).trim();
          else if (fieldStr.startsWith('custom_')) {
            const customKey = fieldStr.replace('custom_', '');
            customFieldsObj[customKey] = val;
          }
        });

        if (!nameVal) {
          errorCount++;
          errors.push({ row: i + 1, error: 'Отсутствует наименование оборудования' });
          continue;
        }

        // Check if equipment already exists in DB
        let existingEquipment: any = null;
        if (invVal) {
          existingEquipment = await prisma.equipment.findUnique({
            where: { inventoryNumber: invVal },
          });
        }
        if (!existingEquipment && snVal) {
          existingEquipment = await prisma.equipment.findFirst({
            where: { serialNumber: snVal },
          });
        }

        // Process tag IDs
        const tagIdsToLink: string[] = [];
        if (tagsRaw) {
          const splitTags = tagsRaw.split(/[,;]+/).map((t) => t.trim()).filter(Boolean);
          for (const tagName of splitTags) {
            const lower = tagName.toLowerCase();
            let tagId = tagMap.get(lower);
            if (!tagId) {
              const newTag = await prisma.tag.create({ data: { name: tagName } });
              tagId = newTag.id;
              tagMap.set(lower, tagId);
            }
            tagIdsToLink.push(tagId);
          }
        }

        if (existingEquipment) {
          if (conflictStrategy === 'SKIP') {
            skippedCount++;
            continue;
          }

          // UPSERT Strategy: Update existing equipment
          const mergedCustom = {
            ...((existingEquipment.customFields as Record<string, any>) || {}),
            ...customFieldsObj,
          };

          await prisma.equipment.update({
            where: { id: existingEquipment.id },
            data: {
              name: nameVal || existingEquipment.name,
              serialNumber: snVal || existingEquipment.serialNumber,
              manufacturer: mfgVal || existingEquipment.manufacturer,
              model: modelVal || existingEquipment.model,
              location: locVal || existingEquipment.location,
              status: statusVal || existingEquipment.status,
              commissionDate: commDateVal || existingEquipment.commissionDate,
              customFields: mergedCustom,
            },
          });

          // Link tags
          if (tagIdsToLink.length > 0) {
            for (const tagId of tagIdsToLink) {
              await prisma.equipmentTag.upsert({
                where: { equipmentId_tagId: { equipmentId: existingEquipment.id, tagId } },
                create: { equipmentId: existingEquipment.id, tagId },
                update: {},
              });
            }
          }

          updatedCount++;
        } else {
          // Create new Equipment
          const newEq = await prisma.equipment.create({
            data: {
              name: nameVal,
              inventoryNumber: invVal,
              serialNumber: snVal,
              manufacturer: mfgVal,
              model: modelVal,
              location: locVal,
              status: statusVal,
              commissionDate: commDateVal,
              customFields: Object.keys(customFieldsObj).length > 0 ? customFieldsObj : undefined,
              createdById: user.userId,
            },
          });

          // Link tags
          if (tagIdsToLink.length > 0) {
            await prisma.equipmentTag.createMany({
              data: tagIdsToLink.map((tagId) => ({ equipmentId: newEq.id, tagId })),
              skipDuplicates: true,
            });
          }

          createdCount++;
        }
      } catch (err: any) {
        errorCount++;
        errors.push({ row: i + 1, error: err.message || 'Ошибка обработки строки' });
      }
    }

    // Step 3: Log audit event
    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'EquipmentImport',
      entityId: `import_${Date.now()}`,
      changes: {
        totalRows: rows.length,
        createdCount,
        updatedCount,
        skippedCount,
        errorCount,
        newCustomFieldsCreated: newlyCreatedFields.length,
        conflictStrategy,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalRows: rows.length,
        createdCount,
        updatedCount,
        skippedCount,
        errorCount,
        newCustomFieldsCreated: newlyCreatedFields.length,
        errors,
      },
    });
  } catch (error: any) {
    console.error('Ошибка выполнения импорта оборудования:', error);
    return NextResponse.json({ success: false, error: 'Ошибка выполнения импорта' }, { status: 500 });
  }
}

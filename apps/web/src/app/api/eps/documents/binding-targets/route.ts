import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { getEquipmentDecimalNumber } from '@/lib/eps-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (
      !hasPermission(user, PERMISSIONS.EPS_DOCUMENTS_VIEW) &&
      !hasPermission(user, PERMISSIONS.EPS_DOCUMENTS_UPLOAD) &&
      !user.roles.includes('admin')
    ) {
      return forbiddenResponse();
    }

    const equipment = await prisma.equipment.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        inventoryNumber: true,
        model: true,
        customFields: true,
      },
    });

    const modelsMap = new Map<string, { model: string; count: number; sampleEquipment: string[] }>();
    const decimalsMap = new Map<string, { decimalNumber: string; count: number; sampleEquipment: string[] }>();

    for (const eq of equipment) {
      if (eq.model && eq.model.trim()) {
        const m = eq.model.trim();
        const existing = modelsMap.get(m);
        const label = `${eq.inventoryNumber ? `[${eq.inventoryNumber}] ` : ''}${eq.name}`;
        if (existing) {
          existing.count++;
          if (existing.sampleEquipment.length < 3) existing.sampleEquipment.push(label);
        } else {
          modelsMap.set(m, { model: m, count: 1, sampleEquipment: [label] });
        }
      }

      // Extract decimal_number from customFields
      const dec = getEquipmentDecimalNumber(eq.customFields);
      if (dec) {
        const existing = decimalsMap.get(dec);
        const label = `${eq.inventoryNumber ? `[${eq.inventoryNumber}] ` : ''}${eq.name}`;
        if (existing) {
          existing.count++;
          if (existing.sampleEquipment.length < 3) existing.sampleEquipment.push(label);
        } else {
          decimalsMap.set(dec, { decimalNumber: dec, count: 1, sampleEquipment: [label] });
        }
      }
    }

    const models = Array.from(modelsMap.values()).sort(
      (a, b) => b.count - a.count || a.model.localeCompare(b.model, 'ru')
    );
    const decimalNumbers = Array.from(decimalsMap.values()).sort(
      (a, b) => b.count - a.count || a.decimalNumber.localeCompare(b.decimalNumber, 'ru')
    );

    return NextResponse.json({
      success: true,
      data: {
        models,
        decimalNumbers,
        totalEquipmentCount: equipment.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка получения параметров привязки документов:', message);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения справочников привязки', details: message },
      { status: 500 }
    );
  }
}

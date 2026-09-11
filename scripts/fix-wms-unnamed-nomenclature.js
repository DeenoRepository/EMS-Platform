/**
 * EMS Platform: Скрипт исправления номенклатуры "Без названия"
 * Восстанавливает корректные наименования, модели и категории ТМЦ из дампа dwms_dump.sql
 */

const fs = require('fs');
const path = require('path');

function loadEnvFiles() {
  const envCandidates = [
    path.resolve(process.cwd(), '.env.production'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env.production'),
    path.resolve(__dirname, '../.env'),
    '/opt/ems-platform/.env.production',
    '/opt/ems-platform/.env',
  ];

  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const key = trimmed.substring(0, idx).trim();
            const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        });
      } catch (e) {
        // ignore
      }
    }
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://ems_user:ems_secure_password_2026@localhost:5432/ems_db?schema=public';
  }
}

loadEnvFiles();

function getPrismaClient() {
  const candidates = [
    path.resolve(process.cwd(), 'packages/database/node_modules/@prisma/client'),
    path.resolve(process.cwd(), 'node_modules/@prisma/client'),
    path.resolve(__dirname, '../node_modules/@prisma/client'),
    path.resolve(__dirname, '../packages/database/node_modules/@prisma/client'),
    '/opt/ems-platform/packages/database/node_modules/@prisma/client',
    '/opt/ems-platform/node_modules/@prisma/client',
  ];

  for (const p of candidates) {
    try {
      const { PrismaClient } = require(p);
      return new PrismaClient();
    } catch (e) {
      // try next
    }
  }

  const { PrismaClient } = require('@prisma/client');
  return new PrismaClient();
}

const prisma = getPrismaClient();

function robustJsonParse(jsonStr) {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    const result = {};
    const extractField = (field) => {
      const regex = new RegExp(`"${field}":\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|null|([0-9.]+))`);
      const m = jsonStr.match(regex);
      if (m) {
        if (m[1] !== undefined) return m[1].replace(/\\\\/g, '\\').replace(/\\"/g, '"');
        if (m[2] !== undefined) return Number(m[2]);
      }
      return null;
    };

    const nameMatch = jsonStr.match(/"Name":\s*"([^"]+)"/);
    if (nameMatch) result.Name = nameMatch[1];

    const modelMatch = jsonStr.match(/"Model":\s*"(.+?)(?=",\s*"(?:Articul|MinLimit|SerialNumber|UnitOfMeasure)")/);
    if (modelMatch) {
      result.Model = modelMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/"+$/, '"');
    }

    result.Articul = extractField('Articul');
    result.MinLimit = extractField('MinLimit') || 0;
    result.SerialNumber = extractField('SerialNumber');
    result.UnitOfMeasure = extractField('UnitOfMeasure') || 'шт.';

    return result;
  }
}

function parseCopyTable(sqlContent, tableName) {
  const marker = 'COPY public.' + tableName;
  const start = sqlContent.indexOf(marker);
  if (start === -1) return [];
  const afterHeader = sqlContent.substring(start);
  const lines = afterHeader.split(/\r?\n/);
  const header = lines[0];
  const colNamesMatch = header.match(/\(([^)]+)\)/);
  const colNames = colNamesMatch ? colNamesMatch[1].split(',').map((c) => c.trim().replace(/"/g, '')) : [];

  const dataRows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '\\.') break;
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const row = {};
    colNames.forEach((col, idx) => {
      row[col] = parts[idx] === '\\N' ? null : parts[idx];
    });
    if (row.data) {
      row._data = robustJsonParse(row.data);
    }
    dataRows.push(row);
  }
  return dataRows;
}

async function main() {
  console.log('================================================================');
  console.log('🔧 EMS Platform: Восстановление наименований номенклатуры (ТМЦ)');
  console.log('================================================================');

  const dumpCandidates = [
    path.resolve(process.cwd(), 'temp/dwms_dump.sql'),
    path.resolve(__dirname, '../temp/dwms_dump.sql'),
    '/opt/ems-platform/temp/dwms_dump.sql',
    '/home/deps/temp/dwms_dump.sql',
  ];

  let dumpPath = null;
  for (const c of dumpCandidates) {
    if (fs.existsSync(c)) {
      dumpPath = c;
      break;
    }
  }

  if (!dumpPath) {
    console.error('❌ Файл dwms_dump.sql не найден в temp/');
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(dumpPath, 'utf8');
  const dwmsAssets = parseCopyTable(sqlContent, 'assets');
  console.log(`📦 Загружено позиций из дампа: ${dwmsAssets.length}`);

  // Получаем категории
  const sparePartsCat = await prisma.nomenclatureCategory.findFirst({
    where: { name: { contains: 'Запасные части', mode: 'insensitive' } },
  });
  const consumablesCat = await prisma.nomenclatureCategory.findFirst({
    where: { name: { contains: 'Расходные материалы', mode: 'insensitive' } },
  });

  let updatedCount = 0;
  for (const a of dwmsAssets) {
    const rawId = a.id;
    const baseName = (a._data?.Name || a.name || '').trim();
    if (!baseName || baseName === 'null') continue;

    const model = (a._data?.Model || a.model || '').trim();
    const articul = (a._data?.Articul || a.articul || '').trim();
    const serial = (a._data?.SerialNumber || a.serial_number || '').trim();

    let fullName = baseName;
    if (model && model !== 'null' && !baseName.toLowerCase().includes(model.toLowerCase())) {
      fullName = `${baseName} ${model}`;
    }

    const existing = await prisma.nomenclature.findUnique({
      where: { id: rawId },
    });

    if (existing) {
      const needsUpdate =
        !existing.name ||
        existing.name === 'Без названия' ||
        existing.name.trim() !== fullName.trim();

      if (needsUpdate) {
        let categoryId = existing.categoryId;
        const lowerName = fullName.toLowerCase();
        if (lowerName.includes('капиляр') || model || serial) {
          if (sparePartsCat) categoryId = sparePartsCat.id;
        }

        await prisma.nomenclature.update({
          where: { id: rawId },
          data: {
            name: fullName,
            description: model && model !== 'null' ? `Модель: ${model}` : (serial && serial !== 'null' ? `Серийный №: ${serial}` : existing.description),
            categoryId: categoryId || existing.categoryId,
          },
        });
        console.log(`  ✅ Обновлено ТМЦ [${rawId}]: "${existing.name}" ➔ "${fullName}"`);
        updatedCount++;
      }
    }
  }

  console.log(`\n🎉 Успешно обновлено позиций: ${updatedCount}`);
}

main()
  .catch((err) => {
    console.error('❌ Ошибка выполнения:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

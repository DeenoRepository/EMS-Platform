/**
 * EMS Platform: Скрипт импорта данных склада из базы dwms (dwms_dump.sql)
 * 
 * Импортирует:
 * 1. Склады (Warehouse) — 9 складов
 * 2. Номенклатура / ТМЦ (Nomenclature) — 335 позиций
 * 3. Локации / Зоны и Ячейки хранения (StorageZone, StorageCell)
 * 4. Складские остатки (StockItem) — 330 остатков (8 560 шт.)
 * 5. Историю операций и перемещений (StockOperation, StockTransfer)
 */

const fs = require('fs');
const path = require('path');

// 1. Загрузка переменных окружения
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

// 2. Инициализация Prisma
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

// 3. Парсер SQL COPY блоков из дампа
function parseCopyTable(sqlContent, tableName) {
  const marker = `COPY public.${tableName} `;
  const start = sqlContent.indexOf(marker);
  if (start === -1) return [];
  const afterHeader = sqlContent.substring(start);
  const end = afterHeader.indexOf('\\.\n');
  const tableContent = afterHeader.substring(0, end);
  const lines = tableContent.split('\n');
  const header = lines[0];
  const colNamesMatch = header.match(/\(([^)]+)\)/);
  const colNames = colNamesMatch ? colNamesMatch[1].split(',').map((c) => c.trim().replace(/"/g, '')) : [];

  const dataRows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split('\t');
    const row = {};
    colNames.forEach((col, idx) => {
      row[col] = parts[idx] === '\\N' ? null : parts[idx];
    });
    if (row.data) {
      try {
        row._data = JSON.parse(row.data);
      } catch (e) {
        // ignore json parse error
      }
    }
    dataRows.push(row);
  }
  return dataRows;
}

function slugify(text) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return text
    .toLowerCase()
    .split('')
    .map((c) => map[c] !== undefined ? map[c] : c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30);
}

async function main() {
  console.log('===============================================================');
  console.log('🚀 EMS Platform: Импорт складов, ТМЦ и остатков из базы dwms');
  console.log('===============================================================');

  const dumpPath = path.resolve(process.cwd(), 'temp/dwms_dump.sql');
  if (!fs.existsSync(dumpPath)) {
    console.error(`❌ Файл ${dumpPath} не найден. Поместите dwms_dump.sql в папку temp/`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(dumpPath, 'utf8');

  // Получаем администратора для привязки создателя
  let adminUser = await prisma.user.findFirst({
    where: {
      roles: {
        some: {
          role: {
            name: 'admin',
          },
        },
      },
    },
    select: { id: true, ldapLogin: true },
  });

  if (!adminUser) {
    adminUser = await prisma.user.findFirst({ select: { id: true, ldapLogin: true } });
  }

  if (!adminUser) {
    console.error('❌ Не найден пользователь администратор в базе данных.');
    process.exit(1);
  }

  console.log(`👤 Привязка операций к пользователю: ${adminUser.ldapLogin || adminUser.id}`);

  // 1. Импорт складов (Warehouse)
  console.log('\n🏬 1. Импорт складов...');
  const dwmsWarehouses = parseCopyTable(sqlContent, 'warehouses');
  const warehouseIdMap = new Map(); // oldId -> newId

  let whIndex = 1;
  for (const wh of dwmsWarehouses) {
    const rawId = wh.id;
    const name = wh._data?.Name || wh.name || `Склад №${whIndex}`;
    const code = `WH-${slugify(name).toUpperCase() || String(whIndex).padStart(2, '0')}`;

    let warehouse = await prisma.warehouse.findFirst({
      where: {
        OR: [{ id: rawId }, { code }, { name }],
      },
    });

    if (!warehouse) {
      warehouse = await prisma.warehouse.create({
        data: {
          id: rawId,
          name,
          code,
          location: 'г. Новосибирск',
          isActive: true,
        },
      });
      console.log(`  ➕ Создан склад: "${name}" (${code})`);
    } else {
      console.log(`  ✔ Склад уже существует: "${warehouse.name}" (${warehouse.code})`);
    }
    warehouseIdMap.set(rawId, warehouse.id);
    whIndex++;
  }

  // 2. Создание категорий ТМЦ (NomenclatureCategory)
  console.log('\n📁 2. Инициализация категорий номенклатуры...');
  const categories = [
    { name: 'Расходные материалы и комплектующие', code: 'consumables' },
    { name: 'Запасные части и узлы', code: 'spare-parts' },
    { name: 'Инструменты и оснастка', code: 'tools' },
    { name: 'Крепеж и метизы', code: 'fasteners' },
    { name: 'Электронные компоненты', code: 'electronics' },
  ];

  const categoryMap = new Map();
  for (const cat of categories) {
    let dbCat = await prisma.nomenclatureCategory.findFirst({
      where: { name: cat.name },
    });
    if (!dbCat) {
      dbCat = await prisma.nomenclatureCategory.create({
        data: { name: cat.name },
      });
    }
    categoryMap.set(cat.code, dbCat.id);
  }

  // 3. Импорт номенклатуры (Nomenclature / assets)
  console.log('\n📦 3. Импорт номенклатуры (ТМЦ)...');
  const dwmsAssets = parseCopyTable(sqlContent, 'assets');
  const assetIdMap = new Map(); // oldId -> newId
  let createdNomenclatures = 0;
  let updatedNomenclatures = 0;

  for (const a of dwmsAssets) {
    const rawId = a.id;
    const name = a._data?.Name || a.name;
    if (!name) continue;

    const model = a._data?.Model || a.model || null;
    const articul = a._data?.Articul || a.articul || null;
    const serial = a._data?.SerialNumber || a.serial_number || null;
    const unit = a._data?.UnitOfMeasure || a.unit_of_measure || 'шт.';
    const minLimit = a._data?.MinLimit !== undefined ? Number(a._data.MinLimit) : Number(a.min_limit || 0);

    // Подбираем категорию
    let categoryId = categoryMap.get('consumables');
    const lowerName = name.toLowerCase();
    if (lowerName.includes('сверло') || lowerName.includes('фреза') || lowerName.includes('ключ') || lowerName.includes('отвертк') || lowerName.includes('инструмент')) {
      categoryId = categoryMap.get('tools');
    } else if (lowerName.includes('винт') || lowerName.includes('болт') || lowerName.includes('гайка') || lowerName.includes('шайба')) {
      categoryId = categoryMap.get('fasteners');
    } else if (lowerName.includes('микросхем') || lowerName.includes('резистор') || lowerName.includes('конденсатор') || lowerName.includes('диод') || lowerName.includes('транзистор')) {
      categoryId = categoryMap.get('electronics');
    } else if (model || serial || lowerName.includes('узел') || lowerName.includes('плата') || lowerName.includes('датчик') || lowerName.includes('блок')) {
      categoryId = categoryMap.get('spare-parts');
    }

    let existingNom = await prisma.nomenclature.findFirst({
      where: {
        OR: [
          { id: rawId },
          { name },
          ...(articul ? [{ article: articul }] : []),
        ],
      },
    });

    if (existingNom) {
      await prisma.nomenclature.update({
        where: { id: existingNom.id },
        data: {
          name,
          unit: unit.replace(/\.$/, ''),
          minStock: minLimit,
          description: model ? `Модель: ${model}` : existingNom.description,
          categoryId,
        },
      });
      assetIdMap.set(rawId, existingNom.id);
      updatedNomenclatures++;
    } else {
      const newNom = await prisma.nomenclature.create({
        data: {
          id: rawId,
          name,
          article: articul || undefined,
          unit: unit.replace(/\.$/, '') || 'шт',
          minStock: minLimit,
          description: model ? `Модель: ${model}` : (serial ? `Серийный №: ${serial}` : null),
          categoryId,
        },
      });
      assetIdMap.set(rawId, newNom.id);
      createdNomenclatures++;
    }
  }

  console.log(`✅ Номенклатура обработана: создано ${createdNomenclatures}, обновлено ${updatedNomenclatures}. Всего: ${dwmsAssets.length}`);

  // 4. Импорт локаций, зон и ячеек адресного хранения (locations & stock cells)
  console.log('\n📍 4. Настройка зон и ячеек хранения...');
  const dwmsStock = parseCopyTable(sqlContent, 'stock');
  const cellMap = new Map(); // "warehouseId:cellCode" -> cellId

  for (const s of dwmsStock) {
    const rawWhId = s._data?.WarehouseId || s.warehouse_id;
    const mappedWhId = warehouseIdMap.get(rawWhId);
    if (!mappedWhId) continue;

    const building = s._data?.Building || s.building || '';
    const room = s._data?.Room || s.room || '';
    const cellName = s._data?.Cell || s.cell || '';

    if (building || room || cellName) {
      const zoneName = [building, room ? `пом. ${room}` : ''].filter(Boolean).join(', ') || 'Основная зона';
      const zoneCode = slugify(zoneName).toUpperCase() || 'MAIN-ZONE';

      let zone = await prisma.storageZone.findFirst({
        where: { warehouseId: mappedWhId, code: zoneCode },
      });

      if (!zone) {
        zone = await prisma.storageZone.create({
          data: {
            warehouseId: mappedWhId,
            name: zoneName,
            code: zoneCode,
          },
        });
      }

      const cellCode = cellName || 'CELL-01';
      let cell = await prisma.storageCell.findFirst({
        where: { zoneId: zone.id, code: cellCode },
      });

      if (!cell) {
        cell = await prisma.storageCell.create({
          data: {
            zoneId: zone.id,
            code: cellCode,
            name: cellName ? `Ячейка ${cellName}` : 'Основная полка',
          },
        });
      }

      cellMap.set(`${mappedWhId}:${rawWhId}:${s.id}`, cell.id);
    }
  }

  // 5. Импорт складских остатков (StockItem)
  console.log('\n📊 5. Импорт остатков ТМЦ на складах...');
  let createdStock = 0;
  let updatedStock = 0;
  let totalQtySum = 0;

  for (const s of dwmsStock) {
    const rawWhId = s._data?.WarehouseId || s.warehouse_id;
    const rawAssetId = s._data?.MaterialAssetId || s.material_asset_id;
    const qty = Number(s._data?.Quantity !== undefined ? s._data.Quantity : (s.quantity || 0));

    const mappedWhId = warehouseIdMap.get(rawWhId);
    const mappedAssetId = assetIdMap.get(rawAssetId);

    if (!mappedWhId || !mappedAssetId) continue;

    const cellId = cellMap.get(`${mappedWhId}:${rawWhId}:${s.id}`) || null;

    const existingStock = await prisma.stockItem.findUnique({
      where: {
        warehouseId_nomenclatureId: {
          warehouseId: mappedWhId,
          nomenclatureId: mappedAssetId,
        },
      },
    });

    if (existingStock) {
      await prisma.stockItem.update({
        where: { id: existingStock.id },
        data: {
          quantity: qty,
          cellId: cellId || existingStock.cellId,
        },
      });
      updatedStock++;
    } else {
      await prisma.stockItem.create({
        data: {
          warehouseId: mappedWhId,
          nomenclatureId: mappedAssetId,
          quantity: qty,
          cellId,
        },
      });
      createdStock++;
    }
    totalQtySum += qty;
  }

  console.log(`✅ Складские остатки импортированы: создано ${createdStock}, обновлено ${updatedStock}.`);
  console.log(`📦 Суммарное количество ТМЦ на складах: ${totalQtySum.toLocaleString('ru-RU')} шт.`);

  // 6. Импорт перемещений (transfers)
  console.log('\n🚚 6. Импорт перемещений между складами...');
  const dwmsTransfers = parseCopyTable(sqlContent, 'transfers');
  let createdTransfers = 0;

  for (let i = 0; i < dwmsTransfers.length; i++) {
    const t = dwmsTransfers[i];
    const srcWhId = warehouseIdMap.get(t._data?.SourceWarehouseId || t.source_warehouse_id);
    const tgtWhId = warehouseIdMap.get(t._data?.TargetWarehouseId || t.target_warehouse_id);
    const assetId = assetIdMap.get(t._data?.MaterialAssetId || t.material_asset_id);
    const qty = Number(t._data?.Quantity !== undefined ? t._data.Quantity : (t.quantity || 0));
    const transferNumber = `TR-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`;

    if (!srcWhId || !tgtWhId || !assetId) continue;

    const existingTransfer = await prisma.stockTransfer.findUnique({
      where: { transferNumber },
    });

    if (!existingTransfer) {
      await prisma.stockTransfer.create({
        data: {
          transferNumber,
          sourceWarehouseId: srcWhId,
          targetWarehouseId: tgtWhId,
          status: 'COMPLETED',
          createdById: adminUser.id,
          requestReason: 'Плановое перемещение ТМЦ (dwms)',
          dispatchedAt: new Date(t._data?.Timestamp || t.timestamp || Date.now()),
          receivedAt: new Date(t._data?.Timestamp || t.timestamp || Date.now()),
          items: {
            create: [
              {
                nomenclatureId: assetId,
                quantity: qty,
              },
            ],
          },
        },
      });
      createdTransfers++;
    }
  }

  console.log(`✅ Перемещения импортированы: ${createdTransfers} шт.`);

  // 7. Импорт логов и операций (StockOperation & AuditLog)
  console.log('\n📝 7. Импорт истории складских операций...');
  const dwmsLogs = parseCopyTable(sqlContent, 'logs');
  let createdOps = 0;

  for (const l of dwmsLogs.slice(0, 200)) {
    const details = l._data?.Details || l.details || '';
    const opTypeRaw = l._data?.OperationType || l.operation_type || 'Приход';
    const timestamp = new Date(l._data?.Timestamp || l.timestamp || Date.now());

    let opType = 'RECEIPT';
    if (opTypeRaw.includes('Расход') || opTypeRaw.includes('Списание')) opType = 'ISSUE';
    else if (opTypeRaw.includes('Перемещение')) opType = 'TRANSFER';
    else if (opTypeRaw.includes('Выдача')) opType = 'ISSUE_EMPLOYEE';

    // Находим склад по умолчанию
    const primaryWarehouse = await prisma.warehouse.findFirst();
    if (!primaryWarehouse) continue;

    await prisma.stockOperation.create({
      data: {
        warehouseId: primaryWarehouse.id,
        type: opType,
        date: isNaN(timestamp.getTime()) ? new Date() : timestamp,
        comment: details || `Операция ${opTypeRaw} из журнала dwms`,
        createdById: adminUser.id,
      },
    });
    createdOps++;
  }

  console.log(`✅ История операций импортирована: ${createdOps} записей.`);

  console.log('\n===============================================================');
  console.log('🎉 Импорт WMS успешно завершен!');
  console.log(`🏬 Складов в базе: ${dwmsWarehouses.length}`);
  console.log(`📦 Позиций номенклатуры: ${dwmsAssets.length}`);
  console.log(`📊 Записей остатков: ${dwmsStock.length} (${totalQtySum} единиц продукции)`);
  console.log(`🚚 Перемещений: ${createdTransfers}`);
  console.log('===============================================================');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при импорте WMS:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// ==============================================================================
// EMS Platform — Скрипт автоматической привязки файлов из uploads к паспортам
// Использование: node scripts/sync-uploaded-documents.js [путь_к_папке]
// Пример: node scripts/sync-uploaded-documents.js /opt/ems-platform/uploads
// ==============================================================================

const fs = require('fs');
const path = require('path');
const { loadEnvFiles, requireDatabaseUrl } = require('./lib/load-env');

loadEnvFiles();
requireDatabaseUrl();

function resolveModule(moduleName, fallbacks = []) {
  try {
    return require(moduleName);
  } catch (e) {
    for (const fb of fallbacks) {
      try {
        return require(path.resolve(process.cwd(), fb));
      } catch {}
      try {
        return require(path.resolve(__dirname, '..', fb));
      } catch {}
    }
    throw e;
  }
}

const { PrismaClient } = resolveModule('@prisma/client', [
  'node_modules/@prisma/client',
  'packages/database/node_modules/@prisma/client',
  'apps/web/node_modules/@prisma/client',
]);

const prisma = new PrismaClient();

// Определение типа документа по имени файла
function detectDocType(fileName) {
  const lower = fileName.toLowerCase();
  if (/схем|электр|чертеж|черт|schema|draw|wiring/i.test(lower)) return 'SCHEMA';
  if (/руководств|инструкц|manual|guide|эксплуат/i.test(lower)) return 'MANUAL';
  if (/сертификат|соответств|cert/i.test(lower)) return 'CERTIFICATE';
  if (/паспорт|passport/i.test(lower)) return 'PASSPORT';
  if (/акт|act|ввод|прием/i.test(lower)) return 'ACT';
  return 'OTHER';
}

function getMimeType(ext) {
  const map = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.txt': 'text/plain',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

async function main() {
  const targetDir = process.argv[2] || process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
  console.log(`📁 Сканирование документов в директории: ${targetDir}`);

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Папка "${targetDir}" не найдена.`);
    process.exit(1);
  }

  // Получаем первого системного пользователя / админа для привязки uploadedById
  const adminUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true, displayName: true },
  });

  if (!adminUser) {
    console.error('❌ В базе данных не найден ни один пользователь.');
    process.exit(1);
  }

  // Загружаем все оборудование для сопоставления
  const allEquipment = await prisma.equipment.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, inventoryNumber: true, serialNumber: true },
  });

  console.log(`Загружено ${allEquipment.length} единиц оборудования из базы данных.`);

  const files = getAllFiles(targetDir);
  console.log(`Найдено файлов на диске: ${files.length}`);

  let linkedCount = 0;
  let skippedCount = 0;

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();

    // Пропускаем служебные файлы и временные блокировки
    if (fileName.startsWith('.') || fileName.endsWith('.tmp')) continue;

    // Относительный путь от папки uploads
    const relativePath = path.relative(targetDir, filePath);
    const subFolder = relativePath.includes(path.sep) ? path.dirname(relativePath) : '';

    // Ищем соответствие с оборудованием:
    // 1. По точному или частичному совпадению инвентарного номера
    // 2. По серийному номеру
    // 3. По названию родительской подпапки
    let matchedEq = null;

    for (const eq of allEquipment) {
      const inv = (eq.inventoryNumber || '').trim();
      const sn = (eq.serialNumber || '').trim();

      if (inv && (fileName.includes(inv) || subFolder.includes(inv))) {
        matchedEq = eq;
        break;
      }
      if (sn && sn.length >= 3 && (fileName.includes(sn) || subFolder.includes(sn))) {
        matchedEq = eq;
        break;
      }
    }

    if (!matchedEq) {
      // console.log(`⚠️ Не удалось определить оборудование для файла: ${fileName}`);
      skippedCount++;
      continue;
    }

    // Проверяем, существует ли уже запись в базе для этого файла
    const existingDoc = await prisma.document.findFirst({
      where: {
        equipmentId: matchedEq.id,
        originalName: fileName,
      },
    });

    if (existingDoc) {
      continue;
    }

    const stat = fs.statSync(filePath);
    const docType = detectDocType(fileName);
    const mimeType = getMimeType(ext);

    // Целевая структура хранения: uploads/documents/
    const destinationFolder = path.join(targetDir, 'documents');
    if (!fs.existsSync(destinationFolder)) {
      fs.mkdirSync(destinationFolder, { recursive: true });
    }

    // Сохраняем/регистрируем документ
    await prisma.document.create({
      data: {
        equipmentId: matchedEq.id,
        fileName: fileName,
        originalName: fileName,
        filePath: `documents/${fileName}`,
        fileType: mimeType,
        fileSize: stat.size,
        docType: docType,
        uploadedById: adminUser.id,
        description: `Автоматически импортированный документ (${matchedEq.inventoryNumber || matchedEq.name})`,
      },
    });

    linkedCount++;
    console.log(`🔗 Привязан: "${fileName}" ➔ Оборудование [Инв. № ${matchedEq.inventoryNumber || '—'}] ${matchedEq.name}`);
  }

  console.log('======================================================');
  console.log(`✅ Итог: успешно привязано новых документов: ${linkedCount}`);
  if (skippedCount > 0) {
    console.log(`ℹ️ Пропущено файлов (не содержат инв./сер. номер в названии или уже привязаны): ${skippedCount}`);
  }
  console.log('======================================================');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка синхронизации документов:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

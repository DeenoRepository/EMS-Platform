import { prisma, SrmProviderType, SrmAuthType } from '@ems/database';
import * as path from 'path';
import * as fs from 'fs';
import { parseJiraXmlFile, JiraIssue } from '../docker/jira/server';

interface ImportSummary {
  totalParsed: number;
  totalUpserted: number;
  matchedEquipmentCount: number;
  byProject: Record<string, { total: number; matched: number }>;
}

/**
 * Извлечение инвентарного или серийного номера из строки описания оборудования
 */
function extractEquipmentIdentifiers(rawEquipmentString: string): {
  inventoryNumber: string | null;
  serialNumber: string | null;
  rawText: string;
} {
  if (!rawEquipmentString) {
    return { inventoryNumber: null, serialNumber: null, rawText: '' };
  }

  const rawText = rawEquipmentString.trim();

  // 1. Поиск 5-7 значного инвентарного номера
  const invMatch = /(\d{5,7})/.exec(rawText);
  const inventoryNumber = invMatch ? invMatch[1] : null;

  // 2. Поиск заводского номера: зав.1445, зав. 1444, s/n: 1234
  const snMatch = /(?:зав\.?|s\/n|sn|серийный)\s*[:#]?\s*([A-Za-z0-9-]+)/i.exec(rawText);
  const serialNumber = snMatch ? snMatch[1] : null;

  return { inventoryNumber, serialNumber, rawText };
}

async function main() {
  console.log('===============================================================');
  console.log('🚀 EMS Platform — SRM Jira XML Data Importer & Synchronizer');
  console.log('===============================================================\n');

  const tempDir = path.resolve(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    console.error(`❌ Ошибка: Папка "${tempDir}" не найдена!`);
    process.exit(1);
  }

  const xmlFiles = fs.readdirSync(tempDir).filter((f) => f.endsWith('.xml'));
  if (xmlFiles.length === 0) {
    console.warn(`⚠️ В папке "${tempDir}" нет XML-файлов.`);
    return;
  }

  console.log(`📂 Найдено XML-файлов экспорта Jira: ${xmlFiles.length}`);

  // 1. Создание / получение базовых интеграций SRM в БД
  console.log('\n⚙️ Настройка провайдеров интеграций SrmIntegration...');

  const defaultIntegration = await prisma.srmIntegration.upsert({
    where: { id: 'srm-jira-default' },
    create: {
      id: 'srm-jira-default',
      name: 'Корпоративная Jira SRM (Все сектора)',
      providerType: SrmProviderType.JIRA,
      isActive: true,
      isDefault: true,
      baseUrl: process.env.JIRA_BASE_URL || 'http://localhost:8080',
      authType: SrmAuthType.BASIC,
      authConfig: { username: 'admin', password: 'adminpassword' },
      queryConfig: {
        endpoint: '/rest/api/2/search',
        projectKey: 'GRIO',
        jql: 'project in (GRIO, GRIO1, GRIO2) ORDER BY created DESC',
        maxResults: 100,
      },
      syncInterval: 30,
      lastSyncStatus: 'SUCCESS',
      lastSyncAt: new Date(),
    },
    update: {
      baseUrl: process.env.JIRA_BASE_URL || 'http://localhost:8080',
      lastSyncAt: new Date(),
    },
  });

  const projectIntegrationsMap: Record<string, string> = {
    GRIO: defaultIntegration.id,
    GRIO1: defaultIntegration.id,
    GRIO2: defaultIntegration.id,
  };

  const specificConfigs = [
    { key: 'GRIO', name: 'Jira — ГРиО КПИМС (Сектор сборки)', id: 'srm-jira-grio' },
    { key: 'GRIO1', name: 'Jira — ГРиО НПКПП (Сектор сборки)', id: 'srm-jira-grio1' },
    { key: 'GRIO2', name: 'Jira — ГриО КПИМС (Сектор измерений)', id: 'srm-jira-grio2' },
  ];

  for (const conf of specificConfigs) {
    const integ = await prisma.srmIntegration.upsert({
      where: { id: conf.id },
      create: {
        id: conf.id,
        name: conf.name,
        providerType: SrmProviderType.JIRA,
        isActive: true,
        isDefault: false,
        baseUrl: process.env.JIRA_BASE_URL || 'http://localhost:8080',
        authType: SrmAuthType.BASIC,
        authConfig: { username: 'admin', password: 'adminpassword' },
        queryConfig: {
          endpoint: '/rest/api/2/search',
          projectKey: conf.key,
          jql: `project = ${conf.key} ORDER BY created DESC`,
          maxResults: 100,
        },
        syncInterval: 60,
      },
      update: {
        baseUrl: process.env.JIRA_BASE_URL || 'http://localhost:8080',
      },
    });
    projectIntegrationsMap[conf.key] = integ.id;
  }

  // 2. Загрузка оборудования для умного сопоставления
  console.log('\n🔍 Загрузка реестра оборудования (EPS Equipment)...');
  const allEquipment = await prisma.equipment.findMany({
    select: {
      id: true,
      name: true,
      inventoryNumber: true,
      serialNumber: true,
    },
  });
  console.log(`📦 Загружено ${allEquipment.length} единиц оборудования из базы данных.`);

  // Быстрые Map для поиска
  const eqByInv = new Map<string, string>();
  const eqBySn = new Map<string, string>();
  for (const eq of allEquipment) {
    if (eq.inventoryNumber) eqByInv.set(eq.inventoryNumber.trim().toLowerCase(), eq.id);
    if (eq.serialNumber) eqBySn.set(eq.serialNumber.trim().toLowerCase(), eq.id);
  }

  // 3. Парсинг и импорт
  const summary: ImportSummary = {
    totalParsed: 0,
    totalUpserted: 0,
    matchedEquipmentCount: 0,
    byProject: {},
  };

  for (const file of xmlFiles) {
    const fullPath = path.join(tempDir, file);
    console.log(`\n📄 Обработка файла: "${file}"...`);
    const issues: JiraIssue[] = parseJiraXmlFile(fullPath);
    console.log(`  -> Распарсено ${issues.length} заявок`);
    summary.totalParsed += issues.length;

    for (const issue of issues) {
      const projKey = issue.fields.project.key || 'GRIO';
      if (!summary.byProject[projKey]) {
        summary.byProject[projKey] = { total: 0, matched: 0 };
      }
      summary.byProject[projKey].total++;

      // Сопоставление с оборудованием
      const eqRaw = issue.fields.customfield_10100 || '';
      const { inventoryNumber, serialNumber, rawText } = extractEquipmentIdentifiers(eqRaw);

      let matchedEquipmentId: string | null = null;
      if (inventoryNumber && eqByInv.has(inventoryNumber.toLowerCase())) {
        matchedEquipmentId = eqByInv.get(inventoryNumber.toLowerCase()) || null;
      } else if (serialNumber && eqBySn.has(serialNumber.toLowerCase())) {
        matchedEquipmentId = eqBySn.get(serialNumber.toLowerCase()) || null;
      } else if (rawText) {
        // Поиск по подстроке в названии
        const found = allEquipment.find((e) => e.name && rawText.toLowerCase().includes(e.name.toLowerCase()));
        if (found) matchedEquipmentId = found.id;
      }

      if (matchedEquipmentId) {
        summary.matchedEquipmentCount++;
        summary.byProject[projKey].matched++;
      }

      const integrationId = projectIntegrationsMap[projKey] || defaultIntegration.id;

      await prisma.jiraIssueCache.upsert({
        where: { issueKey: issue.key },
        create: {
          issueKey: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          priority: issue.fields.priority.name,
          issueType: issue.fields.issuetype.name,
          assignee: issue.fields.assignee?.displayName || null,
          reporter: issue.fields.reporter?.displayName || null,
          createdDate: new Date(issue.fields.created),
          resolvedDate: issue.fields.resolutiondate ? new Date(issue.fields.resolutiondate) : null,
          equipmentId: matchedEquipmentId,
          integrationId,
          rawData: issue as any,
          syncedAt: new Date(),
        },
        update: {
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          priority: issue.fields.priority.name,
          issueType: issue.fields.issuetype.name,
          assignee: issue.fields.assignee?.displayName || null,
          reporter: issue.fields.reporter?.displayName || null,
          createdDate: new Date(issue.fields.created),
          resolvedDate: issue.fields.resolutiondate ? new Date(issue.fields.resolutiondate) : null,
          equipmentId: matchedEquipmentId,
          integrationId,
          rawData: issue as any,
          syncedAt: new Date(),
        },
      });

      summary.totalUpserted++;
    }
  }

  console.log('\n===============================================================');
  console.log('✅ ИМПОРТ ДАННЫХ SRM JIRA УСПЕШНО ЗАВЕРШЕН!');
  console.log('===============================================================');
  console.log(`📊 Всего распарсено заявок:   ${summary.totalParsed}`);
  console.log(`💾 Всего сохранено в БД:       ${summary.totalUpserted}`);
  console.log(`🔗 Сопоставлено с оборудованием: ${summary.matchedEquipmentCount} (${((summary.matchedEquipmentCount / summary.totalParsed) * 100).toFixed(1)}%)`);
  console.log('\n📁 Распределение по проектам:');
  for (const [pKey, stats] of Object.entries(summary.byProject)) {
    console.log(`  • Проект ${pKey.padEnd(6)}: ${String(stats.total).padStart(4)} заявок (сопоставлено оборудования: ${stats.matched})`);
  }
  console.log('===============================================================\n');
}

main()
  .catch((err) => {
    console.error('❌ Критическая ошибка во время импорта данных Jira:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

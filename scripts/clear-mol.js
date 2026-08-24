// ==============================================================================
// EMS Platform — Скрипт очистки МОЛ (ответственных лиц) в базе данных EPS
// Запуск: node scripts/clear-mol.js
// ==============================================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Запуск очистки МОЛ в модуле EPS...');

  const equipments = await prisma.equipment.findMany({
    where: { customFields: { not: null } },
    select: { id: true, name: true, customFields: true },
  });

  console.log(`Найдено ${equipments.length} единиц оборудования с дополнительными параметрами.`);

  const molKeys = [
    'responsible_person_name',
    'otvetstvennoe_litso_fio_dolzhnost',
    'otvetstvennyy',
    'otvetstvennoe_litso',
    'fio_otvetstvennogo',
    'mol',
    'otvetstvennyy_mol',
  ];

  let updatedCount = 0;

  for (const eq of equipments) {
    if (!eq.customFields || typeof eq.customFields !== 'object') continue;

    const cf = { ...eq.customFields };
    let hasMol = false;

    for (const key of molKeys) {
      if (cf[key] !== undefined) {
        delete cf[key];
        hasMol = true;
      }
    }

    if (hasMol) {
      await prisma.equipment.update({
        where: { id: eq.id },
        data: { customFields: cf },
      });
      updatedCount++;
    }
  }

  // Также удаляем устаревшие транслитерированные кастомные поля из справочника
  const deletedFields = await prisma.customFieldDefinition.deleteMany({
    where: {
      key: {
        in: [
          'unikal_noe_oborudovanie',
          'unikalnoe_oborudovanie',
          'otvetstvennoe_litso_fio_dolzhnost',
          'otvetstvennyy',
          'otvetstvennoe_litso',
          'fio_otvetstvennogo',
          'kod_okof_2',
          'kod_okpd_2',
          'fakticheskiy_iznos',
          'tehnicheskoe_obsluzhivanie_2026',
          'kol_vo_to_po_grafiku',
        ],
      },
    },
  });

  console.log(`✅ Успешно очищен МОЛ в ${updatedCount} единицах оборудования.`);
  if (deletedFields.count > 0) {
    console.log(`🧹 Удалено ${deletedFields.count} устаревших/дублирующих определений полей.`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при выполнении скрипта:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

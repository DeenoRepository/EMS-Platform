#!/usr/bin/env node
/**
 * Скрипт нормализации булевых полей в customFields оборудования.
 * Преобразует строковые "Нет", "Да", "false", "true" в реальные boolean (false / true).
 *
 * Запуск: node scripts/fix-equipment-booleans.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function isTruthyBoolean(val) {
  if (val === true || val === 1) return true;
  if (val === false || val === 0 || val === null || val === undefined) return false;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'да' || s === 'yes' || s === 'y' || s === '+') return true;
    if (s === 'false' || s === '0' || s === 'нет' || s === 'no' || s === 'n' || s === '-' || s === '' || s === '—') return false;
  }
  return Boolean(val);
}

const BOOLEAN_KEYS = ['is_unique', 'is_imported', 'is_critical_path', 'ups_required'];

async function main() {
  console.log('🔄 Запуск нормализации булевых полей оборудования...');
  const items = await prisma.equipment.findMany({
    select: { id: true, name: true, customFields: true },
  });

  let updatedCount = 0;
  for (const item of items) {
    if (!item.customFields || typeof item.customFields !== 'object') continue;
    const custom = { ...item.customFields };
    let changed = false;

    for (const key of BOOLEAN_KEYS) {
      if (key in custom && typeof custom[key] !== 'boolean') {
        const normalized = isTruthyBoolean(custom[key]);
        if (custom[key] !== normalized) {
          custom[key] = normalized;
          changed = true;
        }
      }
    }

    if (changed) {
      await prisma.equipment.update({
        where: { id: item.id },
        data: { customFields: custom },
      });
      updatedCount++;
    }
  }

  console.log(`✅ Обработано единиц оборудования: ${items.length}`);
  console.log(`✨ Нормализовано записей с некорректными булевыми значениями: ${updatedCount}`);
}

main()
  .catch((err) => {
    console.error('❌ Ошибка нормализации:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

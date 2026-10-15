-- Идемпотентное добавление права eps.equipment.batch_edit в каталог прав
INSERT INTO "Permission" ("id", "code", "displayName", "module", "description")
SELECT gen_random_uuid()::text, 'eps.equipment.batch_edit', 'Массовое редактирование оборудования', 'eps', 'Пакетное изменение параметров, поиск одинаковых значений и массовая замена в реестре оборудования'
WHERE NOT EXISTS (
  SELECT 1 FROM "Permission" WHERE "code" = 'eps.equipment.batch_edit'
);

-- Назначение права ролям admin и engineer
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" IN ('admin', 'engineer')
  AND p."code" = 'eps.equipment.batch_edit'
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

-- Идемпотентное добавление права eps.database.purge в каталог прав
INSERT INTO "Permission" ("id", "code", "displayName", "module", "description")
SELECT gen_random_uuid()::text, 'eps.database.purge', 'Очистка базы данных оборудования', 'eps', 'Полное безвозвратное удаление всех позиций оборудования, связанных документов и паспортов из модуля EPS'
WHERE NOT EXISTS (
  SELECT 1 FROM "Permission" WHERE "code" = 'eps.database.purge'
);

-- Назначение права роли admin по умолчанию
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" IN ('admin', 'administrator')
  AND p."code" = 'eps.database.purge'
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

-- Подсветка обязательных позиций технических разделов паспорта оборудования
UPDATE "CustomFieldDefinition"
SET "isRequired" = true
WHERE "key" IN (
  'criticality',
  'maintenance_periodicity',
  'responsible_person_name',
  'equipment_group',
  'equipment_type'
);

-- Фиксация флага первичной инициализации разделов, чтобы удаленные пользователем разделы не воссоздавались автоматически
INSERT INTO "SystemSetting" ("id", "key", "value", "description")
SELECT gen_random_uuid()::text, 'eps_custom_sections_bootstrapped', 'true', 'EPS custom sections initial bootstrap completed'
WHERE NOT EXISTS (
  SELECT 1 FROM "SystemSetting" WHERE "key" = 'eps_custom_sections_bootstrapped'
);

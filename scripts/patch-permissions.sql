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

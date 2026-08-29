import { PrismaClient } from '@prisma/client';
import { seedPermissionsAndRoles } from './seed-data/permissions-roles';
import { seedUsers } from './seed-data/users';
import { seedDomainData } from './seed-data/domain-data';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем сидирование базы данных EMS...');

  // 1. Создание прав и ролей
  const roles = await seedPermissionsAndRoles(prisma);
  console.log('✅ Роли и права настроены');

  // 2. Создание пользователей
  const users = await seedUsers(prisma, roles);
  console.log('✅ Пользователи созданы');

  // 3. Создание справочников, классификаторов, оборудования и складских остатков
  await seedDomainData(prisma, users);
  console.log('✅ Доменные данные и справочники созданы');

  console.log('✅ Сидирование базы данных успешно завершено!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка сидирования:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

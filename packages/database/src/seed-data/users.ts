import { PrismaClient, Role } from '@prisma/client';
import * as crypto from 'crypto';

export function hashPassword(password: string, iterations = 210_000): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

export async function seedUsers(
  prisma: PrismaClient,
  roles: {
    adminRole: Role;
    guestRole: Role;
    engineerRole: Role;
    warehouseRole: Role;
  }
) {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || crypto.randomUUID().slice(0, 12);
  const engineerPassword = process.env.SEED_ENGINEER_PASSWORD || crypto.randomUUID().slice(0, 12);
  const keeperPassword = process.env.SEED_KEEPER_PASSWORD || crypto.randomUUID().slice(0, 12);

  console.log('--- СГЕНЕРИРОВАННЫЕ ПАРОЛИ ---');
  console.log(`Admin: ${adminPassword}`);
  console.log(`Engineer: ${engineerPassword}`);
  console.log(`Keeper: ${keeperPassword}`);
  console.log('------------------------------');

  const adminUser = await prisma.user.upsert({
    where: { ldapLogin: 'admin' },
    update: {
      displayName: 'Главный Администратор',
      email: 'admin@ems.local',
      passwordHash: hashPassword(adminPassword),
    },
    create: {
      ldapLogin: 'admin',
      displayName: 'Главный Администратор',
      email: 'admin@ems.local',
      passwordHash: hashPassword(adminPassword),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: roles.adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: roles.adminRole.id },
  });

  const engineerUser = await prisma.user.upsert({
    where: { ldapLogin: 'engineer' },
    update: {
      displayName: 'Иван Петров (Инженер)',
      email: 'petrov@ems.local',
      passwordHash: hashPassword(engineerPassword),
    },
    create: {
      ldapLogin: 'engineer',
      displayName: 'Иван Петров (Инженер)',
      email: 'petrov@ems.local',
      passwordHash: hashPassword(engineerPassword),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: engineerUser.id, roleId: roles.engineerRole.id } },
    update: {},
    create: { userId: engineerUser.id, roleId: roles.engineerRole.id },
  });

  const keeperUser = await prisma.user.upsert({
    where: { ldapLogin: 'keeper' },
    update: {
      displayName: 'Сергей Смирнов (Кладовщик)',
      email: 'smirnov@ems.local',
      passwordHash: hashPassword(keeperPassword),
    },
    create: {
      ldapLogin: 'keeper',
      displayName: 'Сергей Смирнов (Кладовщик)',
      email: 'smirnov@ems.local',
      passwordHash: hashPassword(keeperPassword),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: keeperUser.id, roleId: roles.warehouseRole.id } },
    update: {},
    create: { userId: keeperUser.id, roleId: roles.warehouseRole.id },
  });

  return { adminUser, engineerUser, keeperUser };
}

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string, iterations = 210_000): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

async function main() {
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });

  const admin = await prisma.user.upsert({
    where: { ldapLogin: 'admin' },
    update: {
      passwordHash: hashPassword('admin123'),
      isActive: true,
    },
    create: {
      ldapLogin: 'admin',
      displayName: 'Главный Администратор',
      email: 'admin@ems.local',
      passwordHash: hashPassword('admin123'),
      isActive: true,
    },
  });

  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      update: {},
      create: { userId: admin.id, roleId: adminRole.id },
    });
  }

  console.log('✅ Пароль для пользователя admin успешно установлен: admin123');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string, iterations = 210_000): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

async function main() {
  const newPassword = process.env.ADMIN_PASSWORD || process.argv[2];
  if (!newPassword) {
    console.error('❌ Ошибка: укажите новый пароль через переменную окружения ADMIN_PASSWORD или аргумент командной строки.');
    console.error('   Пример: ADMIN_PASSWORD="your-strong-password" pnpm --filter @ems/database run reset-admin');
    console.error('   Или: pnpm --filter @ems/database run reset-admin "your-strong-password"');
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error('❌ Ошибка: пароль администратора должен быть длиной не менее 8 символов.');
    process.exit(1);
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });

  const admin = await prisma.user.upsert({
    where: { ldapLogin: 'admin' },
    update: {
      passwordHash: hashPassword(newPassword),
      isActive: true,
    },
    create: {
      ldapLogin: 'admin',
      displayName: 'Главный Администратор',
      email: 'admin@ems.local',
      passwordHash: hashPassword(newPassword),
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

  console.log('✅ Пароль для пользователя admin успешно обновлен.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

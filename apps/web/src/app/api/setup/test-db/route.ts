import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, prisma } from '@ems/database';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getCurrentUser, isAdminUser } from '@/lib/auth-guard';
import { resolveInstallState } from '@/lib/install-state';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 1. Rate limiting: max 10 attempts per minute
  const rateLimitError = await enforceRateLimit(req, { limit: 10, windowMs: 60 * 1000, prefix: 'test-db' });
  if (rateLimitError) return rateLimitError;

  // 2. SSRF Protection: If already installed, require admin auth.
  // resolveInstallState() учитывает persistent маркер и администратора в БД
  // и делает fail-closed при недоступности БД.
  const { isInstalled } = await resolveInstallState();

  if (isInstalled) {
    const user = await getCurrentUser(req);
    if (!user || !isAdminUser(user)) {
      return NextResponse.json(
        { success: false, error: 'Диагностика подключения доступна только авторизованному администратору.' },
        { status: 403 }
      );
    }
  }

  let client: PrismaClient | null = null;
  try {
    const body = await req.json();
    let { url, host, port, database, user, password, ssl } = body;

    let connectionUrl = url?.trim();

    if (!connectionUrl) {
      if (!host || !database || !user) {
        return NextResponse.json(
          { success: false, error: 'Укажите хост, базу данных и пользователя' },
          { status: 400 }
        );
      }
      const defaultPort = process.env.DB_PORT || '5432';
      const portStr = port ? `:${port}` : `:${defaultPort}`;
      const authStr = password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}` : encodeURIComponent(user);
      const sslStr = ssl ? '?sslmode=require' : '';
      connectionUrl = `postgresql://${authStr}@${host}${portStr}/${database}${sslStr}`;
    }

    // Try connecting to PostgreSQL using temporary PrismaClient
    client = new PrismaClient({
      datasources: {
        db: {
          url: connectionUrl,
        },
      },
    });

    // Execute simple query
    await client.$queryRaw`SELECT 1 as connected`;

    return NextResponse.json({
      success: true,
      message: 'Подключение к базе данных PostgreSQL успешно установлено!',
      testedUrl: connectionUrl.replace(/:[^:@]+@/, ':****@'), // Hide password in response
    });
  } catch (error: unknown) {
    let errorMessage = error instanceof Error ? error.message : 'Не удалось подключиться к базе данных';
    if (errorMessage.includes('authentication failed')) {
      errorMessage = 'Ошибка аутентификации: неверный пользователь или пароль PostgreSQL';
    } else if (errorMessage.includes('ECONNREFUSED')) {
      errorMessage = 'Связь отклонена: проверьте хост и порт PostgreSQL сервера';
    } else if (errorMessage.includes('database') && errorMessage.includes('does not exist')) {
      errorMessage = 'Указанная база данных не существует на сервере PostgreSQL';
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 400 }
    );
  } finally {
    if (client) {
      await client.$disconnect().catch(() => {});
    }
  }
}

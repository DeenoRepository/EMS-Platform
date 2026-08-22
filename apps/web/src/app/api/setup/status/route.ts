import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '@ems/database';
import { getCurrentUser } from '@/lib/auth-guard';
import '@/lib/env-validate';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const rootDir = process.cwd();
    // Check .installed file in apps/web or root
    const installedFilePath = path.join(rootDir, '.installed');
    const rootInstalledFilePath = path.join(rootDir, '..', '..', '.installed');

    const fileExists = fs.existsSync(installedFilePath) || fs.existsSync(rootInstalledFilePath);

    let hasAdmin = false;
    try {
      const adminCount = await prisma.user.count({
        where: {
          roles: {
            some: {
              role: {
                name: 'admin',
              },
            },
          },
        },
      });
      hasAdmin = adminCount > 0;
    } catch {
      // Database might not be initialized yet
      hasAdmin = false;
    }

    const isInstalled = fileExists || hasAdmin;

    // Check if user is admin
    const currentUser = await getCurrentUser(req);
    const isAdmin = currentUser?.roles.includes('admin') || false;

    // Only provide detailed system info if setup is pending or caller is an admin
    const systemInfo = (!isInstalled || isAdmin)
      ? {
          nodeVersion: process.version,
          platform: `${os.type()} ${os.release()} (${os.arch()})`,
          totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`,
          freeMemory: `${Math.round(os.freemem() / 1024 / 1024 / 1024)} GB`,
          cwd: isAdmin ? rootDir : undefined,
          uptime: `${Math.round(process.uptime())} сек`,
        }
      : undefined;

    return NextResponse.json({
      success: true,
      data: {
        isInstalled,
        systemInfo,
      },
    });
  } catch (error: any) {
    console.error('Error checking setup status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка проверки статуса установки',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

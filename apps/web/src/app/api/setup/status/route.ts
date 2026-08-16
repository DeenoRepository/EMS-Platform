import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '@ems/database';

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

    // Collect system information
    const systemInfo = {
      nodeVersion: process.version,
      platform: `${os.type()} ${os.release()} (${os.arch()})`,
      totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`,
      freeMemory: `${Math.round(os.freemem() / 1024 / 1024 / 1024)} GB`,
      cwd: rootDir,
      uptime: `${Math.round(process.uptime())} сек`,
    };

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

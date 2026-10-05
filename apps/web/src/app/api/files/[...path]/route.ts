import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { UPLOAD_ROOT, resolveUploadPath } from '@/lib/storage';

import { getCurrentUser, unauthorizedResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 1. Проверка аутентификации
    const user = await getCurrentUser(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const relativePath = params.path.join('/');
    const fullPath = resolveUploadPath(relativePath);
    if (!fullPath) {
      return NextResponse.json({ success: false, error: 'Доступ запрещен' }, { status: 403 });
    }

    const resolvedFullPath = path.resolve(fullPath);
    const relativeToRoot = path.relative(UPLOAD_ROOT, resolvedFullPath);
    if (!relativeToRoot || relativeToRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToRoot)) {
      return NextResponse.json({ success: false, error: 'Доступ запрещен' }, { status: 403 });
    }

    if (!hasPermission(user, PERMISSIONS.EPS_DOCUMENTS_VIEW) && !hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW)) {
      return NextResponse.json({ success: false, error: 'Доступ запрещен' }, { status: 403 });
    }

    const [document, photo] = await Promise.all([
      prisma.document.findFirst({ where: { filePath: relativePath, deletedAt: null, equipment: { deletedAt: null } }, select: { id: true } }),
      prisma.photo.findFirst({ where: { filePath: relativePath, equipment: { deletedAt: null } }, select: { id: true } }),
    ]);
    if (!document && !photo) {
      return NextResponse.json({ success: false, error: 'Файл не найден' }, { status: 404 });
    }

    if (!fs.existsSync(resolvedFullPath)) {
      return NextResponse.json({ success: false, error: 'Файл не найден' }, { status: 404 });
    }
    const realRoot = fs.realpathSync(UPLOAD_ROOT);
    const realFile = fs.realpathSync(resolvedFullPath);
    const realRelative = path.relative(realRoot, realFile);
    if (!realRelative || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
      return NextResponse.json({ success: false, error: 'Доступ запрещен' }, { status: 403 });
    }

    const fileStat = fs.statSync(realFile);
    const fileStream = fs.createReadStream(realFile);
    // Convert Node.js readable stream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    const ext = path.extname(realFile).toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.doc') contentType = 'application/msword';
    else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === '.xls') contentType = 'application/vnd.ms-excel';
    else if (ext === '.xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (ext === '.csv') contentType = 'text/csv; charset=utf-8';
    else if (ext === '.txt') contentType = 'text/plain; charset=utf-8';

    const fileName = path.basename(realFile);

    return new NextResponse(webStream as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileStat.size),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
        'Content-Disposition': ext === '.pdf' || ext.match(/^\.(jpg|jpeg|png|webp|gif)$/) 
          ? `inline; filename="${encodeURIComponent(fileName)}"`
          : `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка чтения файла' }, { status: 500 });
  }
}

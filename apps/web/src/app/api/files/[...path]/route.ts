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

    if (!hasPermission(user, PERMISSIONS.EPS_DOCUMENTS_VIEW) && !hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW)) {
      return NextResponse.json({ success: false, error: 'Доступ запрещен' }, { status: 403 });
    }

    const rawPath = params.path.join('/');
    let decodedPath = rawPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {}

    const cleanPath = decodedPath.replace(/^uploads\//, '').replace(/^\/+/, '');
    const fileNameOnly = path.basename(cleanPath);

    // 2. Поиск в БД по filePath, fileName или originalName
    const [document, photo] = await Promise.all([
      prisma.document.findFirst({
        where: {
          OR: [
            { filePath: cleanPath },
            { fileName: cleanPath },
            { fileName: fileNameOnly },
            { originalName: fileNameOnly },
            { filePath: `documents/${fileNameOnly}` },
            { filePath: `documents/${cleanPath}` },
          ],
          deletedAt: null,
        },
        select: {
          id: true,
          filePath: true,
          fileName: true,
          originalName: true,
          fileType: true,
          equipment: { select: { deletedAt: true } },
        },
      }),
      prisma.photo.findFirst({
        where: {
          OR: [
            { filePath: cleanPath },
            { fileName: cleanPath },
            { fileName: fileNameOnly },
            { originalName: fileNameOnly },
            { filePath: `photos/${fileNameOnly}` },
            { filePath: `photos/${cleanPath}` },
          ],
        },
        select: {
          id: true,
          filePath: true,
          fileName: true,
          originalName: true,
          equipment: { select: { deletedAt: true } },
        },
      }),
    ]);

    if (!document && !photo) {
      return NextResponse.json({ success: false, error: 'Файл не найден' }, { status: 404 });
    }

    if (document?.equipment && document.equipment.deletedAt !== null) {
      return NextResponse.json({ success: false, error: 'Оборудование удалено' }, { status: 404 });
    }
    if (photo?.equipment && photo.equipment.deletedAt !== null) {
      return NextResponse.json({ success: false, error: 'Оборудование удалено' }, { status: 404 });
    }

    // 3. Поиск файла на файловой системе
    const candidates = [
      document?.filePath,
      photo?.filePath,
      cleanPath,
      document?.fileName ? path.join('documents', document.fileName) : null,
      photo?.fileName ? path.join('photos', photo.fileName) : null,
      path.join('documents', fileNameOnly),
      path.join('photos', fileNameOnly),
      path.join('feedback', fileNameOnly),
      fileNameOnly,
    ].filter(Boolean) as string[];

    let realFile: string | null = null;
    let realRoot = UPLOAD_ROOT;
    try {
      if (fs.existsSync(UPLOAD_ROOT)) {
        realRoot = fs.realpathSync(UPLOAD_ROOT);
      }
    } catch {}

    for (const cand of candidates) {
      const fullPath = resolveUploadPath(cand);
      if (fullPath && fs.existsSync(fullPath)) {
        const resolvedReal = fs.realpathSync(fullPath);
        const realRelative = path.relative(realRoot, resolvedReal);
        if (realRelative && !realRelative.startsWith(`..${path.sep}`) && !path.isAbsolute(realRelative)) {
          realFile = resolvedReal;
          break;
        }
      }
    }

    if (!realFile) {
      return NextResponse.json({ success: false, error: 'Файл не найден на диске' }, { status: 404 });
    }

    const fileStat = fs.statSync(realFile);
    const fileStream = fs.createReadStream(realFile);
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

    let contentType = document?.fileType || 'application/octet-stream';
    if (!document?.fileType || document.fileType === 'application/octet-stream') {
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
    }

    const downloadName = document?.originalName || photo?.originalName || path.basename(realFile);
    const asciiFallback = downloadName.replace(/[^\x20-\x7E]/g, '_');
    const encodedName = encodeURIComponent(downloadName);
    const isInline = ext === '.pdf' || Boolean(ext.match(/^\.(jpg|jpeg|png|webp|gif)$/));
    const dispositionType = isInline ? 'inline' : 'attachment';

    return new NextResponse(webStream as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileStat.size),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
        'Content-Disposition': `${dispositionType}; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка чтения файла' }, { status: 500 });
  }
}

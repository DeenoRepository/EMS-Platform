import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAbsoluteFilePath } from '@/lib/storage';

import { getCurrentUser, unauthorizedResponse } from '@/lib/auth-guard';

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
    const fullPath = getAbsoluteFilePath(relativePath);

    // 2. Предотвращение Directory Traversal
    const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
    const resolvedFullPath = path.resolve(fullPath);
    if (!resolvedFullPath.startsWith(uploadRoot)) {
      return NextResponse.json({ success: false, error: 'Доступ запрещен' }, { status: 403 });
    }

    if (!fs.existsSync(resolvedFullPath)) {
      return NextResponse.json({ success: false, error: 'Файл не найден' }, { status: 404 });
    }

    const fileStat = fs.statSync(resolvedFullPath);
    const fileStream = fs.createReadStream(resolvedFullPath);
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

    const ext = path.extname(resolvedFullPath).toLowerCase();

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

    const fileName = path.basename(resolvedFullPath);

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

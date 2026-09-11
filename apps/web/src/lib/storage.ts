import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR || process.env.STORAGE_LOCAL_DIR || './uploads');

// Обеспечиваем существование базовых папок
export function ensureUploadDirs() {
  const dirs = [
    UPLOAD_ROOT,
    path.join(UPLOAD_ROOT, 'documents'),
    path.join(UPLOAD_ROOT, 'photos'),
    path.join(UPLOAD_ROOT, 'feedback'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export const ALLOWED_EXTENSIONS = {
  photos: new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']),
  feedback: new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.log', '.txt', '.zip']),
  documents: new Set([
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.csv',
    '.txt',
    '.rtf',
    '.odt',
    '.ods',
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.dwg',
    '.dxf',
  ]),
};

const MAX_FILE_SIZES = {
  photos: 20 * 1024 * 1024, // 20 MB
  feedback: 25 * 1024 * 1024, // 25 MB
  documents: 50 * 1024 * 1024, // 50 MB
};

export async function saveFile(
  file: File,
  subFolder: 'documents' | 'photos' | 'feedback'
): Promise<{ fileName: string; originalName: string; filePath: string; fileSize: number; fileType: string }> {
  ensureUploadDirs();

  const originalName = file.name || 'unnamed';
  const ext = path.extname(originalName).toLowerCase();

  // 1. Проверка белого списка расширений
  const allowed = ALLOWED_EXTENSIONS[subFolder];
  if (!allowed || !allowed.has(ext)) {
    throw new Error(`Недопустимый формат файла "${ext}". Разрешены только: ${Array.from(allowed || []).join(', ')}`);
  }

  // 2. Проверка размера файла
  const maxSize = MAX_FILE_SIZES[subFolder];
  if (file.size > maxSize) {
    throw new Error(`Размер файла превышает допустимый лимит (${Math.round(maxSize / (1024 * 1024))} МБ)`);
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const randomSuffix = crypto.randomBytes(8).toString('hex');
  const sanitizedBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_\u0400-\u04FF-]/g, '_');
  const fileName = `${Date.now()}_${sanitizedBase}_${randomSuffix}${ext}`;
  
  const targetDir = path.join(UPLOAD_ROOT, subFolder);
  const targetPath = path.join(targetDir, fileName);

  fs.writeFileSync(targetPath, buffer);

  return {
    fileName,
    originalName,
    filePath: path.join(subFolder, fileName).replace(/\\/g, '/'),
    fileSize: file.size,
    fileType: file.type || 'application/octet-stream',
  };
}

export function getAbsoluteFilePath(relativeFilePath: string): string {
  return path.join(UPLOAD_ROOT, relativeFilePath);
}

export function deleteFile(relativeFilePath: string): boolean {
  try {
    const fullPath = getAbsoluteFilePath(relativeFilePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Ошибка удаления файла:', e);
    return false;
  }
}

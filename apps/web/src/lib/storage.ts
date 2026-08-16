import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');

// Обеспечиваем существование базовых папок
export function ensureUploadDirs() {
  const dirs = [
    UPLOAD_ROOT,
    path.join(UPLOAD_ROOT, 'documents'),
    path.join(UPLOAD_ROOT, 'photos'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export async function saveFile(
  file: File,
  subFolder: 'documents' | 'photos'
): Promise<{ fileName: string; originalName: string; filePath: string; fileSize: number; fileType: string }> {
  ensureUploadDirs();

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const originalName = file.name;
  const ext = path.extname(originalName).toLowerCase();
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

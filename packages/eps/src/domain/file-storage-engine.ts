export const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.dwg', '.dxf', '.jpg', '.jpeg', '.png',
]);

export const ALLOWED_PHOTO_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp',
]);

export const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_PHOTO_SIZE_BYTES = 15 * 1024 * 1024;    // 15 MB

/**
 * Sanitizes uploaded filename to prevent directory traversal attacks.
 */
export function sanitizeFilename(originalName: string): string {
  const cleanName = originalName.replace(/^.*[\\\/]/, '').replace(/[^a-zA-Z0-9._\-а-яА-Я]/g, '_');
  if (cleanName.includes('..') || cleanName.startsWith('.')) {
    throw new Error('Недопустимое имя файла: обнаружена попытка обхода каталога');
  }
  return cleanName;
}

/**
 * Validates file upload preconditions (extension and size).
 */
export function validateFileUploadPreconditions(
  fileName: string,
  category: 'document' | 'photo',
  fileSizeBytes: number
): boolean {
  const cleanName = sanitizeFilename(fileName);
  const dotIndex = cleanName.lastIndexOf('.');
  if (dotIndex === -1) {
    throw new Error('Файл не имеет расширения');
  }

  const ext = cleanName.slice(dotIndex).toLowerCase();
  const allowedExts = category === 'photo' ? ALLOWED_PHOTO_EXTENSIONS : ALLOWED_DOCUMENT_EXTENSIONS;
  const maxSize = category === 'photo' ? MAX_PHOTO_SIZE_BYTES : MAX_DOCUMENT_SIZE_BYTES;

  if (!allowedExts.has(ext)) {
    throw new Error(`Недопустимое расширение файла "${ext}". Разрешены: ${Array.from(allowedExts).join(', ')}`);
  }

  if (fileSizeBytes > maxSize) {
    throw new Error(`Превышен допустимый размер файла (${Math.round(fileSizeBytes / 1024 / 1024)} MB). Максимум: ${Math.round(maxSize / 1024 / 1024)} MB`);
  }

  return true;
}

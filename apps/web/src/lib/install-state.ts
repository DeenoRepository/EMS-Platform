import fs from 'fs';
import path from 'path';
import { prisma } from '@ems/database';

/**
 * install-state.ts — единый источник истины о том, установлена ли система.
 *
 * От этого значения зависит доступность мастера первоначальной настройки
 * (`/setup`, `/api/setup/*`), который выполняет привилегированные действия:
 * перезапись `.env` (включая `DATABASE_URL` и `JWT_SECRET`) и создание
 * суперадминистратора. Поэтому ошибка в сторону «не установлено» является
 * уязвимостью, а не просто дефектом UX.
 *
 * Два обязательных свойства реализации:
 *
 * 1. **Персистентность.** Маркер пишется в том числе в каталог загрузок,
 *    который в `docker-compose.prod.yml` смонтирован на volume. Маркер
 *    только внутри `process.cwd()` исчезает при пересоздании контейнера.
 * 2. **Fail-closed.** Если факт установки подтвердить не удалось из-за
 *    недоступности БД, система считается установленной и мастер остаётся
 *    заблокированным.
 */

/** Возвращает все пути, по которым может находиться маркер установки. */
export function getInstallMarkerPaths(rootDir: string = process.cwd()): string[] {
  const paths = [
    path.join(rootDir, '.installed'),
    path.join(rootDir, '..', '..', '.installed'),
  ];

  // Каталог загрузок смонтирован на persistent volume, поэтому маркер в нём
  // переживает пересоздание контейнера.
  const persistentDir = process.env.UPLOAD_DIR || process.env.STORAGE_LOCAL_DIR;
  if (persistentDir && persistentDir.trim().length > 0) {
    const resolved = path.isAbsolute(persistentDir)
      ? persistentDir
      : path.join(rootDir, persistentDir);
    paths.push(path.join(resolved, '.installed'));
  }

  return paths;
}

/** true, если маркер установки найден хотя бы в одном из известных мест. */
export function installMarkerExists(rootDir: string = process.cwd()): boolean {
  return getInstallMarkerPaths(rootDir).some((markerPath) => {
    try {
      return fs.existsSync(markerPath);
    } catch {
      return false;
    }
  });
}

/**
 * Записывает маркер установки во все известные места, включая persistent
 * каталог. Возвращает пути, в которые запись действительно удалась.
 */
export function writeInstallMarker(content: string, rootDir: string = process.cwd()): string[] {
  const written: string[] = [];

  for (const markerPath of getInstallMarkerPaths(rootDir)) {
    try {
      const dir = path.dirname(markerPath);
      if (!fs.existsSync(dir)) continue;
      fs.writeFileSync(markerPath, content, 'utf-8');
      written.push(markerPath);
    } catch {
      // Недоступность одного из путей не должна прерывать установку:
      // достаточно, чтобы маркер был записан хотя бы в одно место.
    }
  }

  return written;
}

export interface InstallState {
  /** Установлена ли система (используется для блокировки мастера настройки). */
  isInstalled: boolean;
  /** Удалось ли достоверно определить состояние (false → сработал fail-closed). */
  isDefinitive: boolean;
  /** Найден ли маркер установки на диске. */
  markerExists: boolean;
  /** Существует ли в БД хотя бы один администратор. */
  hasAdmin: boolean;
}

/**
 * Определяет состояние установки.
 *
 * БЕЗОПАСНОСТЬ: при недоступности БД возвращается `isInstalled: true`
 * (fail-closed). Раньше ошибка запроса трактовалась как «администраторов
 * нет», и на свежем контейнере с деградировавшей БД мастер настройки
 * открывался анонимному пользователю.
 */
export async function resolveInstallState(rootDir: string = process.cwd()): Promise<InstallState> {
  const markerExists = installMarkerExists(rootDir);

  let hasAdmin = false;
  let isDefinitive = true;

  try {
    const adminCount = await prisma.user.count({
      where: { roles: { some: { role: { name: 'admin' } } } },
    });
    hasAdmin = adminCount > 0;
  } catch {
    // Состояние БД неизвестно — считаем систему установленной.
    isDefinitive = false;
  }

  return {
    isInstalled: markerExists || hasAdmin || !isDefinitive,
    isDefinitive,
    markerExists,
    hasAdmin,
  };
}

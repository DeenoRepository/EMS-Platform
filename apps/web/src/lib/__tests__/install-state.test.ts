/**
 * Регрессионные тесты состояния установки.
 *
 * Мастер настройки выполняет привилегированные действия (перезапись `.env`
 * с DATABASE_URL/JWT_SECRET, создание суперадминистратора), поэтому ошибка
 * определения «система не установлена» является уязвимостью.
 *
 * Проверяются два свойства:
 *   • fail-closed при недоступности БД;
 *   • персистентность маркера (в том числе в каталоге на volume).
 *
 * Реальное подключение к PostgreSQL не открывается: prisma полностью
 * замокан через mock.module('@ems/database').
 *
 * Requires TSX_TSCONFIG_PATH=apps/web/tsconfig.json (set by test-runner.mjs).
 */
import { test, describe, before, beforeEach, afterEach, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

// ── Управляемый мок prisma ───────────────────────────────────────────────────
let adminCountResult: { ok: true; value: number } | { ok: false; error: Error } = {
  ok: true,
  value: 0,
};

const prismaMock = {
  user: {
    count: async () => {
      if (!adminCountResult.ok) throw adminCountResult.error;
      return adminCountResult.value;
    },
  },
};

mock.module('@ems/database', {
  namedExports: { prisma: prismaMock },
});

type InstallStateModule = typeof import('../install-state');
let installState: InstallStateModule;

let tempBase = '';
let tempRoot = '';
let tempUploads = '';
const originalUploadDir = process.env.UPLOAD_DIR;
const originalStorageDir = process.env.STORAGE_LOCAL_DIR;

describe('Install state (setup wizard exposure)', () => {
  before(async () => {
    installState = await import('../install-state');
  });

  beforeEach(() => {
    // Воспроизводим реальную раскладку монорепозитория: rootDir — это
    // apps/web, поэтому `rootDir/../..` указывает на корень репозитория и
    // остаётся внутри временного каталога. Плоский tempRoot здесь
    // недопустим: `../..` вышел бы за пределы os.tmpdir() и тест писал бы
    // маркер в домашний каталог пользователя.
    tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ems-install-state-'));
    tempRoot = path.join(tempBase, 'apps', 'web');
    tempUploads = path.join(tempRoot, 'uploads');
    fs.mkdirSync(tempUploads, { recursive: true });
    process.env.UPLOAD_DIR = tempUploads;
    delete process.env.STORAGE_LOCAL_DIR;
    adminCountResult = { ok: true, value: 0 };
  });

  afterEach(() => {
    try {
      fs.rmSync(tempBase, { recursive: true, force: true });
    } catch {
      // временный каталог мог быть уже удалён
    }
  });

  after(() => {
    if (originalUploadDir === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = originalUploadDir;
    if (originalStorageDir === undefined) delete process.env.STORAGE_LOCAL_DIR;
    else process.env.STORAGE_LOCAL_DIR = originalStorageDir;
  });

  describe('resolveInstallState', () => {
    test('reports not installed on a clean system with a reachable database', async () => {
      const state = await installState.resolveInstallState(tempRoot);
      assert.equal(state.isInstalled, false);
      assert.equal(state.isDefinitive, true);
      assert.equal(state.markerExists, false);
      assert.equal(state.hasAdmin, false);
    });

    // Регрессия: раньше ошибка запроса трактовалась как «администраторов нет»,
    // и на свежем контейнере с деградировавшей БД мастер настройки
    // открывался анонимному пользователю.
    test('fails closed when the database is unreachable', async () => {
      adminCountResult = { ok: false, error: new Error('connection refused') };

      const state = await installState.resolveInstallState(tempRoot);

      assert.equal(state.isInstalled, true, 'must treat unknown state as installed');
      assert.equal(state.isDefinitive, false);
      assert.equal(state.hasAdmin, false);
    });

    test('reports installed when an admin exists even without a marker file', async () => {
      adminCountResult = { ok: true, value: 1 };
      const state = await installState.resolveInstallState(tempRoot);
      assert.equal(state.isInstalled, true);
      assert.equal(state.isDefinitive, true);
      assert.equal(state.markerExists, false);
    });

    test('reports installed from the marker file alone', async () => {
      fs.writeFileSync(path.join(tempRoot, '.installed'), '{}', 'utf-8');
      const state = await installState.resolveInstallState(tempRoot);
      assert.equal(state.isInstalled, true);
      assert.equal(state.markerExists, true);
    });
  });

  describe('install marker persistence', () => {
    // Регрессия: маркер только в process.cwd() исчезал при пересоздании
    // контейнера, поскольку на volume смонтирован лишь каталог загрузок.
    test('writes the marker into the persistent uploads directory', () => {
      const written = installState.writeInstallMarker('{"installedAt":"now"}', tempRoot);

      const persistentMarker = path.join(tempUploads, '.installed');
      assert.ok(written.includes(persistentMarker), 'marker must be written to the volume-backed dir');
      assert.equal(fs.existsSync(persistentMarker), true);
    });

    test('detects a marker that survives only in the persistent directory', async () => {
      installState.writeInstallMarker('{"installedAt":"now"}', tempRoot);

      // Имитируем пересоздание контейнера: файлы в рабочем каталоге исчезли,
      // volume сохранился.
      const ephemeralMarker = path.join(tempRoot, '.installed');
      if (fs.existsSync(ephemeralMarker)) fs.unlinkSync(ephemeralMarker);

      assert.equal(installState.installMarkerExists(tempRoot), true);

      const state = await installState.resolveInstallState(tempRoot);
      assert.equal(state.isInstalled, true);
    });

    test('getInstallMarkerPaths includes the persistent directory', () => {
      const paths = installState.getInstallMarkerPaths(tempRoot);
      assert.ok(paths.includes(path.join(tempUploads, '.installed')));
      assert.ok(paths.includes(path.join(tempRoot, '.installed')));
    });
  });
});

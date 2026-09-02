/**
 * Тесты создания резервной копии БД (createDatabaseBackup).
 *
 * Дополняет database-backup.test.ts, который покрывает только разбор
 * DATABASE_URL. Здесь проверяется сам сценарий резервного копирования, включая
 * критичное для восстановления свойство: если `pg_dump` недоступен (типовой
 * случай в контейнере без клиента PostgreSQL), сервис обязан не упасть, а
 * перейти на Prisma-fallback и всё равно вернуть распаковываемый архив.
 * Молчаливая потеря этого поведения означает отсутствие бэкапов при живом
 * healthcheck.
 *
 * `pg_dump` не запускается по-настоящему: node:child_process замокан, поэтому
 * тест не зависит от наличия PostgreSQL на машине. Реальное подключение к БД
 * также не открывается — prisma замокан через mock.module('@ems/database').
 *
 * Requires TSX_TSCONFIG_PATH=apps/web/tsconfig.json (set by test-runner.mjs).
 */
import { test, describe, before, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { EventEmitter } from 'node:events';

type SpawnBehavior =
  | { kind: 'success'; stdout: string }
  | { kind: 'exit'; code: number; stderr: string }
  | { kind: 'error'; message: string };

let spawnBehavior: SpawnBehavior = { kind: 'success', stdout: '-- dump\n' };
let lastSpawnArgs: string[] = [];
let lastSpawnEnv: Record<string, string | undefined> = {};

class FakeChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
}

function fakeSpawn(_cmd: string, args: string[], options: { env: Record<string, string> }) {
  lastSpawnArgs = args;
  lastSpawnEnv = options.env;
  const child = new FakeChild();

  setImmediate(() => {
    if (spawnBehavior.kind === 'error') {
      child.emit('error', new Error(spawnBehavior.message));
      return;
    }
    if (spawnBehavior.kind === 'success') {
      child.stdout.emit('data', Buffer.from(spawnBehavior.stdout, 'utf-8'));
      child.emit('close', 0);
      return;
    }
    child.stderr.emit('data', Buffer.from(spawnBehavior.stderr, 'utf-8'));
    child.emit('close', spawnBehavior.code);
  });

  return child;
}

const emptyTable = async () => [];
const prismaMock = {
  user: { findMany: emptyTable },
  role: { findMany: emptyTable },
  permission: { findMany: emptyTable },
  equipment: { findMany: emptyTable },
  nomenclature: { findMany: emptyTable },
  warehouse: { findMany: emptyTable },
  stockItem: { findMany: emptyTable },
  stockTransfer: { findMany: emptyTable },
  jiraIssueCache: { findMany: emptyTable },
  feedbackTicket: { findMany: emptyTable },
  systemSetting: { findMany: emptyTable },
};

const loggerMock = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };

mock.module('node:child_process', { namedExports: { spawn: fakeSpawn } });
mock.module('@ems/database', { namedExports: { prisma: prismaMock } });
mock.module('../logger', { namedExports: { logger: loggerMock } });

type BackupModule = typeof import('../database-backup-service');
let createDatabaseBackup: BackupModule['createDatabaseBackup'];

const originalDatabaseUrl = process.env.DATABASE_URL;

describe('createDatabaseBackup', () => {
  before(async () => {
    ({ createDatabaseBackup } = await import('../database-backup-service'));
  });

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://ems:secret@db-host:5439/ems_db?schema=public';
    spawnBehavior = { kind: 'success', stdout: '-- pg_dump payload\n' };
    lastSpawnArgs = [];
    lastSpawnEnv = {};
  });

  test('возвращает распаковываемый gzip с данными pg_dump', async () => {
    const result = await createDatabaseBackup('full');

    assert.equal(result.method, 'pg_dump');
    assert.equal(result.contentType, 'application/gzip');
    assert.equal(result.sizeBytes, result.buffer.length);
    assert.equal(zlib.gunzipSync(result.buffer).toString('utf-8'), '-- pg_dump payload\n');
  });

  test('передаёт пароль через PGPASSWORD, а не через аргументы командной строки', async () => {
    await createDatabaseBackup('full');

    assert.equal(lastSpawnEnv.PGPASSWORD, 'secret');
    assert.ok(
      !lastSpawnArgs.some((arg) => arg.includes('secret')),
      'пароль не должен попадать в argv, откуда его видно в списке процессов',
    );
  });

  test('составляет аргументы подключения из DATABASE_URL', async () => {
    await createDatabaseBackup('full');

    assert.deepEqual(lastSpawnArgs.slice(0, 8), [
      '-h', 'db-host',
      '-p', '5439',
      '-U', 'ems',
      '-d', 'ems_db',
    ]);
  });

  test('различает режимы дампа набором флагов pg_dump', async () => {
    await createDatabaseBackup('data');
    assert.ok(lastSpawnArgs.includes('--data-only'));
    assert.ok(lastSpawnArgs.includes('--inserts'));

    await createDatabaseBackup('schema');
    assert.ok(lastSpawnArgs.includes('--schema-only'));

    await createDatabaseBackup('full');
    assert.ok(lastSpawnArgs.includes('--clean'));
    assert.ok(lastSpawnArgs.includes('--if-exists'));
  });

  test('включает режим в имя файла', async () => {
    const result = await createDatabaseBackup('schema');

    assert.match(result.filename, /^ems_db_schema_.*\.sql\.gz$/);
  });

  test('переключается на Prisma fallback, когда pg_dump не установлен', async () => {
    spawnBehavior = { kind: 'error', message: 'spawn pg_dump ENOENT' };

    const result = await createDatabaseBackup('full');

    assert.equal(result.method, 'prisma_fallback');
    const text = zlib.gunzipSync(result.buffer).toString('utf-8');
    assert.match(text, /EXPORTED_JSON_PAYLOAD_START/);
    assert.match(text, /COMMIT;/);
  });

  test('переключается на fallback, когда pg_dump завершился с ошибкой', async () => {
    spawnBehavior = { kind: 'exit', code: 1, stderr: 'authentication failed' };

    const result = await createDatabaseBackup('data');

    assert.equal(result.method, 'prisma_fallback');
    const payload = zlib.gunzipSync(result.buffer).toString('utf-8');
    assert.match(payload, /"mode": "data"/, 'режим должен сохраняться в метаданных дампа');
  });

  test('сообщает об отсутствии DATABASE_URL вместо создания пустого архива', async () => {
    delete process.env.DATABASE_URL;

    await assert.rejects(() => createDatabaseBackup('full'), /DATABASE_URL/);

    process.env.DATABASE_URL = originalDatabaseUrl;
  });
});

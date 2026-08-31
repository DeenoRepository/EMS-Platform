/**
 * Regression tests for scripts/backup.sh's fail-closed behavior — see
 * plans/done/2026-08/L3-backup-scheduling-and-restore.md.
 *
 * These tests actually execute the real script (not a copy or a mock of it)
 * against a mocked `pg_dumpall`/`docker` in a temporary working directory, to
 * verify the exit code and side effects, not just the source text.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repositoryRoot = path.resolve(process.cwd());
const backupScriptPath = path.join(repositoryRoot, 'scripts', 'backup.sh');

function makeMockBin(dir: string, name: string, script: string): void {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, `#!/bin/bash\n${script}\n`, 'utf8');
  chmodSync(filePath, 0o755);
}

describe('backup.sh fail-closed behavior', () => {
  test('exits non-zero and creates no dump file when the database dump fails', () => {
    const workDir = mkdtempSync(path.join(tmpdir(), 'ems-backup-fail-'));
    const mockBinDir = path.join(workDir, 'mockbin');
    mkdirSync(mockBinDir);

    // `docker ps` reports no matching container, forcing the pg_dumpall fallback.
    makeMockBin(mockBinDir, 'docker', 'if [ "$1" = "ps" ]; then echo ""; exit 0; fi; exit 1');
    // pg_dumpall itself fails, simulating a database that is down.
    makeMockBin(mockBinDir, 'pg_dumpall', 'echo "pg_dumpall: connection failed" >&2; exit 1');

    let exitCode: number | null = null;
    try {
      execFileSync('bash', [backupScriptPath], {
        cwd: workDir,
        env: { ...process.env, PATH: `${mockBinDir}:${process.env.PATH}` },
        stdio: 'pipe',
      });
      exitCode = 0;
    } catch (err: unknown) {
      exitCode = (err as { status?: number }).status ?? 1;
    }

    assert.equal(exitCode, 1, 'backup.sh must exit non-zero when the database dump fails');

    const backupsDir = path.join(workDir, 'backups');
    const filesCreated = existsSync(backupsDir) ? readdirSync(backupsDir) : [];
    assert.deepEqual(filesCreated, [], 'a failed dump must not leave a partial/empty backup file behind');

    rmSync(workDir, { recursive: true, force: true });
  });

  test('exits zero and creates a non-empty dump file when the database dump succeeds', () => {
    const workDir = mkdtempSync(path.join(tmpdir(), 'ems-backup-ok-'));
    const mockBinDir = path.join(workDir, 'mockbin');
    mkdirSync(mockBinDir);

    makeMockBin(mockBinDir, 'docker', 'if [ "$1" = "ps" ]; then echo ""; exit 0; fi; exit 1');
    makeMockBin(mockBinDir, 'pg_dumpall', 'echo "-- fake dump content"');

    const exitCode = (() => {
      try {
        execFileSync('bash', [backupScriptPath], {
          cwd: workDir,
          env: { ...process.env, PATH: `${mockBinDir}:${process.env.PATH}` },
          stdio: 'pipe',
        });
        return 0;
      } catch (err: unknown) {
        return (err as { status?: number }).status ?? 1;
      }
    })();

    assert.equal(exitCode, 0, 'backup.sh must exit zero when the database dump succeeds');

    const backupsDir = path.join(workDir, 'backups');
    const filesCreated = existsSync(backupsDir) ? readdirSync(backupsDir) : [];
    const dumpFiles = filesCreated.filter((f) => f.startsWith('ems_database_') && f.endsWith('.sql.gz'));
    assert.equal(dumpFiles.length, 1, 'a successful dump must produce exactly one ems_database_*.sql.gz file');

    rmSync(workDir, { recursive: true, force: true });
  });
});

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, mock } from 'node:test';
import { prisma } from '@ems/database';
import { getInstallMarkerPaths, installMarkerExists, resolveInstallState, writeInstallMarker } from './install-state';

function removeIfExists(filePath: string): void {
  try {
    unlinkSync(filePath);
  } catch {
    // already absent — nothing to clean up
  }
}

const originalCount = prisma.user.count;
let countImplementation = async () => 0;
prisma.user.count = ((..._args: unknown[]) => countImplementation()) as typeof originalCount;

describe('install state', () => {
  it('resolves marker paths with relative and absolute persistent directories', () => {
    const root = path.join('ems', 'app');
    process.env.UPLOAD_DIR = 'uploads';
    assert.deepEqual(getInstallMarkerPaths(root), [
      path.join(root, '.installed'),
      path.join(root, '..', '..', '.installed'),
      path.join(root, 'uploads', '.installed'),
    ]);

    // Use a platform-appropriate absolute path (path.resolve) rather than a
    // hardcoded 'C:' prefix: 'C:...' is absolute only on Windows, so a fixed
    // literal breaks the assertion on POSIX and vice versa (see N1).
    const absolutePersistentDir = path.resolve(os.tmpdir(), 'ems-persistent-uploads');
    process.env.UPLOAD_DIR = absolutePersistentDir;
    assert.equal(getInstallMarkerPaths(root).at(-1), path.join(absolutePersistentDir, '.installed'));
    delete process.env.UPLOAD_DIR;
  });

  it('writes and detects markers only in existing directories', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ems-install-state-'));
    const persistent = path.join(root, 'persistent');
    mkdirSync(persistent);
    process.env.STORAGE_LOCAL_DIR = 'persistent';

    const written = writeInstallMarker('installed', root);
    assert.ok(written.length >= 1);
    assert.equal(installMarkerExists(root), true);

    delete process.env.STORAGE_LOCAL_DIR;
    // getInstallMarkerPaths() always includes rootDir/../../.installed as a
    // production marker location. Since mkdtempSync places every temp
    // sandbox directly inside os.tmpdir(), that path resolves to a real,
    // writable, PERSISTENT directory shared by all tests in this file (e.g.
    // the tmpdir's parent) — not something rmSync(root) below can clean up.
    // Removing it explicitly prevents this test from leaking a stray
    // `.installed` marker that would make later tests observe
    // markerExists: true for an unrelated, freshly created root.
    for (const markerPath of written) removeIfExists(markerPath);
    rmSync(root, { recursive: true, force: true });
  });

  it('returns definitive state from administrator count when no marker exists', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ems-install-state-'));
    countImplementation = async () => 1;
    const state = await resolveInstallState(root);

    assert.deepEqual(state, {
      isInstalled: true,
      isDefinitive: true,
      markerExists: false,
      hasAdmin: true,
    });
    countImplementation = async () => 0;
    rmSync(root, { recursive: true, force: true });
  });

  it('fails closed when administrator lookup is unavailable', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ems-install-state-'));
    countImplementation = async () => {
      throw new Error('database unavailable');
    };

    const state = await resolveInstallState(root);
    assert.equal(state.isInstalled, true);
    assert.equal(state.isDefinitive, false);
    assert.equal(state.hasAdmin, false);
    countImplementation = async () => 0;
    rmSync(root, { recursive: true, force: true });
  });
});

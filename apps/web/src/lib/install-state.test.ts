import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, mock } from 'node:test';
import { prisma } from '@ems/database';
import { getInstallMarkerPaths, installMarkerExists, resolveInstallState, writeInstallMarker } from './install-state';

const originalCount = prisma.user.count;
let countImplementation = async () => 0;
prisma.user.count = ((..._args: unknown[]) => countImplementation()) as typeof originalCount;

describe('install state', () => {
  it('resolves marker paths with relative and absolute persistent directories', () => {
    const root = path.join('C:', 'ems', 'app');
    process.env.UPLOAD_DIR = 'uploads';
    assert.deepEqual(getInstallMarkerPaths(root), [
      path.join(root, '.installed'),
      path.join(root, '..', '..', '.installed'),
      path.join(root, 'uploads', '.installed'),
    ]);

    process.env.UPLOAD_DIR = path.join('C:', 'persistent', 'uploads');
    assert.equal(getInstallMarkerPaths(root).at(-1), path.join('C:', 'persistent', 'uploads', '.installed'));
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
    rmSync(root, { recursive: true, force: true });
  });

  it('returns definitive state from marker and administrator count', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ems-install-state-'));
    countImplementation = async () => 1;
    const state = await resolveInstallState(root);

    assert.deepEqual(state, {
      isInstalled: true,
      isDefinitive: true,
      markerExists: true,
      hasAdmin: true,
    });
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
    rmSync(root, { recursive: true, force: true });
  });
});

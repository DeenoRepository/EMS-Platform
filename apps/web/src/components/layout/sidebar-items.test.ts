import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAdminItems, getBadgeColors, getMainItems, getOperationalItems, type SidebarCounts } from './sidebar-items';
import { PERMISSIONS } from '@ems/shared';

const emptyCounts: SidebarCounts = {
  repairCount: null,
  pendingApprovalsCount: null,
  rejectedApprovalsCount: null,
  wmsLowStockCount: null,
  wmsPendingTransfersCount: null,
  wmsActiveInventoriesCount: null,
  srmOpenCount: null,
  srmInProgressCount: null,
  mroOverdueCount: null,
  mroPlannedCount: null,
  prmPendingCount: null,
};

test('getMainItems returns the dashboard entry', () => {
  assert.deepEqual(getMainItems().map(({ id, path }) => ({ id, path })), [{ id: 'dashboard', path: '/' }]);
});

test('getOperationalItems exposes module permissions and operational badges', () => {
  const items = getOperationalItems(
    {
      ...emptyCounts,
      repairCount: 2,
      pendingApprovalsCount: 3,
      wmsLowStockCount: 4,
      wmsPendingTransfersCount: 5,
      wmsActiveInventoriesCount: 6,
      srmOpenCount: 7,
      mroOverdueCount: 8,
    },
    {
      system: { enabled: false },
      modules: {
        eps: { enabled: true },
        wms: { enabled: false },
        srm: { enabled: false },
        mro: { enabled: true },
        prm: { enabled: false },
      },
    },
  );

  const byId = Object.fromEntries(items.map((item) => [item.id, item]));
  assert.equal(byId.eps?.badgeText, 'ТО');
  assert.equal(byId.wms?.badgeText, undefined);
  assert.deepEqual(byId.eps?.permissions, [
    PERMISSIONS.EPS_EQUIPMENT_VIEW,
    PERMISSIONS.EPS_EQUIPMENT_CREATE,
    PERMISSIONS.EPS_DOCUMENTS_VIEW,
    PERMISSIONS.EPS_APPROVALS_VIEW,
    PERMISSIONS.EPS_APPROVALS_CREATE,
    PERMISSIONS.EPS_HISTORY_VIEW,
    PERMISSIONS.EPS_REPORTS_VIEW,
  ]);
  assert.equal(byId.wms?.children?.find((child) => child.path === '/wms/stock')?.badge, 4);
  assert.equal(byId.mro?.children?.find((child) => child.path === '/mro')?.badge, 8);
});

test('getAdminItems protects administrative sections with matching permissions', () => {
  const items = getAdminItems();
  assert.equal(items.find((item) => item.id === 'module-settings')?.permission, PERMISSIONS.ADMIN_SETTINGS_MANAGE);
  assert.equal(items.find((item) => item.id === 'audit-log')?.permission, PERMISSIONS.ADMIN_AUDIT_VIEW);
  assert.equal(items.find((item) => item.id === 'admin-feedback')?.permission, PERMISSIONS.ADMIN_FEEDBACK_MANAGE);
});

test('getBadgeColors maps warning, error, and default badge styles', () => {
  assert.equal(getBadgeColors('warning').text, 'warning.main');
  assert.equal(getBadgeColors('error').animation, 'badgePulse 2s infinite');
  assert.equal(getBadgeColors('unknown').text, 'primary.main');
});

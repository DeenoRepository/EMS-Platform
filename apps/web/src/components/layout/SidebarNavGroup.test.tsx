import React from 'react';
import { describe, expect, it, vi } from 'vitest';


import { fireEvent, renderWithProviders, screen } from '../ui/__tests__/test-utils';
import { SidebarNavGroup } from './SidebarNavGroup';
import type { NavItemDef } from './sidebar-items';

function makeItem(overrides: Partial<NavItemDef> = {}): NavItemDef {
  return {
    id: 'wms',
    label: 'Складской учёт ТМЦ (WMS)',
    icon: <span aria-hidden="true">W</span>,
    children: [
      { label: 'Остатки', path: '/wms/stock', permission: 'wms.stock.view' },
      { label: 'Операции', path: '/wms/operations', permission: 'wms.operations.create' },
    ],
    ...overrides,
  };
}

describe('SidebarNavGroup', () => {
  it('hides a group when the current user cannot access the parent item', () => {
    const canAccess = vi.fn(() => false);

    const { container } = renderWithProviders(
      <SidebarNavGroup
        item={makeItem()}
        collapsed={false}
        active={false}
        expanded
        moduleDisabled={false}
        canAccess={canAccess}
        onToggleExpand={vi.fn()}
        onNavigate={vi.fn()}
        onOpenFlyout={vi.fn()}
        currentPath="/wms/stock"
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(canAccess).toHaveBeenCalledTimes(1);
  });

  it('renders only children allowed by RBAC and navigates to an allowed child', () => {
    const canAccess = vi.fn(
      (item?: { permission?: string; permissions?: string[] } | null) =>
        !item || item.permission === undefined || item.permission === 'wms.stock.view',
    );
    const onNavigate = vi.fn();

    renderWithProviders(
      <SidebarNavGroup
        item={makeItem()}
        collapsed={false}
        active
        expanded
        moduleDisabled={false}
        canAccess={canAccess}
        onToggleExpand={vi.fn()}
        onNavigate={onNavigate}
        onOpenFlyout={vi.fn()}
        currentPath="/wms/stock"
      />,
    );

    expect(screen.getByText('Складской учёт ТМЦ (WMS)')).toBeInTheDocument();
    expect(screen.getByText('Остатки')).toBeInTheDocument();
    expect(screen.queryByText('Операции')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Остатки'));
    expect(onNavigate).toHaveBeenCalledWith('/wms/stock');
  });

  it('hides a disabled module even when the user has permission', () => {
    const { container } = renderWithProviders(
      <SidebarNavGroup
        item={makeItem()}
        collapsed={false}
        active={false}
        expanded={false}
        moduleDisabled
        canAccess={() => true}
        onToggleExpand={vi.fn()}
        onNavigate={vi.fn()}
        onOpenFlyout={vi.fn()}
        currentPath="/"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('toggles a visible group instead of navigating when its parent is clicked', () => {
    const onToggleExpand = vi.fn();

    renderWithProviders(
      <SidebarNavGroup
        item={makeItem()}
        collapsed={false}
        active={false}
        expanded={false}
        moduleDisabled={false}
        canAccess={() => true}
        onToggleExpand={onToggleExpand}
        onNavigate={vi.fn()}
        onOpenFlyout={vi.fn()}
        currentPath="/"
      />,
    );

    fireEvent.click(screen.getByText('Складской учёт ТМЦ (WMS)'));
    expect(onToggleExpand).toHaveBeenCalledWith('wms');
  });

  it('opens the flyout for an accessible group in collapsed mode', () => {
    const onOpenFlyout = vi.fn();

    renderWithProviders(
      <SidebarNavGroup
        item={makeItem()}
        collapsed
        active={false}
        expanded={false}
        moduleDisabled={false}
        canAccess={() => true}
        onToggleExpand={vi.fn()}
        onNavigate={vi.fn()}
        onOpenFlyout={onOpenFlyout}
        currentPath="/"
      />,
    );

    fireEvent.click(screen.getByLabelText('Складской учёт ТМЦ (WMS)'));
    expect(onOpenFlyout).toHaveBeenCalledTimes(1);
    expect(onOpenFlyout.mock.calls[0][1]).toMatchObject({ id: 'wms' });
  });
});

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import type { StockRow } from '@/app/wms/stock/page';
import { renderWithProviders } from '@/components/ui/__tests__/test-utils';
import { WmsStockZoneCell } from './WmsStockZoneCell';

const row: StockRow = {
  id: 'stock-1',
  warehouseId: 'warehouse-1',
  warehouseName: 'Main',
  warehouseCode: 'MAIN',
  nomenclatureId: 'nom-1',
  name: 'Bearing',
  article: 'BRG-1',
  unit: 'pcs',
  category: 'Parts',
  quantity: 5,
  minStock: 1,
  isLowStock: false,
  cellCode: null,
  zoneCode: 'A',
  zoneName: 'Zone A',
  compatibleEquipmentCount: 0,
  compatibleEquipment: [],
  updatedAt: '2026-08-31T00:00:00.000Z',
};

describe('WmsStockZoneCell', () => {
  it('shows an assign-cell action and invokes the callback when editable', () => {
    const onOpenLocation = vi.fn();
    renderWithProviders(
      <WmsStockZoneCell row={row} canEdit={true} onOpenLocation={onOpenLocation} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /ячейка/i }));
    expect(onOpenLocation).toHaveBeenCalledWith(row);
  });

  it('shows a non-interactive placeholder for a foreign warehouse', () => {
    renderWithProviders(
      <WmsStockZoneCell row={row} canEdit={false} onOpenLocation={vi.fn()} />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the current zone and cell and opens it only when editable', () => {
    const onOpenLocation = vi.fn();
    const locatedRow: StockRow = { ...row, cellCode: '01' };
    renderWithProviders(
      <WmsStockZoneCell row={locatedRow} canEdit={true} onOpenLocation={onOpenLocation} />,
    );

    fireEvent.click(screen.getByText('A • 01'));
    expect(onOpenLocation).toHaveBeenCalledWith(locatedRow);
  });
});

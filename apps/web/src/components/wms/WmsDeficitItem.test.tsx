import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/components/ui/__tests__/test-utils';
import { WmsDeficitItem, type WmsDeficitItemData } from './WmsDeficitItem';

const item: WmsDeficitItemData = {
  id: 'stock-1',
  name: 'Bearing',
  warehouseCode: 'MAIN',
  quantity: 2,
  minStock: 10,
  unit: 'pcs',
};

describe('WmsDeficitItem', () => {
  it('renders the item name, warehouse code, and quantity ratio', () => {
    renderWithProviders(<WmsDeficitItem item={item} />);
    expect(screen.getByText('Bearing')).toBeInTheDocument();
    expect(screen.getByText('MAIN')).toBeInTheDocument();
    expect(screen.getByText('2/10 pcs')).toBeInTheDocument();
  });

  it('does not throw when minStock is zero', () => {
    renderWithProviders(<WmsDeficitItem item={{ ...item, minStock: 0 }} />);
    expect(screen.getByText('2/0 pcs')).toBeInTheDocument();
  });
});

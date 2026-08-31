import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders, screen } from '@/components/ui/__tests__/test-utils';
import { WarehouseSelect } from './WarehouseSelect';
import type { WarehouseOption } from '@/hooks/useWarehouseAccess';

const warehouses: WarehouseOption[] = [
  { id: 'w1', name: 'Main', code: 'MAIN', responsibleUserId: 'user-1' } as WarehouseOption,
  { id: 'w2', name: 'Secondary', code: 'SEC' } as WarehouseOption,
];

describe('WarehouseSelect', () => {
  it('renders the "all warehouses" option by default', () => {
    renderWithProviders(<WarehouseSelect value="" onChange={vi.fn()} warehouses={warehouses} />);
    expect(screen.getByText('Все склады предприятия')).toBeInTheDocument();
  });

  it('hides the all-warehouses option when showAllOption is false', () => {
    renderWithProviders(<WarehouseSelect value="w1" onChange={vi.fn()} warehouses={warehouses} showAllOption={false} />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    expect(screen.queryByText('Все склады предприятия')).not.toBeInTheDocument();
  });

  it('invokes onChange with the selected warehouse id', () => {
    const onChange = vi.fn();
    renderWithProviders(<WarehouseSelect value="" onChange={onChange} warehouses={warehouses} />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: /Secondary \(SEC\)/ }));
    expect(onChange).toHaveBeenCalledWith('w2');
  });
});

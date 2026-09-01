import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '../ui/__tests__/test-utils';
import { WmsOperationSetupStep } from './WmsOperationSetupStep';

const baseProps = {
  operationType: 'RECEIPT' as const,
  operationTypes: [
    { type: 'RECEIPT' as const, title: 'Приход ТМЦ', description: 'Receipt', icon: <span>R</span>, color: 'success.main', bgcolor: 'success.light' },
    { type: 'TRANSFER' as const, title: 'Перемещение', description: 'Transfer', icon: <span>T</span>, color: 'info.main', bgcolor: 'info.light' },
  ],
  warehouseId: '',
  targetWarehouseId: '',
  recipientName: '',
  equipmentId: '',
  comment: '',
  warehouses: [
    { id: 'wh-1', name: 'Main warehouse', code: 'MAIN' },
    { id: 'wh-2', name: 'Reserve warehouse', code: 'RES' },
  ],
  transferWarehouses: [],
  isAdmin: true,
  currentWarehouse: null,
  userDisplayName: 'Test User',
  equipmentList: [],
  onOperationTypeChange: vi.fn(),
  onWarehouseChange: vi.fn(),
  onTargetWarehouseChange: vi.fn(),
  onRecipientNameChange: vi.fn(),
  onNext: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WmsOperationSetupStep', () => {
  it('renders receipt setup and emits warehouse and comment changes', () => {
    renderWithProviders(<WmsOperationSetupStep {...baseProps} />);

    expect(screen.getByText('Выберите тип складской операции:')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Приход ТМЦ'));
    expect(baseProps.onOperationTypeChange).toHaveBeenCalledWith('RECEIPT');
    fireEvent.click(screen.getByRole('button', { name: /далее/i }));
    expect(baseProps.onNext).toHaveBeenCalledTimes(1);
  });
});

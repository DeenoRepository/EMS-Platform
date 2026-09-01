import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '../ui/__tests__/test-utils';
import { WmsOperationReviewStep } from './WmsOperationReviewStep';

const baseProps = {
  operationType: 'TRANSFER' as const,
  operationSummaryLabel: 'Межскладское перемещение',
  currentWarehouse: { id: 'wh-1', name: 'Main warehouse', code: 'MAIN' },
  targetWarehouseName: 'Reserve warehouse (RES)',
  recipientName: '',
  comment: 'Urgent replenishment',
  lineItems: [{ nomenclatureId: 'nom-1', nomenclatureName: 'Filter', nomenclatureArticle: 'F-1', unit: 'pcs', quantity: 2 }],
  getWarehouseStock: vi.fn(() => 10),
  isSubmitting: false,
  onBack: vi.fn(),
  onSubmit: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe('WmsOperationReviewStep', () => {
  it('renders transfer summary, stock and invokes navigation actions', () => {
    renderWithProviders(<WmsOperationReviewStep {...baseProps} />);
    expect(screen.getByText('Все параметры операции заполнены. Проверьте сводные данные перед проведением в базе данных.')).toBeInTheDocument();
    expect(screen.getByText('Reserve warehouse (RES)')).toBeInTheDocument();
    expect(screen.getByText('Urgent replenishment')).toBeInTheDocument();
    expect(screen.getByText('10 pcs')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /назад/i }));
    fireEvent.click(screen.getByRole('button', { name: /провести операцию/i }));
    expect(baseProps.onBack).toHaveBeenCalledTimes(1);
    expect(baseProps.onSubmit).toHaveBeenCalledTimes(1);
  });
});

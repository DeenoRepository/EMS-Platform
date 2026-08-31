import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/components/ui/__tests__/test-utils';
import { WmsOperationRecipientBadge, type StockOperationSummary } from './WmsOperationRecipientBadge';

function summary(overrides: Partial<StockOperationSummary>): StockOperationSummary {
  return { type: 'RECEIPT', counterparty: null, comment: null, items: [], ...overrides };
}

describe('WmsOperationRecipientBadge', () => {
  it('shows the supplier name for a RECEIPT operation', () => {
    renderWithProviders(<WmsOperationRecipientBadge op={summary({ type: 'RECEIPT', counterparty: 'ACME' })} />);
    expect(screen.getByText('Поставщик: ACME')).toBeInTheDocument();
  });

  it('falls back to a generic label for a RECEIPT without counterparty', () => {
    renderWithProviders(<WmsOperationRecipientBadge op={summary({ type: 'RECEIPT' })} />);
    expect(screen.getByText('Приход ТМЦ на склад')).toBeInTheDocument();
  });

  it('shows the employee counterparty for ISSUE_EMPLOYEE', () => {
    renderWithProviders(<WmsOperationRecipientBadge op={summary({ type: 'ISSUE_EMPLOYEE', counterparty: 'Иванов И.И.' })} />);
    expect(screen.getByText('Иванов И.И.')).toBeInTheDocument();
  });

  it('shows equipment details for a write-off with an equipment item', () => {
    renderWithProviders(
      <WmsOperationRecipientBadge
        op={summary({
          type: 'ISSUE_WRITE_OFF',
          items: [{ id: 'i1', quantity: 1, nomenclature: { id: 'n1', name: 'Part', unit: 'pcs' }, equipment: { id: 'e1', name: 'Pump', inventoryNumber: 'INV-1' } }],
        })}
      />,
    );
    expect(screen.getByText('Оборудование: Pump (INV-1)')).toBeInTheDocument();
  });

  it('shows the transfer recipient warehouse', () => {
    renderWithProviders(<WmsOperationRecipientBadge op={summary({ type: 'TRANSFER', counterparty: 'Warehouse B' })} />);
    expect(screen.getByText('Склад-получатель: Warehouse B')).toBeInTheDocument();
  });

  it('falls back to a dash for an unrecognized operation type', () => {
    renderWithProviders(<WmsOperationRecipientBadge op={summary({ type: 'UNKNOWN' })} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen } from './test-utils';
import { CurrencyDisplay } from '../CurrencyDisplay';
import { ExportButton } from '../ExportButton';
import { PageLoading, TableSkeleton } from '../PageLoading';
import { ApprovalStepper } from '../ApprovalStepper';


describe('CurrencyDisplay', () => {
  it('renders an em dash for invalid amounts and formats currencies and signs', () => {
    const { rerender } = renderWithProviders(<CurrencyDisplay amount={null} currency="RUB" />);
    expect(screen.getByText('—')).toBeInTheDocument();

    rerender(<CurrencyDisplay amount={1250} currency="RUB" showSign fractionDigits={2} />);
    expect(screen.getByText(/\+1\s?250,00\s?₽/)).toBeInTheDocument();

    rerender(<CurrencyDisplay amount={-12} currency="USD" colorSemantic />);
    expect(screen.getByText(/-12\s?\$/)).toBeInTheDocument();

    rerender(<CurrencyDisplay amount={2500000} currency="EUR" compact />);
    expect(screen.getByText(/2,5\s?млн\s?€/)).toBeInTheDocument();
  });
});

describe('ExportButton', () => {
  it('calls the selected format directly when one format is available', () => {
    const onExport = vi.fn();
    renderWithProviders(<ExportButton formats={['csv']} onExport={onExport} label="Download" />);
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(onExport).toHaveBeenCalledWith('csv');
  });

  it('opens the format menu and invokes export after selection', () => {
    const onExport = vi.fn();
    renderWithProviders(<ExportButton formats={['xlsx', 'json']} onExport={onExport} />);
    fireEvent.click(screen.getByRole('button', { name: /Экспорт/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: /JSON \(\.json\)/i }));
    expect(onExport).toHaveBeenCalledWith('json');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('disables export while loading', () => {
    renderWithProviders(<ExportButton formats={['csv']} onExport={vi.fn()} loading />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('PageLoading and TableSkeleton', () => {
  it('exposes loading text through status semantics and supports empty text', () => {
    const { rerender } = renderWithProviders(<PageLoading text="Loading equipment" size={24} />);
    expect(screen.getByRole('status', { name: 'Loading equipment' })).toBeInTheDocument();
    expect(screen.getByText('Loading equipment')).toBeInTheDocument();

    rerender(<PageLoading text="" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the requested skeleton rows and columns', () => {
    renderWithProviders(<TableSkeleton columns={3} rows={2} withHeader withPagination={false} />);
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getAllByRole('cell')).toHaveLength(6);
  });
});

describe('ApprovalStepper', () => {
  it('renders step labels, statuses, responsible users, dates, and comments', () => {
    renderWithProviders(
      <ApprovalStepper steps={[
        { id: 'draft', label: 'Draft', status: 'DRAFT' },
        { id: 'review', label: 'Review', subtitle: 'Manager review', status: 'IN_PROGRESS', user: 'Manager', date: '2026-01-15T10:00:00.000Z', comment: 'Approved' },
        { id: 'approved', label: 'Approved', status: 'APPROVED' },
      ]} />,
    );

    expect(screen.getByText('Маршрут и статус согласования')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Manager review')).toBeInTheDocument();
    expect(screen.getByText('Manager', { exact: true })).toBeInTheDocument();
    expect(screen.getAllByText('Одобрено').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/«Approved»/).length).toBeGreaterThan(0);
  });

  it('supports horizontal and non-paper variants with an empty list', () => {
    const { rerender } = renderWithProviders(<ApprovalStepper steps={[]} paper={false} title="" orientation="horizontal" />);
    expect(screen.queryByText('Маршрут и статус согласования')).not.toBeInTheDocument();
    rerender(<ApprovalStepper steps={[{ label: 'Rejected', status: 'REJECTED' }]} orientation="horizontal" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });
});

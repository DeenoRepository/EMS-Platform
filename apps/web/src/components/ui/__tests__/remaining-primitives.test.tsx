import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, renderWithProviders, screen } from './test-utils';
import { DatePickerField, DateRangePicker } from '../DatePickerField';
import { CommandPalette } from '../CommandPalette';
import { DocumentPreviewDialog } from '../DocumentPreviewDialog';
import { ServiceUnavailableCard } from '../InfrastructureHealthBanner';
import { ConfirmProvider, useConfirm } from '../ConfirmProvider';

const routerPush = vi.fn();
const print = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}));

function ConfirmationTrigger() {
  const confirm = useConfirm();

  return (
    <button
      type="button"
      onClick={() => {
        void confirm({
          title: 'Delete equipment',
          message: 'This action cannot be undone.',
          confirmText: 'Delete',
          cancelText: 'Keep',
        });
      }}
    >
      Ask confirmation
    </button>
  );
}

beforeEach(() => {
  routerPush.mockReset();
  print.mockReset();
  vi.stubGlobal('print', print);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DatePickerField', () => {
  it('renders constraints, reports date changes, and clears a selected date', () => {
    const onChange = vi.fn();
    const { rerender } = renderWithProviders(
      <DatePickerField
        label="Start date"
        value="2026-01-15"
        minDate="2026-01-01"
        maxDate="2026-12-31"
        error="Invalid date"
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText('Start date');
    expect(input).toHaveValue('2026-01-15');
    expect(input).toHaveAttribute('min', '2026-01-01');
    expect(input).toHaveAttribute('max', '2026-12-31');
    expect(screen.getByText('Invalid date')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '2026-02-01' } });
    expect(onChange).toHaveBeenLastCalledWith('2026-02-01');
    fireEvent.click(screen.getByRole('button', { name: 'Очистить дату' }));
    expect(onChange).toHaveBeenLastCalledWith(null);

    rerender(<DatePickerField label="Disabled date" value="2026-01-15" onChange={onChange} disabled />);
    expect(screen.getByLabelText('Disabled date')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Очистить дату' })).not.toBeInTheDocument();
  });
});

describe('DateRangePicker', () => {
  it('applies a preset and clears a partially selected range', () => {
    const onChange = vi.fn();
    const value = { startDate: '2026-01-01', endDate: null };
    renderWithProviders(<DateRangePicker label="Period" value={value} onChange={onChange} />);

    expect(screen.getByText('Period')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Период' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сегодня' }));
    expect(onChange).toHaveBeenCalledWith({
      startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      endDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Сбросить период' }));
    expect(onChange).toHaveBeenLastCalledWith({ startDate: null, endDate: null });
  });
});

describe('CommandPalette', () => {
  it('filters commands and navigates through the selected command', () => {
    const onClose = vi.fn();
    renderWithProviders(<CommandPalette open onClose={onClose} />);

    const input = screen.getByPlaceholderText('Поиск по разделам, паспортам, ТМЦ и регламентам...');
    fireEvent.change(input, { target: { value: 'склад' } });
    expect(screen.getByText('Панель материальных потоков и остатков')).toBeInTheDocument();
    expect(screen.queryByText('Реестр оборудования')).not.toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(routerPush).toHaveBeenCalledWith('/wms');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders empty search results and closes on Escape', () => {
    const onClose = vi.fn();
    renderWithProviders(<CommandPalette open onClose={onClose} />);
    const input = screen.getByPlaceholderText('Поиск по разделам, паспортам, ТМЦ и регламентам...');

    fireEvent.change(input, { target: { value: 'no-such-command' } });
    expect(screen.getByText(/ничего не найдено/)).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('DocumentPreviewDialog', () => {
  it('renders image controls, changes zoom and rotation, and calls print and close', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <DocumentPreviewDialog
        open
        title="Equipment manual"
        subtitle="Maintenance guide"
        fileType="image"
        fileUrl="/manual.png"
        downloadName="manual.png"
        onPrint={print}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByAltText('Equipment manual')).toHaveAttribute('src', '/manual.png');
    expect(screen.getByRole('button', { name: 'Сбросить масштаб' })).toHaveTextContent('100%');

    fireEvent.click(screen.getByRole('button', { name: 'Увеличить (+)' }));
    expect(screen.getByRole('button', { name: 'Сбросить масштаб' })).toHaveTextContent('125%');
    fireEvent.click(screen.getByRole('button', { name: 'Повернуть на 90°' }));
    fireEvent.click(screen.getByRole('button', { name: 'Распечатать' }));
    expect(print).toHaveBeenCalledTimes(1);
    const dialogTitle = screen.getByRole('heading', { name: /Equipment manual Maintenance guide 125%/i });
    expect(dialogTitle).toBeInTheDocument();
    const allButtons = screen.getByRole('dialog').querySelectorAll('button');
    fireEvent.click(allButtons[allButtons.length - 1] as HTMLButtonElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders QR and unavailable preview branches', () => {
    const { rerender } = renderWithProviders(
      <DocumentPreviewDialog open title="Asset QR" fileType="qr" qrValue="EQ-42" onClose={vi.fn()} />,
    );
    expect(screen.getByText('EQ-42')).toBeInTheDocument();

    rerender(<DocumentPreviewDialog open title="Archive" fileType="other" fileUrl="/archive.bin" onClose={vi.fn()} />);
    expect(screen.getByText('Предпросмотр недоступен')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Скачать файл' })).toHaveLength(2);
  });
});

describe('ConfirmProvider', () => {
  it('renders the shared confirmation dialog and accepts a cancel action', () => {
    renderWithProviders(
      <ConfirmProvider>
        <ConfirmationTrigger />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ask confirmation' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(screen.getByText('Delete equipment')).toBeInTheDocument();
  });
});

describe('ServiceUnavailableCard', () => {
  it('renders service guidance and handles refresh and loading states', () => {
    const onRefresh = vi.fn();
    const { rerender } = renderWithProviders(<ServiceUnavailableCard onRefresh={onRefresh} />);

    expect(screen.getByText('Технические работы')).toBeInTheDocument();
    const refreshButton = screen.getByRole('button', { name: 'Проверить доступность сервиса' });
    fireEvent.click(refreshButton);
    expect(onRefresh).toHaveBeenCalledTimes(1);

    rerender(<ServiceUnavailableCard onRefresh={onRefresh} loading />);
    expect(screen.getByRole('button', { name: 'Проверка подключения...' })).toBeDisabled();
  });
});

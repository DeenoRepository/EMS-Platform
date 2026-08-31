import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from './test-utils';
import { ColumnSelector, type TableColumnOption } from '../DataTableColumnSelector';

const columns: TableColumnOption[] = [
  { id: 'name', label: 'Наименование' },
  { id: 'status', label: 'Статус' },
];

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: /настройка видимости колонок/i }));
}

describe('ColumnSelector', () => {
  it('shows the count of hidden columns in the trigger label', () => {
    renderWithProviders(
      <ColumnSelector columns={columns} visibleColumns={['name']} onToggle={vi.fn()} onSelectAll={vi.fn()} onReset={vi.fn()} />,
    );
    expect(screen.getByText(/Колонки \(1\/2\)/)).toBeInTheDocument();
  });

  it('opens the menu and toggles a column on click', () => {
    const onToggle = vi.fn();
    renderWithProviders(
      <ColumnSelector columns={columns} visibleColumns={['name']} onToggle={onToggle} onSelectAll={vi.fn()} onReset={vi.fn()} />,
    );
    openMenu();
    fireEvent.click(screen.getByText('Статус'));
    expect(onToggle).toHaveBeenCalledWith('status');
  });

  it('invokes onReset and onSelectAll from the menu actions', () => {
    const onReset = vi.fn();
    const onSelectAll = vi.fn();
    renderWithProviders(
      <ColumnSelector columns={columns} visibleColumns={columns.map((c) => c.id)} onToggle={vi.fn()} onSelectAll={onSelectAll} onReset={onReset} />,
    );
    openMenu();
    fireEvent.click(screen.getByText('Сброс'));
    expect(onReset).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Показать все'));
    expect(onSelectAll).toHaveBeenCalledTimes(1);
  });
});

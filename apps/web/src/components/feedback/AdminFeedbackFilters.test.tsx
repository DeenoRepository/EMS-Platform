import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/components/ui/__tests__/test-utils';
import { AdminFeedbackFilters } from './AdminFeedbackFilters';

function renderFilters(overrides: Partial<Parameters<typeof AdminFeedbackFilters>[0]> = {}) {
  const props = {
    activeFilterCount: 2,
    searchQuery: '',
    filterType: 'ALL',
    filterModule: 'ALL',
    filterStatus: 'ALL',
    filterPriority: 'ALL',
    onReset: vi.fn(),
    onSearchChange: vi.fn(),
    onTypeChange: vi.fn(),
    onModuleChange: vi.fn(),
    onStatusChange: vi.fn(),
    onPriorityChange: vi.fn(),
    ...overrides,
  };
  renderWithProviders(<AdminFeedbackFilters {...props} />);
  return props;
}

describe('AdminFeedbackFilters', () => {
  it('renders search and all domain filter controls', () => {
    renderFilters();

    expect(screen.getByPlaceholderText('Поиск по номеру, теме, автору...')).toBeInTheDocument();
    expect(screen.getByLabelText('Тип')).toBeInTheDocument();
    expect(screen.getByLabelText('Модуль')).toBeInTheDocument();
    expect(screen.getByLabelText('Статус')).toBeInTheDocument();
    expect(screen.getByLabelText('Приоритет')).toBeInTheDocument();
  });

  it('forwards type filter changes', () => {
    const props = renderFilters();

    fireEvent.mouseDown(screen.getByLabelText('Тип'));
    fireEvent.click(screen.getByRole('option', { name: 'Неисправность / Ошибка' }));
    expect(props.onTypeChange).toHaveBeenCalledWith('BUG');
  });

  it('invokes reset when active filters are present', () => {
    const props = renderFilters();

    fireEvent.click(screen.getByRole('button', { name: /сброс/i }));
    expect(props.onReset).toHaveBeenCalledTimes(1);
  });
});

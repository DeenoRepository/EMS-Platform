/**
 * EmptyState + SearchInput component tests.
 * SearchInput is debounced — fake timers are used so onSearch fires synchronously.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { renderWithProviders, screen, fireEvent } from './test-utils';
import { EmptyState } from '../EmptyState';
import { SearchInput } from '../SearchInput';

// ─── EmptyState ─────────────────────────────────────────────────────────────
describe('EmptyState', () => {
  it('renders the title', () => {
    renderWithProviders(<EmptyState title="Нет данных" />);
    expect(screen.getByText('Нет данных')).toBeInTheDocument();
  });

  it('renders a description when provided', () => {
    renderWithProviders(
      <EmptyState title="Нет данных" description="Добавьте первую запись" />
    );
    expect(screen.getByText('Добавьте первую запись')).toBeInTheDocument();
  });

  it('renders an action button when actionText and onAction are provided', () => {
    const onAction = vi.fn();
    renderWithProviders(
      <EmptyState title="Нет данных" actionText="Добавить" onAction={onAction} />
    );
    const btn = screen.getByRole('button', { name: 'Добавить' });
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render an action button when actionText is absent', () => {
    renderWithProviders(<EmptyState title="Нет данных" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not render an action button when onAction is absent', () => {
    renderWithProviders(<EmptyState title="Нет данных" actionText="Добавить" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

// ─── SearchInput ─────────────────────────────────────────────────────────────
describe('SearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with a placeholder', () => {
    renderWithProviders(
      <SearchInput onSearch={vi.fn()} placeholder="Поиск..." />
    );
    expect(screen.getByPlaceholderText('Поиск...')).toBeInTheDocument();
  });

  it('calls onSearch with the typed value after debounce', async () => {
    const onSearch = vi.fn();
    renderWithProviders(
      <SearchInput onSearch={onSearch} placeholder="Поиск..." delay={100} />
    );
    const input = screen.getByPlaceholderText('Поиск...');
    fireEvent.change(input, { target: { value: 'насос' } });
    // onSearch should NOT be called yet (debounce still pending)
    expect(onSearch).not.toHaveBeenCalled();
    // advance timers past the debounce delay
    await act(async () => {
      vi.advanceTimersByTime(150);
    });
    expect(onSearch).toHaveBeenCalledWith('насос');
  });

  it('displays the typed value immediately (internal state)', () => {
    renderWithProviders(
      <SearchInput onSearch={vi.fn()} />
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'фильтр' } });
    expect(input.value).toBe('фильтр');
  });

  it('initialises with the controlled value prop', () => {
    renderWithProviders(
      <SearchInput value="начальное" onSearch={vi.fn()} />
    );
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('начальное');
  });
});

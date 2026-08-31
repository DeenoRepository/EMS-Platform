/**
 * ConfirmDialog.test.tsx — component tests for @/components/ui/ConfirmDialog
 *
 * Covers: renders when open, hidden when closed, title/message visible,
 * onConfirm called on confirm click, onClose called on cancel click,
 * confirmWord guard (confirm button disabled until word matches),
 * loading state disables confirm button.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from './test-utils';
import { ConfirmDialog } from '../ConfirmDialog';

const baseProps = {
  open: true,
  title: 'Удалить запись?',
  message: 'Это действие необратимо.',
  onConfirm: vi.fn(),
  onClose: vi.fn(),
};

describe('ConfirmDialog', () => {
  it('renders title and message when open=true', () => {
    renderWithProviders(<ConfirmDialog {...baseProps} />);
    expect(screen.getByText('Удалить запись?')).toBeInTheDocument();
    expect(screen.getByText('Это действие необратимо.')).toBeInTheDocument();
  });

  it('is not visible when open=false', () => {
    renderWithProviders(<ConfirmDialog {...baseProps} open={false} />);
    expect(screen.queryByText('Удалить запись?')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    renderWithProviders(<ConfirmDialog {...baseProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: /подтвердить/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    renderWithProviders(<ConfirmDialog {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /отмена/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses custom confirmText and cancelText labels', () => {
    renderWithProviders(
      <ConfirmDialog {...baseProps} confirmText="Да, удалить" cancelText="Нет, назад" />
    );
    expect(screen.getByRole('button', { name: 'Да, удалить' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Нет, назад' })).toBeInTheDocument();
  });

  it('disables confirm button when loading=true', () => {
    renderWithProviders(<ConfirmDialog {...baseProps} loading={true} />);
    // When loading=true the button label changes to "Обработка..." and is disabled
    const btn = screen.getByRole('button', { name: /обработка/i });
    expect(btn).toBeDisabled();
  });

  it('disables confirm button when confirmWord does not match typed input', () => {
    renderWithProviders(
      <ConfirmDialog {...baseProps} confirmWord="УДАЛИТЬ" confirmWordPlaceholder="Введите УДАЛИТЬ" />
    );
    const confirmBtn = screen.getByRole('button', { name: /подтвердить/i });
    // Before typing, button should be disabled
    expect(confirmBtn).toBeDisabled();
  });

  it('enables confirm button once the correct confirmWord is typed', () => {
    renderWithProviders(
      <ConfirmDialog {...baseProps} confirmWord="УДАЛИТЬ" confirmWordPlaceholder="Введите УДАЛИТЬ" />
    );
    const input = screen.getByPlaceholderText('Введите УДАЛИТЬ');
    fireEvent.change(input, { target: { value: 'УДАЛИТЬ' } });
    const confirmBtn = screen.getByRole('button', { name: /подтвердить/i });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('renders subtitle when provided', () => {
    renderWithProviders(<ConfirmDialog {...baseProps} subtitle="Запись будет удалена навсегда" />);
    expect(screen.getByText('Запись будет удалена навсегда')).toBeInTheDocument();
  });

  it('renders all five variants without crashing', () => {
    const variants = ['danger', 'warning', 'primary', 'info', 'success'] as const;
    for (const variant of variants) {
      const { unmount } = renderWithProviders(
        <ConfirmDialog {...baseProps} variant={variant} />
      );
      expect(screen.getByText('Удалить запись?')).toBeInTheDocument();
      unmount();
    }
  });
});

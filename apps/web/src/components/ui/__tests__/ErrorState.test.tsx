import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from './test-utils';
import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  it('renders the default title and description', () => {
    renderWithProviders(<ErrorState />);
    expect(screen.getByText('Произошла непредвиденная ошибка')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders a status code when provided', () => {
    renderWithProviders(<ErrorState statusCode={404} />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('invokes onRetry when the retry button is clicked', () => {
    const onRetry = vi.fn();
    renderWithProviders(<ErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /повторить попытку/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('invokes onGoHome when provided instead of rendering a link', () => {
    const onGoHome = vi.fn();
    renderWithProviders(<ErrorState onGoHome={onGoHome} />);
    fireEvent.click(screen.getByRole('button', { name: /на главную/i }));
    expect(onGoHome).toHaveBeenCalledTimes(1);
  });

  it('toggles the technical details section for an Error instance', () => {
    renderWithProviders(<ErrorState error={new Error('boom')} />);
    const toggle = screen.getByText(/показать технические детали/i);
    fireEvent.click(toggle);
    expect(screen.getByText(/скрыть технические детали/i)).toBeInTheDocument();
    expect(screen.getByText(/boom/)).toBeInTheDocument();
  });

  it('shows a string error message directly', () => {
    renderWithProviders(<ErrorState error="Плохой запрос" />);
    fireEvent.click(screen.getByText(/показать технические детали/i));
    expect(screen.getByText('Плохой запрос')).toBeInTheDocument();
  });
});

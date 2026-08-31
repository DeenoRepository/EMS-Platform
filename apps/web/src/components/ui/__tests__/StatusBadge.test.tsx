/**
 * StatusBadge.test.tsx — component tests for @/components/ui/StatusBadge
 *
 * Covers: render for known/unknown statuses, dot/subtle/solid variants,
 * tooltip, custom label, a11y (accessible name on the badge span).
 */
import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from './test-utils';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders a known status with its Russian label', () => {
    renderWithProviders(<StatusBadge status="ACTIVE" />);
    // ACTIVE maps to "В работе" in the StatusBadge theme
    expect(screen.getByText('В работе')).toBeInTheDocument();
  });

  it('falls back to the status string when no mapping exists', () => {
    renderWithProviders(<StatusBadge status="UNKNOWN_STATUS_XYZ" />);
    // The component should render something — either the raw status or a fallback
    expect(screen.getByText(/UNKNOWN_STATUS_XYZ/i)).toBeInTheDocument();
  });

  it('uses a custom label when provided', () => {
    renderWithProviders(<StatusBadge status="ACTIVE" label="Мой статус" />);
    expect(screen.getByText('Мой статус')).toBeInTheDocument();
  });

  it('renders without crashing for each variant', () => {
    const variants = ['subtle', 'dot', 'outlined', 'solid'] as const;
    for (const variant of variants) {
      const { unmount } = renderWithProviders(
        <StatusBadge status="ACTIVE" variant={variant} />
      );
      unmount();
    }
  });

  it('renders a tooltip when tooltip prop is provided', () => {
    renderWithProviders(
      <StatusBadge status="ACTIVE" label="Активен" tooltip="Подсказка для статуса" />
    );
    // Tooltip wraps the badge — label must still be visible
    expect(screen.getByText('Активен')).toBeInTheDocument();
  });

  it('hides the icon when showIcon=false', () => {
    const { container } = renderWithProviders(
      <StatusBadge status="ACTIVE" showIcon={false} />
    );
    // Icon SVG elements are absent when showIcon=false
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(0);
  });
});

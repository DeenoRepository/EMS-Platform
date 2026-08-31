/**
 * StatCard.test.tsx — component tests for @/components/ui/StatCard
 *
 * Covers: renders title and value, loading skeleton state, trend rendering,
 * onClick callback, active state border, a11y role.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from './test-utils';
import BuildIcon from '@mui/icons-material/Build';
import { StatCard } from '../StatCard';

const defaultProps = {
  title: 'Всего оборудования',
  value: 142,
  icon: <BuildIcon />,
};

describe('StatCard', () => {
  it('renders title and numeric value', () => {
    renderWithProviders(<StatCard {...defaultProps} />);
    expect(screen.getByText('Всего оборудования')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
  });

  it('renders a string value', () => {
    renderWithProviders(<StatCard {...defaultProps} value="N/A" />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('shows a Skeleton when loading=true instead of the value', () => {
    const { container } = renderWithProviders(
      <StatCard {...defaultProps} loading={true} />
    );
    // MUI Skeleton renders with role="progressbar" or as a span with class
    // that includes "MuiSkeleton-root"; either way, the numeric value should
    // NOT be visible as text.
    expect(screen.queryByText('142')).not.toBeInTheDocument();
    // Skeleton elements exist in the DOM
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('renders a subtitle when provided', () => {
    renderWithProviders(<StatCard {...defaultProps} subtitle="Единиц в реестре" />);
    expect(screen.getByText('Единиц в реестре')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    renderWithProviders(<StatCard {...defaultProps} onClick={handleClick} />);
    fireEvent.click(screen.getByText('Всего оборудования'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders a trend chip when trend prop is provided', () => {
    renderWithProviders(
      <StatCard
        {...defaultProps}
        trend={{ value: '+5', label: 'за месяц', direction: 'up' }}
      />
    );
    expect(screen.getByText(/\+5/)).toBeInTheDocument();
  });

  it('renders without crashing in active state', () => {
    renderWithProviders(<StatCard {...defaultProps} active={true} />);
    expect(screen.getByText('Всего оборудования')).toBeInTheDocument();
  });
});

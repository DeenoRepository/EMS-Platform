import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen } from './test-utils';
import { ChartCard } from '../ChartCard';
import { HealthScoreGauge } from '../HealthScoreGauge';
import { TrendSparkline } from '../TrendSparkline';
import { CriticalAlertBanner } from '../CriticalAlertBanner';
import { BulkActionBar } from '../BulkActionBar';
import { DetailDrawer } from '../DetailDrawer';

const routerPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: routerPush }) }));

beforeEach(() => {
  routerPush.mockReset();
});

describe('ChartCard', () => {
  it('renders title, value, trend, actions, and chart content', () => {
    renderWithProviders(
      <ChartCard title="Incidents" subtitle="Last 30 days" value={1234} trend={{ value: 12, direction: 'up', label: '%' }} actions={<button>Filter</button>}>
        <svg aria-label="chart" />
      </ChartCard>,
    );
    expect(screen.getByText('Incidents')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByText(/1\s?234/)).toBeInTheDocument();
    expect(screen.getByText('+12 %')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
    expect(screen.getByLabelText('chart')).toBeInTheDocument();
  });

  it('renders loading and empty states', () => {
    const { rerender } = renderWithProviders(<ChartCard title="Metrics" loading><span>Chart</span></ChartCard>);
    expect(document.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
    rerender(<ChartCard title="Metrics" empty emptyMessage="No chart data"><span>Chart</span></ChartCard>);
    expect(screen.getByText('No chart data')).toBeInTheDocument();
    expect(screen.queryByText('Chart')).not.toBeInTheDocument();
  });
});

describe('HealthScoreGauge', () => {
  it('normalizes score and renders semantic status and breakdown metrics', () => {
    const { rerender } = renderWithProviders(<HealthScoreGauge score={120} title="Asset health" metrics={[{ label: 'Availability', value: '99%', status: 'good' }]} />);
    expect(screen.getByLabelText(/Asset health: 100%/)).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Отличное')).toBeInTheDocument();
    expect(screen.getByText('Availability')).toBeInTheDocument();

    rerender(<HealthScoreGauge score={40} title="Asset health" />);
    expect(screen.getByLabelText(/Критическое/)).toBeInTheDocument();
    expect(screen.getByText('Критическое')).toBeInTheDocument();
  });

  it('supports loading and clickable drilldown states', () => {
    const onClick = vi.fn();
    renderWithProviders(<HealthScoreGauge score={70} loading onClick={onClick} />);
    const gauge = screen.getByRole('button');
    fireEvent.click(gauge);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });
});

describe('TrendSparkline', () => {
  it('renders current value, change direction, period, and SVG paths', () => {
    renderWithProviders(<TrendSparkline data={[1, { value: 4, label: 'Today' }, 2]} title="Output" currentValue={4} unit="шт" changePercent={8} periodLabel="this month" />);
    expect(screen.getByText('Output')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('шт')).toBeInTheDocument();
    expect(screen.getByText(/\+8%/)).toBeInTheDocument();
    expect(screen.getByText('this month')).toBeInTheDocument();
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders loading state and supports negative change', () => {
    const { rerender } = renderWithProviders(<TrendSparkline data={[1, 2]} loading title="Trend" />);
    expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    rerender(<TrendSparkline data={[2, 1]} changePercent={-5} title="Trend" />);
    expect(screen.getByText(/-5%/)).toBeInTheDocument();
  });
});

describe('CriticalAlertBanner', () => {
  const alerts = [
    { id: 'critical-1', severity: 'CRITICAL' as const, title: 'Database down', description: 'Immediate action', count: 2, actionLabel: 'Open health', actionHref: '/health', dismissible: true },
    { id: 'warning-1', severity: 'WARNING' as const, title: 'Low stock', actionLabel: 'Open stock', onAction: vi.fn(), dismissible: true },
  ];

  it('renders alert content and actions, then dismisses an alert', () => {
    const onDismiss = vi.fn();
    renderWithProviders(<CriticalAlertBanner alerts={alerts} onDismiss={onDismiss} />);
    expect(screen.getByText('Database down')).toBeInTheDocument();
    expect(screen.getByText('Immediate action')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open health' })).toHaveAttribute('href', '/health');
    expect(screen.getByRole('button', { name: 'Open stock' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Скрыть предупреждение' })[0]);
    expect(onDismiss).toHaveBeenCalledWith('critical-1');
    expect(screen.queryByText('Database down')).not.toBeInTheDocument();
  });

  it('renders nothing with no alerts', () => {
    const { container } = renderWithProviders(<CriticalAlertBanner alerts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('BulkActionBar', () => {
  it('is hidden without selection and invokes actions and clear selection', () => {
    const onAction = vi.fn();
    const onClear = vi.fn();
    const { rerender } = renderWithProviders(<BulkActionBar selectedCount={0} onClearSelection={onClear} actions={[{ label: 'Archive', onClick: onAction }]} />);
    expect(screen.queryByText(/Выбрано/)).not.toBeInTheDocument();
    rerender(<BulkActionBar selectedCount={3} totalCount={10} onClearSelection={onClear} actions={[{ label: 'Archive', onClick: onAction }, { label: 'Delete', onClick: vi.fn(), disabled: true }]} />);
    expect(screen.getByText('Выбрано:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('из 10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Снять выделение со всех строк' }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });
});

describe('DetailDrawer', () => {
  it('renders an open drawer and closes through the close control', () => {
    const onClose = vi.fn();
    renderWithProviders(<DetailDrawer open title="Equipment details" onClose={onClose}><span>Equipment body</span></DetailDrawer>);
    expect(screen.getByText('Equipment details')).toBeInTheDocument();
    expect(screen.getByText('Equipment body')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Закрыть/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

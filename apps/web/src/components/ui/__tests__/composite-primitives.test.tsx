import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen } from './test-utils';
import { DataTableWrapper } from '../DataTableWrapper';
import { ActivityFeed } from '../ActivityFeed';
import { LifecycleTimeline } from '../LifecycleTimeline';
import { ModuleMaintenanceState } from '../ModuleMaintenanceState';

const routerPush = vi.fn();
const routerReload = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}));

beforeEach(() => {
  routerPush.mockReset();
  routerReload.mockReset();
  vi.stubGlobal('location', { ...window.location, reload: routerReload });
});

describe('DataTableWrapper', () => {
  it('renders title, toolbar, rows, loading state, and selection controls', () => {
    const onClearSelection = vi.fn();
    renderWithProviders(
      <DataTableWrapper
        title="Equipment"
        subtitle="Registry"
        toolbar={<span>Filters</span>}
        loading
        selectedCount={2}
        total={10}
        onClearSelection={onClearSelection}
      >
        <table><tbody><tr><td>Pump A</td></tr></tbody></table>
      </DataTableWrapper>,
    );

    expect(screen.getByText('Equipment')).toBeInTheDocument();
    expect(screen.getByText('Registry')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Pump A')).toBeInTheDocument();
    expect(screen.getByText('Выбрано: 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Снять выделение/i }));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('renders empty and grid branches and invokes pagination/view controls', () => {
    const onPageChange = vi.fn();
    const onViewModeChange = vi.fn();
    const onVisibleColumnsChange = vi.fn();
    renderWithProviders(
      <DataTableWrapper
        empty
        emptyState={<span>No equipment</span>}
        viewMode="grid"
        gridContent={<span>Cards</span>}
        columns={[{ id: 'name', label: 'Name' }, { id: 'status', label: 'Status', defaultVisible: false }]}
        visibleColumns={['name']}
        onVisibleColumnsChange={onVisibleColumnsChange}
        onViewModeChange={onViewModeChange}
        page={0}
        pageSize={10}
        total={25}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText('No equipment')).toBeInTheDocument();
    expect(screen.queryByText('Cards')).not.toBeInTheDocument();
  });
});

describe('ActivityFeed', () => {
  const item = {
    id: 'activity-1',
    author: { name: 'Ivan Petrov', role: 'Engineer' },
    content: 'Pump inspected',
    createdAt: '2026-01-15T10:00:00.000Z',
    type: 'comment' as const,
  };

  it('renders activity items, initials, empty state, and sends trimmed comments', async () => {
    const onAddComment = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderWithProviders(<ActivityFeed items={[item]} onAddComment={onAddComment} />);

    expect(screen.getByText('Ivan Petrov')).toBeInTheDocument();
    expect(screen.getByText('IP')).toBeInTheDocument();
    expect(screen.getByText('Pump inspected')).toBeInTheDocument();
    const input = screen.getByPlaceholderText(/Написать комментарий/i);
    fireEvent.change(input, { target: { value: '  New comment  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(onAddComment).toHaveBeenCalledWith('New comment');

    rerender(<ActivityFeed items={[]} />);
    expect(screen.getByText('Комментариев и записей пока нет')).toBeInTheDocument();
  });

  it('disables sending while submitting and shows loading state', () => {
    renderWithProviders(<ActivityFeed items={[]} onAddComment={vi.fn()} submitting loading />);
    expect(screen.getByRole('button', { name: 'Отправка...' })).toBeDisabled();
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThanOrEqual(2);
  });
});

describe('LifecycleTimeline', () => {
  const event = {
    id: 'event-1', type: 'MAINTENANCE' as const, title: 'Inspection', description: 'Quarterly check',
    date: '2026-01-15T10:00:00.000Z', author: 'Engineer', status: 'COMPLETED',
    metadata: { duration: 4 }, link: { label: 'Open report', href: '/reports/1' },
  };

  it('renders events, maxItems, metadata and expands details', () => {
    renderWithProviders(<LifecycleTimeline events={[event, { ...event, id: 'event-2', title: 'Second' }]} maxItems={1} />);

    expect(screen.getByText('Inspection')).toBeInTheDocument();
    expect(screen.queryByText('Second')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Развернуть детали события' }));
    expect(screen.getByText('Quarterly check')).toBeInTheDocument();
    expect(screen.getByText(/Engineer/)).toBeInTheDocument();
    expect(screen.getByText('Open report')).toBeInTheDocument();
  });

  it('renders empty and loading branches', () => {
    const { rerender } = renderWithProviders(<LifecycleTimeline events={[]} emptyMessage="No events" />);
    expect(screen.getByText('No events')).toBeInTheDocument();
    rerender(<LifecycleTimeline events={[]} loading />);
    expect(document.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });
});

describe('ModuleMaintenanceState', () => {
  it('renders maintenance information and handles dashboard/refresh actions', () => {
    const onRefresh = vi.fn();
    renderWithProviders(
      <ModuleMaintenanceState moduleName="WMS" message="Planned maintenance" estimatedUntil="18:00" onRefresh={onRefresh} />,
    );

    expect(screen.getByRole('heading', { name: /WMS на регламентных работах/i })).toBeInTheDocument();
    expect(screen.getByText('Planned maintenance')).toBeInTheDocument();
    expect(screen.getByText(/18:00/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Проверить статус' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'На Панель управления' }));
    expect(routerPush).toHaveBeenCalledWith('/');
  });

  it('uses the page reload action when no refresh callback is supplied', () => {
    renderWithProviders(<ModuleMaintenanceState moduleName="EPS" />);
    fireEvent.click(screen.getByRole('button', { name: 'Обновить страницу' }));
    expect(window.location.reload).toBeDefined();
  });
});

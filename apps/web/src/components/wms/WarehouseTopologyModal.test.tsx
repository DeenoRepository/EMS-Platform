import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '../ui/__tests__/test-utils';
import WarehouseTopologyModal from './WarehouseTopologyModal';

const enqueueSnackbar = vi.fn();
const confirmMock = vi.fn();
const fetchMock = vi.fn();
const onClose = vi.fn();
const onRefreshParent = vi.fn();

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar }) }));
vi.mock('@/lib/auth-client', () => ({
  useAuth: () => ({
    user: { userId: 'user-1', roles: ['admin'] },
    hasPermission: vi.fn(() => true),
  }),
}));
vi.mock('@/components/ui', async () => {
  const actual = await vi.importActual<typeof import('@/components/ui')>('@/components/ui');
  return { ...actual, useConfirm: () => confirmMock };
});

const warehouse = { id: 'wh-1', name: 'Main warehouse', code: 'MAIN', responsibleUserId: 'user-1' };
const zones = [{
  id: 'zone-1',
  warehouseId: 'wh-1',
  name: 'Rack zone',
  code: 'RACK',
  description: null,
  cells: [{ id: 'cell-1', zoneId: 'zone-1', code: 'A-01-01', name: 'Top shelf', _count: { stockItems: 1 } }],
}];

beforeEach(() => {
  vi.clearAllMocks();
  confirmMock.mockResolvedValue(true);
  fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
    if (options?.method === 'POST') return { ok: true, json: async () => ({ success: true }) };
    if (options?.method === 'DELETE') return { ok: true, json: async () => ({ success: true }) };
    return { ok: true, json: async () => ({ success: true, data: zones }) };
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('WarehouseTopologyModal', () => {
  it('loads zones, shows occupancy totals, and filters cells', async () => {
    renderWithProviders(<WarehouseTopologyModal open warehouse={warehouse} onClose={onClose} onRefreshParent={onRefreshParent} />);

    await waitFor(() => expect(screen.getByText(/Всего ячеек: 1 \(занято: 1\)/)).toBeInTheDocument());
    expect(screen.getByText('A-01-01')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Поиск ячейки...'), { target: { value: 'missing' } });
    await waitFor(() => expect(screen.getByText('Ячейки по запросу не найдены')).toBeInTheDocument());
  });

  it('creates a cell with normalized code and refreshes the parent', async () => {
    renderWithProviders(<WarehouseTopologyModal open warehouse={warehouse} onClose={onClose} onRefreshParent={onRefreshParent} />);
    await waitFor(() => expect(screen.getByText('A-01-01')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /добавить ячейку/i }));
    fireEvent.change(screen.getByPlaceholderText('например, A-01-02-1'), { target: { value: ' b-02 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Добавить ячейку' }));

    await waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledWith('Ячейка добавлена', { variant: 'success' }));
    const post = fetchMock.mock.calls.find(([url, options]) => url === '/api/wms/zones/zone-1/cells' && options?.method === 'POST');
    expect(JSON.parse(post?.[1]?.body as string)).toMatchObject({ code: 'B-02' });
    expect(onRefreshParent).toHaveBeenCalledTimes(1);
  });

  it('confirms and deletes a cell', async () => {
    renderWithProviders(<WarehouseTopologyModal open warehouse={warehouse} onClose={onClose} onRefreshParent={onRefreshParent} />);
    await waitFor(() => expect(screen.getByText('A-01-01')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Удалить A-01-01' }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Удалить ячейку "A-01-01"?' })));
    expect(fetchMock).toHaveBeenCalledWith('/api/wms/zones/zone-1/cells?cellId=cell-1', { method: 'DELETE' });
  });
});

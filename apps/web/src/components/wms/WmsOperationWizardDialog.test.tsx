import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '../ui/__tests__/test-utils';
import WmsOperationWizardDialog from './WmsOperationWizardDialog';

const enqueueSnackbar = vi.fn();
const fetchMock = vi.fn();
const onClose = vi.fn();
const onSuccess = vi.fn();

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar }) }));
vi.mock('@/lib/auth-client', () => ({
  useAuth: () => ({
    user: { userId: 'user-1', displayName: 'Test User', roles: [], permissions: [] },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
    if (options?.method === 'POST') {
      return { ok: true, json: async () => ({ success: true, data: { id: 'operation-1' } }) };
    }
    if (url === '/api/wms/warehouses' || url === '/api/wms/warehouses?forTransfer=true') {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: 'wh-1', name: 'Main warehouse', code: 'MAIN', responsibleUserId: 'user-1' },
            { id: 'wh-2', name: 'Reserve warehouse', code: 'RES', responsibleUserId: 'user-2' },
          ],
        }),
      };
    }
    if (url === '/api/wms/stock?warehouseId=wh-1&pageSize=1000') {
      return { ok: true, json: async () => ({ success: true, data: { items: [{ nomenclatureId: 'nom-1', quantity: 5 }] } }) };
    }
    if (url === '/api/eps/equipment?pageSize=1000') {
      return { ok: true, json: async () => ({ success: true, data: { items: [] } }) };
    }
    if (url === '/api/wms/nomenclature?limit=500') {
      return { ok: true, json: async () => ({ success: true, data: { items: [{ id: 'nom-1', name: 'Filter', article: 'F-1', unit: 'pcs' }] } }) };
    }
    return { ok: true, json: async () => ({ success: true, data: [] }) };
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('WmsOperationWizardDialog', () => {
  it('loads the assigned warehouse and blocks the items step without line items', async () => {
    renderWithProviders(<WmsOperationWizardDialog open onClose={onClose} onSuccess={onSuccess} />);

    await waitFor(() => expect(screen.getByText('Main warehouse (MAIN)')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /далее/i }));
    expect(screen.getByText('Поиск и добавление позиций ТМЦ:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /далее/i })).toBeDisabled();
  });

  it('requires a different target warehouse for transfer operations', async () => {
    renderWithProviders(<WmsOperationWizardDialog open initialType="TRANSFER" onClose={onClose} onSuccess={onSuccess} />);

    await waitFor(() => expect(screen.getByText('Main warehouse (MAIN)')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Межскладское перемещение'));
    const targetSelect = screen.getByRole('combobox', { name: 'Склад-получатель (Зачисление перемещаемых ТМЦ)' });
    fireEvent.mouseDown(targetSelect);
    fireEvent.click(screen.getByRole('option', { name: /Reserve warehouse/ }));
    fireEvent.click(screen.getByRole('button', { name: /далее/i }));

    expect(enqueueSnackbar).not.toHaveBeenCalledWith('Выберите склад-получатель, отличный от закрепленного склада', { variant: 'warning' });
  });

  it('submits a receipt after a line item is added', async () => {
    renderWithProviders(<WmsOperationWizardDialog open onClose={onClose} onSuccess={onSuccess} />);

    await waitFor(() => expect(screen.getByText('Main warehouse (MAIN)')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /далее/i }));
    fireEvent.change(screen.getByLabelText('Поиск номенклатуры...'), { target: { value: 'Filter' } });
    fireEvent.click(screen.getByRole('option', { name: /Filter/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));
    fireEvent.click(screen.getByRole('button', { name: /далее/i }));
    fireEvent.click(screen.getByRole('button', { name: /провести операцию/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('operation-1'));
    const post = fetchMock.mock.calls.find(([url, options]) => url === '/api/wms/operations' && options?.method === 'POST');
    expect(post).toBeDefined();
    expect(JSON.parse(post?.[1]?.body as string)).toMatchObject({
      type: 'RECEIPT',
      warehouseId: 'wh-1',
      items: [{ nomenclatureId: 'nom-1', quantity: 1 }],
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

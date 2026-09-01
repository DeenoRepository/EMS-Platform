import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '../ui/__tests__/test-utils';
import TransferRequestDialog from './TransferRequestDialog';

const enqueueSnackbar = vi.fn();
const fetchMock = vi.fn();
const onSuccess = vi.fn();
const onClose = vi.fn();

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar }) }));
vi.mock('@/lib/auth-client', () => ({
  useAuth: () => ({ user: { userId: 'user-1', displayName: 'Test User' } }),
}));

beforeEach(() => {
  enqueueSnackbar.mockReset();
  fetchMock.mockReset();
  onSuccess.mockReset();
  onClose.mockReset();
  fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
    if (options?.method === 'POST') {
      return { ok: true, json: async () => ({ success: true }) };
    }
    if (url.includes('/warehouses')) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: 'wh-1', name: 'My warehouse', code: 'MY', responsibleUserId: 'user-1' },
            { id: 'wh-2', name: 'Donor warehouse', code: 'DONOR', responsibleUserId: 'user-2' },
          ],
        }),
      };
    }
    if (url.includes('/nomenclature')) {
      return { ok: true, json: async () => ({ success: true, data: { items: [{ id: 'nom-1', name: 'Filter', article: 'F-1', unit: 'pcs' }] } }) };
    }
    return { ok: true, json: async () => ({ success: true, data: { items: [] } }) };
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('TransferRequestDialog', () => {
  it('loads warehouse dictionaries and keeps submission disabled without items', async () => {
    renderWithProviders(<TransferRequestDialog open onClose={onClose} onSuccess={onSuccess} />);
    await waitFor(() => expect(screen.getByText('Запрос на перемещение ТМЦ')).toBeInTheDocument());
    expect(screen.getByText(/My warehouse/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Направить запрос/i })).toBeDisabled();
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '../ui/__tests__/test-utils';
import CreateServiceRequestDialog from './CreateServiceRequestDialog';

const enqueueSnackbar = vi.fn();
const fetchMock = vi.fn();
const onSuccess = vi.fn();
const onClose = vi.fn();

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar }) }));

beforeEach(() => {
  enqueueSnackbar.mockReset();
  fetchMock.mockReset();
  onSuccess.mockReset();
  onClose.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { items: [] } }),
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('CreateServiceRequestDialog', () => {
  it('validates an empty summary and reveals high-severity guidance', async () => {
    renderWithProviders(<CreateServiceRequestDialog open onClose={onClose} onSuccess={onSuccess} />);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Зарегистрировать инцидент' }));
    expect(enqueueSnackbar).toHaveBeenCalledWith('Укажите тему или краткое описание неисправности', { variant: 'warning' });

    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(3);
  });
});

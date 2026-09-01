import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '../ui/__tests__/test-utils';
import ApprovalWizardDialog from './ApprovalWizardDialog';

const enqueueSnackbar = vi.fn();
const fetchMock = vi.fn();

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar }) }));

defaultFetchMocks();

function defaultFetchMocks() {
  fetchMock.mockImplementation(async (url: string) => {
    if (url === '/api/eps/equipment?status=ACTIVE') {
      return { ok: true, json: async () => ({ success: true, data: [{ id: 'eq-1', name: 'Pump', inventoryNumber: 'INV-1' }] }) };
    }
    return { ok: true, json: async () => ({ success: true, data: [] }) };
  });
  vi.stubGlobal('fetch', fetchMock);
}

beforeEach(() => {
  enqueueSnackbar.mockReset();
  fetchMock.mockClear();
});

describe('ApprovalWizardDialog', () => {
  it('blocks the first step without equipment and advances after selection', async () => {
    renderWithProviders(
      <ApprovalWizardDialog open onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByText('Мастер подачи заявки на согласование')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Далее/i })).toBeDisabled();
  });
});

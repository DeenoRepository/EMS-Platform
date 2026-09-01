import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '../ui/__tests__/test-utils';
import { EquipmentWizardForm } from './EquipmentWizardForm';

const enqueueSnackbar = vi.fn();
const fetchMock = vi.fn();
const onSuccess = vi.fn();
const onCancel = vi.fn();

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar }) }));

beforeEach(() => {
  enqueueSnackbar.mockReset();
  fetchMock.mockReset();
  onSuccess.mockReset();
  onCancel.mockReset();
  fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
    if (options?.method === 'POST') {
      return { ok: true, json: async () => ({ success: true, data: { id: 'eq-created' } }) };
    }
    if (url === '/api/eps/tags') {
      return { ok: true, json: async () => ({ success: true, data: [{ id: 'tag-1', name: 'Critical', color: null }] }) };
    }
    return { ok: true, json: async () => ({ success: true, data: { sections: [], unassignedFields: [] } }) };
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('EquipmentWizardForm', () => {
  it('blocks advancing without a name and submits a trimmed draft payload', async () => {
    renderWithProviders(<EquipmentWizardForm onSuccess={onSuccess} onCancel={onCancel} />);
    await waitFor(() => expect(screen.getByText('Идентификация и размещение')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
    expect(enqueueSnackbar).toHaveBeenCalledWith('Укажите наименование оборудования', { variant: 'warning' });

    fireEvent.change(screen.getByPlaceholderText('например: Центробежный насос подачи охлаждающей воды'), { target: { value: '  Pump  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить в черновик' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('eq-created'));
    const request = fetchMock.mock.calls.find(([, options]) => (options as RequestInit | undefined)?.method === 'POST');
    expect(request?.[0]).toBe('/api/eps/equipment');
    expect(JSON.parse((request?.[1] as RequestInit).body as string)).toMatchObject({
      name: 'Pump',
      asDraft: true,
      submitForApproval: false,
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '../ui/__tests__/test-utils';
import FeedbackDialog from './FeedbackDialog';

const enqueueSnackbar = vi.fn();
const fetchMock = vi.fn();
const onClose = vi.fn();

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar }) }));

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockImplementation(async (url: string) => {
    if (url === '/api/feedback?onlyOwn=true') {
      return { ok: true, json: async () => ({ success: true, data: [] }) };
    }
    return {
    ok: true,
      json: async () => ({ success: true, data: { ticketNumber: 'FB-42' } }),
    };
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('FeedbackDialog', () => {
  it('validates the new ticket form before sending a request', async () => {
    renderWithProviders(<FeedbackDialog open onClose={onClose} />);

    expect(screen.getByText('Обратная связь и техподдержка')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Отправить обращение' }));

    expect(enqueueSnackbar).toHaveBeenCalledWith('Укажите тему обращения', { variant: 'warning' });
    expect(fetchMock).not.toHaveBeenCalledWith('/api/feedback', expect.anything());
  });

  it('submits trimmed ticket data, reports success, and opens own tickets', async () => {
    renderWithProviders(<FeedbackDialog open onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('Кратко сформулируйте суть проблемы или идеи...'), { target: { value: '  Broken pump  ' } });
    fireEvent.change(screen.getByPlaceholderText('Опишите подробности, последовательность действий для воспроизведения или ожидаемый результат...'), { target: { value: '  Pump stops unexpectedly  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить обращение' }));

    await waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledWith('Обращение FB-42 успешно создано!', { variant: 'success' }));
    const submitCall = fetchMock.mock.calls.find(([url, options]) => url === '/api/feedback' && options?.method === 'POST');
    expect(submitCall).toBeDefined();
    const body = submitCall?.[1]?.body as FormData;
    expect(body.get('title')).toBe('Broken pump');
    expect(body.get('description')).toBe('Pump stops unexpectedly');
    expect(body.get('type')).toBe('BUG');
    expect(fetchMock).toHaveBeenCalledWith('/api/feedback?onlyOwn=true');
  });

  it('loads tickets when switching to own tickets and can return to the form', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/feedback?onlyOwn=true') {
        return { ok: true, json: async () => ({ success: true, data: [] }) };
      }
      return { ok: true, json: async () => ({ success: true, data: {} }) };
    });
    renderWithProviders(<FeedbackDialog open onClose={onClose} />);

    fireEvent.click(screen.getByRole('tab', { name: /мои обращения/i }));
    await waitFor(() => expect(screen.getByText('У вас пока нет обращений')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Создать обращение' }));
    expect(screen.getByPlaceholderText('Кратко сформулируйте суть проблемы или идеи...')).toBeInTheDocument();
  });

  it('closes from the header and cancel action', () => {
    renderWithProviders(<FeedbackDialog open onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

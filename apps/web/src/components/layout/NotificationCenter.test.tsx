'use client';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '@/components/ui/__tests__/test-utils';
import NotificationCenter from './NotificationCenter';

const push = vi.fn();
const fetchMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async (url: string) => {
    if (url === '/api/notifications') {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            unreadCount: 1,
            notifications: [{
              id: 'notification-1',
              title: 'Заявка на закупку согласована',
              message: 'Заявка № PR-1 согласована.',
              type: 'PURCHASE_REQUEST_APPROVED',
              link: '/prm?requestId=req-1',
              isRead: false,
              createdAt: '2026-09-02T10:00:00.000Z',
            }],
          },
        }),
      };
    }
    return { ok: true, json: async () => ({ success: true }) };
  });
});

describe('PRM notification navigation', () => {
  it('passes the canonical PRM deep link to the router after marking the item read', async () => {
    renderWithProviders(<NotificationCenter />);
    fireEvent.click(screen.getByRole('button', { name: 'Уведомления' }));
    await waitFor(() => expect(screen.getByText('Заявка на закупку согласована')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Заявка на закупку согласована'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/prm?requestId=req-1'));
  });
});

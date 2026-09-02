'use client';

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/components/ui/__tests__/test-utils';
import PrmRegistryPage from './page';

const replace = vi.fn();
const fetchMock = vi.fn();
const enqueueSnackbar = vi.fn();
let query = new URLSearchParams('requestId=request-42&status=APPROVED');

vi.mock('next/navigation', () => ({
  // Fresh router and search-param objects per call mirror Next.js: neither
  // hook returns a referentially stable value, so the page must key its
  // deep-link loader on the `requestId` value rather than object identity.
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(query.toString()),
}));

vi.mock('@/lib/auth-client', () => ({
  useAuth: () => ({
    user: { userId: 'requester-1' },
    hasPermission: () => true,
  }),
}));

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar }),
}));

vi.mock('@/components/layout/PageHeader', () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/ui', () => ({
  StatCard: () => null,
  SearchInput: () => null,
  FilterToolbar: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  EmptyState: ({ title }: { title?: string }) => <div>{title}</div>,
  DataTableWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PageLoading: ({ text }: { text: string }) => <div role="status">{text}</div>,
  ErrorState: ({ title, description }: { title: string; description: string }) => <div role="alert">{title}: {description}</div>,
  ConfirmDialog: ({ open }: { open: boolean }) => (open ? <div data-testid="confirm-dialog" /> : null),
  NavTabsContainer: () => null,
  ExportButton: () => null,
}));

type MockRequest = { id: string; requestNumber: string };

// The details dialog is replaced by a minimal harness that exposes every
// production callback as a button, so each action workflow is driven through
// the real page component rather than asserted against source text.
vi.mock('@/components/prm', () => ({
  PrmRequestWizardDialog: () => null,
  PrmDeliveryDialog: ({ open, request }: { open: boolean; request: MockRequest | null }) => (
    open ? <div data-testid="delivery-dialog">{request?.requestNumber}</div> : null
  ),
  PrmRequestReviewDialog: ({ open, request }: { open: boolean; request: MockRequest | null }) => (
    open ? <div data-testid="review-dialog">{request?.requestNumber}</div> : null
  ),
  PrmRequestTableView: () => null,
  PrmRequestDetailsDialog: ({
    open,
    request,
    onClose,
    onReceive,
    onSubmit,
    onReview,
    onCancel,
  }: {
    open: boolean;
    request: MockRequest | null;
    onClose: () => void;
    onReceive: (request: MockRequest) => void;
    onSubmit: (request: MockRequest) => void;
    onReview: (request: MockRequest) => void;
    onCancel: (request: MockRequest) => void;
  }) => (
    open && request ? (
      <div role="dialog">
        {request.requestNumber}
        <button onClick={onClose}>close</button>
        <button onClick={() => onReceive(request)}>receive</button>
        <button onClick={() => onSubmit(request)}>submit</button>
        <button onClick={() => onReview(request)}>review</button>
        <button onClick={() => onCancel(request)}>cancel</button>
      </div>
    ) : null
  ),
}));

function response(data: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => data };
}

const listResponse = () => response({ success: true, data: { items: [], total: 0, stats: {} } });

function detailCalls(id: string) {
  return fetchMock.mock.calls.filter(([url]) => url === `/api/prm/requests/${id}`);
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  query = new URLSearchParams('requestId=request-42&status=APPROVED');
  fetchMock.mockImplementation(async (url: string) => {
    if (url === '/api/prm/requests/request-42') {
      return response({
        success: true,
        data: { id: 'request-42', requestNumber: 'PR-42' },
      });
    }
    return listResponse();
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('PRM registry deep links', () => {
  it('loads and opens the requested card independently of the current registry page', async () => {
    renderWithProviders(<PrmRegistryPage />);

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('PR-42'));
    expect(fetchMock).toHaveBeenCalledWith('/api/prm/requests/request-42');
  });

  it('issues exactly one detail request under React 18 StrictMode double-invocation', async () => {
    // StrictMode runs effect setup -> cleanup -> setup for the same committed
    // deep link. Without in-flight deduplication this produces two identical
    // network calls for one stable requestId.
    renderWithProviders(
      <React.StrictMode>
        <PrmRegistryPage />
      </React.StrictMode>
    );

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('PR-42'));

    await waitFor(() => expect(detailCalls('request-42')).toHaveLength(1));
    expect(detailCalls('request-42')).toHaveLength(1);
  });

  it('reloads details when the deep link is removed and later returns', async () => {
    // The in-flight registry must not permanently suppress future loads: a
    // user who closes the card and reopens the same notification must get a
    // fresh request rather than a cached payload.
    const { rerender } = renderWithProviders(
      <React.StrictMode>
        <PrmRegistryPage />
      </React.StrictMode>
    );

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('PR-42'));
    expect(detailCalls('request-42')).toHaveLength(1);

    // Close the card the way production does, then apply the resulting URL.
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    query = new URLSearchParams('status=APPROVED');
    rerender(
      <React.StrictMode>
        <PrmRegistryPage />
      </React.StrictMode>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Navigating back to the same notification link reloads the card.
    query = new URLSearchParams('requestId=request-42&status=APPROVED');
    rerender(
      <React.StrictMode>
        <PrmRegistryPage />
      </React.StrictMode>
    );

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('PR-42'));
    expect(detailCalls('request-42')).toHaveLength(2);
  });

  it('issues exactly one detail request for a stable requestId across re-renders', async () => {
    const { rerender } = renderWithProviders(<PrmRegistryPage />);

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('PR-42'));

    rerender(<PrmRegistryPage />);
    rerender(<PrmRegistryPage />);

    await waitFor(() => expect(detailCalls('request-42')).toHaveLength(1));
    expect(detailCalls('request-42')).toHaveLength(1);
  });

  it('discards a stale in-flight response when the requestId changes', async () => {
    const staleGate: { release: () => void } = { release: () => {} };
    const stalePending = new Promise<void>((resolve) => { staleGate.release = resolve; });
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/prm/requests/request-stale') {
        await stalePending;
        return response({ success: true, data: { id: 'request-stale', requestNumber: 'PR-STALE' } });
      }
      if (url === '/api/prm/requests/request-fresh') {
        return response({ success: true, data: { id: 'request-fresh', requestNumber: 'PR-FRESH' } });
      }
      return listResponse();
    });

    query = new URLSearchParams('requestId=request-stale&status=APPROVED');
    const { rerender } = renderWithProviders(<PrmRegistryPage />);

    await waitFor(() => expect(detailCalls('request-stale')).toHaveLength(1));

    query = new URLSearchParams('requestId=request-fresh&status=APPROVED');
    rerender(<PrmRegistryPage />);

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('PR-FRESH'));

    // The superseded response resolves only now; it must not replace the card.
    staleGate.release();

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('PR-FRESH'));
    expect(screen.queryByText('PR-STALE')).not.toBeInTheDocument();
  });

  it('removes only requestId on ordinary close and keeps unrelated query params', async () => {
    renderWithProviders(<PrmRegistryPage />);

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('PR-42'));

    fireEvent.click(screen.getByRole('button', { name: 'close' }));

    expect(replace).toHaveBeenCalledWith('/prm?status=APPROVED', { scroll: false });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it.each([
    ['receive', 'delivery-dialog'],
    ['review', 'review-dialog'],
    ['cancel', 'confirm-dialog'],
  ])('removes the deep link when the %s action replaces the details view', async (action, followUpTestId) => {
    renderWithProviders(<PrmRegistryPage />);

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('PR-42'));

    fireEvent.click(screen.getByRole('button', { name: action }));

    expect(replace).toHaveBeenCalledWith('/prm?status=APPROVED', { scroll: false });

    // The follow-up workflow opens and the details card does not come back.
    await waitFor(() => expect(screen.getByTestId(followUpTestId)).toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Simulate Next.js applying the replace: the loader must not fetch again.
    query = new URLSearchParams('status=APPROVED');
    expect(detailCalls('request-42')).toHaveLength(1);
  });

  it('removes the deep link when the submit action replaces the details view', async () => {
    renderWithProviders(<PrmRegistryPage />);

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('PR-42'));

    fireEvent.click(screen.getByRole('button', { name: 'submit' }));

    expect(replace).toHaveBeenCalledWith('/prm?status=APPROVED', { scroll: false });
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/prm/requests/request-42/submit', { method: 'POST' })
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(detailCalls('request-42')).toHaveLength(1);
  });

  it('reports inaccessible requests and removes only requestId from the URL', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/prm/requests/request-42') return response({ success: false, error: 'Forbidden' }, false, 403);
      return listResponse();
    });

    renderWithProviders(<PrmRegistryPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/prm?status=APPROVED', { scroll: false }));
    expect(enqueueSnackbar).toHaveBeenCalledWith('У вас нет доступа к этой заявке.', { variant: 'warning' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reports a missing request and cleans the deep link without opening a card', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/prm/requests/request-42') return response({ success: false, error: 'Not found' }, false, 404);
      return listResponse();
    });

    renderWithProviders(<PrmRegistryPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/prm?status=APPROVED', { scroll: false }));
    expect(enqueueSnackbar).toHaveBeenCalledWith('Заявка не найдена или была удалена.', { variant: 'warning' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Заявка не найдена или была удалена.');
  });

  it('cleans the deep link when the detail request fails at the network level', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/prm/requests/request-42') throw new Error('network down');
      return listResponse();
    });

    renderWithProviders(<PrmRegistryPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/prm?status=APPROVED', { scroll: false }));
    expect(enqueueSnackbar).toHaveBeenCalledWith('Не удалось загрузить заявку из уведомления.', { variant: 'error' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cleans the deep link when the detail response body is malformed', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/prm/requests/request-42') {
        return { ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token'); } };
      }
      return listResponse();
    });

    renderWithProviders(<PrmRegistryPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/prm?status=APPROVED', { scroll: false }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось открыть заявку.');
  });
});

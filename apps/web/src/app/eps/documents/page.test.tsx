'use client';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/components/ui/__tests__/test-utils';
import DocumentsListPage from './page';

const enqueueSnackbar = vi.fn();
const fetchMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/auth-client', () => ({
  useAuth: () => ({
    hasPermission: () => true,
  }),
}));

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar }),
}));

vi.mock('@/components/eps/documents/DocumentUploadDialog', () => ({
  DocumentUploadDialog: () => null,
}));

vi.mock('@/components/eps/documents/DocumentArchiveTableView', () => ({
  DocumentArchiveTableView: ({ items }: { items: Array<{ originalName: string }> }) => (
    <div data-testid="document-table">{items.map((item) => item.originalName).join(', ')}</div>
  ),
}));

function response(json: unknown) {
  return { ok: true, json: async () => json };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

describe('EPS documents page response contract', () => {
  it('renders the empty state for a paginated empty envelope without throwing', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/api/eps/equipment')) {
        return response({ success: true, data: { items: [] } });
      }
      return response({
        success: true,
        data: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 25,
          totalPages: 0,
          stats: { totalDocuments: 0, totalSizeBytes: 0, byTypeCounts: {} },
        },
      });
    });

    expect(() => renderWithProviders(<DocumentsListPage />)).not.toThrow();
    await waitFor(() => expect(screen.getByText('Документы не найдены')).toBeInTheDocument());
    expect(screen.queryByTestId('document-table')).not.toBeInTheDocument();
  });

  it('extracts document items and statistics from the paginated envelope', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/api/eps/equipment')) {
        return response({ success: true, data: { items: [] } });
      }
      return response({
        success: true,
        data: {
          items: [{
            id: 'doc-1',
            equipmentId: 'eq-1',
            fileName: 'manual.pdf',
            originalName: 'Руководство.pdf',
            filePath: '/files/manual.pdf',
            fileType: 'application/pdf',
            fileSize: 1024,
            docType: 'MANUAL',
            version: 1,
            description: null,
            createdAt: '2026-09-02T10:00:00.000Z',
            equipment: { id: 'eq-1', name: 'Насос', inventoryNumber: 'INV-1', manufacturer: null, model: null, location: null, status: 'ACTIVE' },
            uploadedBy: { id: 'user-1', displayName: 'Администратор', ldapLogin: 'admin' },
          }],
          total: 1,
          page: 1,
          pageSize: 25,
          totalPages: 1,
          stats: { totalDocuments: 1, totalSizeBytes: 1024, byTypeCounts: { MANUAL: 1 } },
        },
      });
    });

    renderWithProviders(<DocumentsListPage />);

    await waitFor(() => expect(screen.getByTestId('document-table')).toHaveTextContent('Руководство.pdf'));
    expect(screen.getAllByText('1')).not.toHaveLength(0);
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../ui/__tests__/test-utils';
import EquipmentPrmTab from './EquipmentPrmTab';
import type { EquipmentDetails } from '@/app/eps/[id]/page';

const mockEquipment: EquipmentDetails = {
  id: 'eq-100',
  name: 'Centrifugal Pump A1',
  inventoryNumber: 'INV-100',
  serialNumber: 'SN-100',
  manufacturer: 'Grundfos',
  model: 'CR-32',
  location: 'Shop 1',
  status: 'ACTIVE',
  commissionDate: '2024-01-01',
  customFields: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  createdBy: { displayName: 'Admin', ldapLogin: 'admin' },
  tags: [],
  photos: [],
  documents: [],
  spareParts: [],
  maintenancePlans: [],
};

const mockRequests = [
  {
    id: 'req-1',
    requestNumber: 'PR-20260902-000001',
    status: 'APPROVED',
    priority: 'HIGH',
    estimatedTotal: 50000,
    currency: 'RUB',
    createdAt: '2026-09-02T10:00:00.000Z',
    targetWarehouse: { id: 'wh-1', name: 'Main Warehouse' },
    items: [
      { id: 'item-1', nomenclature: { name: 'Bearing 6204', unit: 'pcs' } },
      { id: 'item-2', nomenclature: { name: 'Mechanical Seal', unit: 'pcs' } },
    ],
  },
];

let mockPermissions = ['eps.equipment.view', 'prm.requests.view'];
vi.mock('@/lib/auth-client', () => ({
  useAuth: () => ({
    user: { userId: 'u1' },
    hasPermission: (p: string) => mockPermissions.includes(p),
  }),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  mockPermissions = ['eps.equipment.view', 'prm.requests.view'];
  vi.stubGlobal('fetch', fetchMock);
});

describe('EquipmentPrmTab', () => {
  it('renders permission restricted state and makes no fetch when user lacks PRM permissions', async () => {
    mockPermissions = ['eps.equipment.view'];
    renderWithProviders(<EquipmentPrmTab equipment={mockEquipment} />);

    expect(screen.getByText('Доступ ограничен')).toBeInTheDocument();
    expect(screen.getByText('У вас нет прав для просмотра заявок на закупку (PRM).')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders empty state with create button when user has create permission and no requests exist', async () => {
    mockPermissions = ['eps.equipment.view', 'prm.requests.view', 'prm.requests.create'];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { items: [], total: 0 } }),
    });

    renderWithProviders(<EquipmentPrmTab equipment={mockEquipment} />);

    await waitFor(() => {
      expect(screen.getByText('Нет привязанных заявок на закупку')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /Создать заявку/i })).toHaveAttribute(
      'href',
      '/prm?create=true&equipmentId=eq-100',
    );
  });

  it('renders table of purchase requests but hides create button when user lacks create permission', async () => {
    mockPermissions = ['eps.equipment.view', 'prm.requests.view'];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { items: mockRequests, total: 1 } }),
    });

    renderWithProviders(<EquipmentPrmTab equipment={mockEquipment} />);

    await waitFor(() => {
      expect(screen.getByText('PR-20260902-000001')).toBeInTheDocument();
    });
    expect(screen.getByText('Main Warehouse')).toBeInTheDocument();
    expect(screen.getByText(/Bearing 6204/)).toBeInTheDocument();
    expect(screen.getByText(/Заявки на закупку ТМЦ \(PRM\) \(1\)/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Создать заявку/i })).not.toBeInTheDocument();
  });
});

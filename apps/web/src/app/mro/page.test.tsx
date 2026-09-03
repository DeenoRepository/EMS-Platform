'use client';

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderWithProviders, screen, waitFor, fireEvent } from '@/components/ui/__tests__/test-utils';
import MroPage from './page';
import { PERMISSIONS } from '@ems/shared';

const push = vi.fn();
const enqueueSnackbar = vi.fn();
const fetchMock = vi.fn();
let query = new URLSearchParams();
let mockPermissions: string[] = [PERMISSIONS.MRO_SCHEDULE_VIEW];

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(query.toString()),
}));

vi.mock('@/lib/auth-client', () => ({
  useAuth: () => ({
    user: { userId: 'tech-1' },
    hasPermission: (p: string) => mockPermissions.includes(p as any),
  }),
}));

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar }),
}));

vi.mock('@/components/layout/PageHeader', () => ({
  default: ({ title, actions }: { title: string; actions?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {actions}
    </div>
  ),
}));

vi.mock('@/components/mro', () => ({
  MroExecutionWizardDialog: () => null,
}));

const mockSchedules = [
  {
    id: 'sch-1',
    equipmentId: 'eq-1',
    planId: 'plan-1',
    scheduledDate: '2026-09-10T10:00:00.000Z',
    actualDate: null,
    status: 'PLANNED',
    notes: 'Clean filter',
    createdAt: '2026-09-01T00:00:00.000Z',
    equipment: {
      id: 'eq-1',
      name: 'Centrifugal Pump A1',
      inventoryNumber: 'INV-101',
      serialNumber: 'SN-101',
      location: 'Sector 1',
      status: 'ACTIVE',
    },
    plan: {
      id: 'plan-1',
      name: 'Monthly inspection',
      frequency: 'Ежемесячно',
      checklist: null,
    },
    completedBy: null,
    purchaseRequests: [],
  },
  {
    id: 'sch-2',
    equipmentId: 'eq-2',
    planId: 'plan-2',
    scheduledDate: '2026-09-12T10:00:00.000Z',
    actualDate: null,
    status: 'PLANNED',
    notes: 'Replace valves',
    createdAt: '2026-09-01T00:00:00.000Z',
    equipment: {
      id: 'eq-2',
      name: 'Hydraulic Press B2',
      inventoryNumber: 'INV-202',
      serialNumber: 'SN-202',
      location: 'Sector 2',
      status: 'ACTIVE',
    },
    plan: {
      id: 'plan-2',
      name: 'Quarterly overhaul',
      frequency: 'Ежеквартально',
      checklist: null,
    },
    completedBy: null,
    purchaseRequests: [
      { id: 'pr-1', requestNumber: 'PR-20260902-000001', status: 'SUBMITTED' },
    ],
  },
];

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  query = new URLSearchParams();
  mockPermissions = [PERMISSIONS.MRO_SCHEDULE_VIEW];
  fetchMock.mockImplementation(async (url: string) => {
    if (url.includes('/api/mro/schedules')) {
      return {
        ok: true,
        json: async () => ({ success: true, data: mockSchedules }),
      };
    }
    if (url.includes('/api/system/maintenance')) {
      return {
        ok: true,
        json: async () => ({ success: true, data: { modules: {} } }),
      };
    }
    return { ok: true, json: async () => ({}) };
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('MRO page schedule deep linking and PRM create permission', () => {
  it('renders all schedules when scheduleId query parameter is absent', async () => {
    renderWithProviders(<MroPage />);

    await waitFor(() => {
      expect(screen.getByText('Centrifugal Pump A1')).toBeInTheDocument();
      expect(screen.getByText('Hydraulic Press B2')).toBeInTheDocument();
    });
  });

  it('filters to exact schedule and highlights it when scheduleId query parameter is present', async () => {
    query = new URLSearchParams('scheduleId=sch-2');

    renderWithProviders(<MroPage />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic Press B2')).toBeInTheDocument();
    });
    expect(screen.queryByText('Centrifugal Pump A1')).not.toBeInTheDocument();

    // The PRM reference link for sch-2 is visible
    expect(screen.getByText('PR-20260902-000001')).toBeInTheDocument();
  });

  it('hides PRM create-from-context action when user lacks PRM_REQUESTS_CREATE', async () => {
    // MRO-only user
    mockPermissions = [PERMISSIONS.MRO_SCHEDULE_VIEW, PERMISSIONS.MRO_EXECUTION_COMPLETE];

    renderWithProviders(<MroPage />);

    await waitFor(() => {
      expect(screen.getByText('Centrifugal Pump A1')).toBeInTheDocument();
    });

    // Tooltip or link for creating purchase request must not be present
    expect(
      screen.queryByRole('link', { name: /Создать заявку на закупку для данного ТО/i }),
    ).not.toBeInTheDocument();
  });

  it('shows PRM create-from-context action when user has PRM_REQUESTS_CREATE', async () => {
    mockPermissions = [
      PERMISSIONS.MRO_SCHEDULE_VIEW,
      PERMISSIONS.PRM_REQUESTS_CREATE,
    ];

    renderWithProviders(<MroPage />);

    await waitFor(() => {
      expect(screen.getByText('Centrifugal Pump A1')).toBeInTheDocument();
    });

    // PRM create link should now be present
    const createLinks = screen.getAllByRole('link');
    const prmCreateLink = createLinks.find((l) =>
      l.getAttribute('href')?.includes('/prm?create=true&equipmentId=eq-1&maintenanceScheduleId=sch-1'),
    );
    expect(prmCreateLink).toBeDefined();
  });
});

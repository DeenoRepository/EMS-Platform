import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '../ui/__tests__/test-utils';
import { EquipmentOperationalTabs } from './EquipmentOperationalTabs';
import { EquipmentPassportOverview } from './EquipmentPassportOverview';
import type { EquipmentDetails } from '@/app/eps/[id]/page';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/lib/auth-client', () => ({
  useAuth: () => ({
    user: { userId: 'u1' },
    hasPermission: () => true,
  }),
}));

const equipment = {
  id: 'eq-1',
  name: 'Main pump',
  inventoryNumber: 'INV-1',
  serialNumber: 'SN-1',
  manufacturer: 'Acme',
  model: 'PX-10',
  location: 'Workshop',
  status: 'ACTIVE',
  commissionDate: '2026-08-01',
  customFields: {
    actual_wear_percentage: 25,
    responsible_person_name: 'Иван Петров',
    criticality: 'A',
    power: 7,
  },
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  createdBy: { displayName: 'Администратор', ldapLogin: 'admin' },
  tags: [{ tag: { id: 'tag-1', name: 'Критичное', color: null } }],
  photos: [],
  documents: [],
  spareParts: [{
    nomenclature: {
      id: 'nom-1',
      name: 'Filter',
      article: 'F-1',
      unit: 'pcs',
      stockItems: [{ quantity: '2', warehouse: { name: 'Main warehouse' } }],
    },
  }],
  maintenancePlans: [{
    id: 'plan-1',
    name: 'Quarterly maintenance',
    frequency: 'Ежеквартально',
    schedules: [{ id: 'schedule-1', title: 'Inspect belt', scheduledDate: '2026-09-01', status: 'PLANNED' }],
  }],
  jiraIssues: [{
    id: 'issue-1',
    issueKey: 'SRM-1',
    summary: 'Vibration detected',
    status: 'OPEN',
    priority: 'HIGH',
    createdDate: '2026-08-02T10:00:00.000Z',
    resolvedDate: null,
  }],
  approvals: [],
} as EquipmentDetails;

const field = {
  id: 'field-1',
  sectionId: 'section-1',
  key: 'power',
  name: 'Power',
  fieldType: 'NUMBER' as const,
  unit: 'kW',
  isRequired: false,
  defaultValue: null,
};

const section = {
  id: 'section-1',
  code: 'TECH',
  name: 'Technical data',
  description: 'Measured characteristics',
  icon: 'Engineering',
  sortOrder: 1,
  fields: [field],
};

const lifecycleEvents = [{
  id: 'event-1',
  type: 'COMMISSIONING' as const,
  title: 'Ввод в эксплуатацию',
  date: '2026-08-01T10:00:00.000Z',
}];

beforeEach(() => {
  push.mockReset();
});

describe('equipment passport operational tabs', () => {
  it('renders spare parts and maintenance data for their active tabs', () => {
    const { rerender } = renderWithProviders(
      <EquipmentOperationalTabs
        activeTab={3}
        equipment={equipment}
        lifecycleEvents={[]}
        auditLogs={[]}
        loadingAudit={false}
        onCreateSrmRequest={vi.fn()}
      />,
    );
    expect(screen.getByText('Комплектующие, запасные части и ЗИП')).toBeInTheDocument();
    expect(screen.getByText('Filter')).toBeInTheDocument();
    expect(screen.getByText('Main warehouse: 2 pcs')).toBeInTheDocument();

    rerender(
      <EquipmentOperationalTabs
        activeTab={4}
        equipment={equipment}
        lifecycleEvents={[]}
        auditLogs={[]}
        loadingAudit={false}
        onCreateSrmRequest={vi.fn()}
      />,
    );
    expect(screen.getByText('График регламентного обслуживания и ППР (ТОиР)')).toBeInTheDocument();
    expect(screen.getByText('Quarterly maintenance (Ежеквартально)')).toBeInTheDocument();
    expect(screen.getByText('Inspect belt')).toBeInTheDocument();
    expect(screen.getByText('Запланировано')).toBeInTheDocument();
  });

  it('renders PRM operational tab and provides procurement request overview', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { items: [], total: 0 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(
      <EquipmentOperationalTabs
        activeTab={5}
        equipment={equipment}
        lifecycleEvents={[]}
        auditLogs={[]}
        loadingAudit={false}
        onCreateSrmRequest={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Нет привязанных заявок на закупку')).toBeInTheDocument();
    });
  });

  it('renders SRM incidents, invokes creation, and opens MRO from an incident', () => {
    const onCreateSrmRequest = vi.fn();
    renderWithProviders(
      <EquipmentOperationalTabs
        activeTab={6}
        equipment={equipment}
        lifecycleEvents={[]}
        auditLogs={[]}
        loadingAudit={false}
        onCreateSrmRequest={onCreateSrmRequest}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Зафиксировать отказ / Заявка SRM' }));
    expect(onCreateSrmRequest).toHaveBeenCalledTimes(1);

    const mroButton = screen.getByRole('button', { name: 'Создать наряд ТОиР в модуле MRO' });
    fireEvent.click(mroButton);
    expect(push).toHaveBeenCalledWith(expect.stringContaining('/mro?createSchedule=true'));
    expect(push).toHaveBeenCalledWith(expect.stringContaining('equipmentId=eq-1'));
  });

  it('renders audit history loading, empty, and populated states', () => {
    const { rerender } = renderWithProviders(
      <EquipmentOperationalTabs
        activeTab={7}
        equipment={equipment}
        lifecycleEvents={lifecycleEvents}
        auditLogs={[]}
        loadingAudit
        onCreateSrmRequest={vi.fn()}
      />,
    );
    expect(screen.getByText('Загрузка журнала аудита изменений...')).toBeInTheDocument();

    rerender(
      <EquipmentOperationalTabs
        activeTab={7}
        equipment={equipment}
        lifecycleEvents={lifecycleEvents}
        auditLogs={[]}
        loadingAudit={false}
        onCreateSrmRequest={vi.fn()}
      />,
    );
    expect(screen.getByText('Записей аудита не найдено')).toBeInTheDocument();

    rerender(
      <EquipmentOperationalTabs
        activeTab={7}
        equipment={equipment}
        lifecycleEvents={lifecycleEvents}
        auditLogs={[{ id: 'log-1', createdAt: '2026-08-02T10:00:00.000Z', action: 'UPDATE', changes: { status: 'ACTIVE' }, user: { displayName: 'Иван Петров' } }]}
        loadingAudit={false}
        onCreateSrmRequest={vi.fn()}
      />,
    );
    expect(screen.getByText('Иван Петров')).toBeInTheDocument();
    expect(screen.getByText(/"status": "ACTIVE"/)).toBeInTheDocument();
  });
});

describe('equipment passport overview', () => {
  it('renders KPI, technical fields, tags, and copy actions', () => {
    const onCopy = vi.fn();
    renderWithProviders(
      <EquipmentPassportOverview
        activeTab={0}
        equipment={equipment}
        sections={[section]}
        unassignedFields={[]}
        healthScore={88}
        onCopy={onCopy}
      />,
    );

    expect(screen.getByText('Статус актива')).toBeInTheDocument();
    expect(screen.getByText('Technical data')).toBeInTheDocument();
    expect(screen.getByText('Power')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Критичное')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Скопировать инвентарный номер' }));
    expect(onCopy).toHaveBeenCalledWith('INV-1', 'Инвентарный номер');
  });

  it('shows the technical empty state when no fields are configured', () => {
    renderWithProviders(
      <EquipmentPassportOverview
        activeTab={0}
        equipment={{ ...equipment, tags: [] }}
        sections={[]}
        unassignedFields={[]}
        healthScore={0}
        onCopy={vi.fn()}
      />,
    );
    expect(screen.getByText('Технические характеристики не настроены')).toBeInTheDocument();
  });
});

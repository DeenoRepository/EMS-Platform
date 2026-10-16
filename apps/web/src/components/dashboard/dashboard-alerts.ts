import { CriticalAlert } from '@/components/ui';
import { DashboardStats } from './types';

function createEpsRepairAlert(
  underRepair: number,
  isPersonalScope: boolean,
  onNavigate: (path: string) => void
): CriticalAlert {
  return {
    id: 'eps-repair',
    severity: 'CRITICAL',
    title: `${underRepair} ед. оборудования в неисправном состоянии (в ремонте)`,
    description: isPersonalScope
      ? 'В вашей зоне ответственности оборудование требует завершения ремонтных работ.'
      : 'Требуется контроль проведения ремонтных работ и восстановления работоспособности.',
    count: underRepair,
    actionLabel: 'К ремонту',
    onAction: () => onNavigate('/eps?status=UNDER_REPAIR'),
  };
}

function createWmsDeficitAlert(
  lowStockCount: number,
  isPersonalScope: boolean,
  onNavigate: (path: string) => void
): CriticalAlert {
  return {
    id: 'wms-deficit',
    severity: 'CRITICAL',
    title: `${lowStockCount} позиций ТМЦ ниже неснижаемого остатка (дефицит)`,
    description: isPersonalScope
      ? 'Критический дефицит расходных материалов и ЗИП на ваших ответственных складах.'
      : 'Критический дефицит расходных материалов и ЗИП на складах предприятия.',
    count: lowStockCount,
    actionLabel: 'К остаткам',
    onAction: () => onNavigate('/wms/stock'),
  };
}

function createMroOverdueAlert(
  overdueCount: number,
  isPersonalScope: boolean,
  onNavigate: (path: string) => void
): CriticalAlert {
  return {
    id: 'mro-overdue',
    severity: 'WARNING',
    title: `${overdueCount} просроченных регламентов ТОиР`,
    description: isPersonalScope
      ? 'Превышен плановый срок выполнения ТО по оборудованию в вашей зоне ответственности.'
      : 'Превышен плановый срок выполнения планово-предупредительных ремонтов.',
    count: overdueCount,
    actionLabel: 'К графику ППР',
    onAction: () => onNavigate('/mro'),
  };
}

function createApprovalsAlert(
  pending: number,
  toReview: number,
  onNavigate: (path: string) => void
): CriticalAlert {
  return {
    id: 'eps-approvals',
    severity: 'WARNING',
    title:
      toReview > 0
        ? `${toReview} заявок требует вашего утверждения`
        : `${pending} заявок ожидает утверждения`,
    description: 'Заявки на ввод, изменение статуса или списание оборудования в очереди согласования.',
    count: pending,
    actionLabel: 'Согласовать',
    onAction: () => onNavigate('/eps/approvals'),
  };
}

export function buildCriticalAlerts(
  stats: DashboardStats,
  isPersonalScope: boolean,
  onNavigate: (path: string) => void
): CriticalAlert[] {
  const alerts: CriticalAlert[] = [];

  if (stats.eps.underRepair > 0) {
    alerts.push(createEpsRepairAlert(stats.eps.underRepair, isPersonalScope, onNavigate));
  }

  if (stats.wms.accessible !== false && stats.wms.lowStockCount > 0) {
    alerts.push(createWmsDeficitAlert(stats.wms.lowStockCount, isPersonalScope, onNavigate));
  }

  if (stats.mro.overdueCount > 0) {
    alerts.push(createMroOverdueAlert(stats.mro.overdueCount, isPersonalScope, onNavigate));
  }

  if (stats.approvals.pending > 0) {
    alerts.push(createApprovalsAlert(stats.approvals.pending, stats.approvals.toReview || 0, onNavigate));
  }

  return alerts;
}

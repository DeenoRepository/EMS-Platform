import React from 'react';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import TimelineIcon from '@mui/icons-material/Timeline';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChecklistIcon from '@mui/icons-material/Checklist';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import { PERMISSIONS, PlatformMaintenanceStatus } from '@ems/shared';

export interface NavChild {
  label: string;
  path: string;
  icon?: React.ReactNode;
  badge?: number | null;
  badgeText?: string;
  badgeColor?: 'warning' | 'error' | 'primary' | 'default';
  badgeTooltip?: string;
  permission?: string;
  permissions?: string[];
}

export interface NavItemDef {
  id: string;
  label: string;
  path?: string;
  icon: React.ReactNode;
  badge?: number | null;
  badgeText?: string;
  badgeColor?: 'warning' | 'error' | 'primary' | 'default';
  badgeTooltip?: string;
  permission?: string;
  permissions?: string[];
  children?: NavChild[];
}

export interface SidebarCounts {
  repairCount: number | null;
  pendingApprovalsCount: number | null;
  rejectedApprovalsCount: number | null;
  wmsLowStockCount: number | null;
  wmsPendingTransfersCount: number | null;
  wmsActiveInventoriesCount: number | null;
  srmOpenCount: number | null;
  srmInProgressCount: number | null;
  mroOverdueCount: number | null;
  mroPlannedCount: number | null;
}

export function getMainItems(): NavItemDef[] {
  return [
    {
      id: 'dashboard',
      label: 'Сводная панель показателей',
      path: '/',
      icon: <AnalyticsOutlinedIcon sx={{ fontSize: 18 }} />,
    },
  ];
}

export function getOperationalItems(
  counts: SidebarCounts,
  maintenanceStatus: PlatformMaintenanceStatus | null
): NavItemDef[] {
  const {
    repairCount,
    pendingApprovalsCount,
    rejectedApprovalsCount,
    wmsLowStockCount,
    wmsPendingTransfersCount,
    wmsActiveInventoriesCount,
    srmOpenCount,
    mroOverdueCount,
  } = counts;

  return [
    {
      id: 'eps',
      label: 'Паспортизация оборудования (EPS)',
      icon: <BadgeOutlinedIcon sx={{ fontSize: 18 }} />,
      permissions: [
        PERMISSIONS.EPS_EQUIPMENT_VIEW,
        PERMISSIONS.EPS_EQUIPMENT_CREATE,
        PERMISSIONS.EPS_DOCUMENTS_VIEW,
        PERMISSIONS.EPS_APPROVALS_VIEW,
        PERMISSIONS.EPS_APPROVALS_CREATE,
        PERMISSIONS.EPS_HISTORY_VIEW,
        PERMISSIONS.EPS_REPORTS_VIEW,
      ],
      badgeText: maintenanceStatus?.modules.eps?.enabled ? 'ТО' : undefined,
      badgeColor: maintenanceStatus?.modules.eps?.enabled ? 'warning' : undefined,
      badgeTooltip: maintenanceStatus?.modules.eps?.enabled ? 'Модуль EPS находится на техническом обслуживании' : undefined,
      children: [
        {
          label: 'Реестр оборудования',
          path: '/eps',
          icon: <FormatListBulletedIcon sx={{ fontSize: 15 }} />,
          permissions: [PERMISSIONS.EPS_EQUIPMENT_VIEW, PERMISSIONS.EPS_EQUIPMENT_CREATE, PERMISSIONS.EPS_EQUIPMENT_EDIT],
          badge: repairCount && repairCount > 0 ? repairCount : null,
          badgeColor: 'error',
          badgeTooltip: repairCount && repairCount > 0 ? `${repairCount} ед. оборудования в неисправном состоянии (в ремонте)` : undefined,
        },
        {
          label: 'Техническая документация',
          path: '/eps/documents',
          icon: <ArticleOutlinedIcon sx={{ fontSize: 15 }} />,
          permissions: [PERMISSIONS.EPS_DOCUMENTS_VIEW, PERMISSIONS.EPS_DOCUMENTS_UPLOAD],
        },
        {
          label: 'Журнал согласований',
          path: '/eps/approvals',
          icon: <FactCheckOutlinedIcon sx={{ fontSize: 15 }} />,
          permissions: [PERMISSIONS.EPS_APPROVALS_VIEW, PERMISSIONS.EPS_APPROVALS_CREATE, PERMISSIONS.EPS_APPROVALS_MANAGE],
          badge:
            pendingApprovalsCount && pendingApprovalsCount > 0
              ? pendingApprovalsCount
              : rejectedApprovalsCount && rejectedApprovalsCount > 0
              ? rejectedApprovalsCount
              : null,
          badgeColor: pendingApprovalsCount && pendingApprovalsCount > 0 ? 'warning' : 'error',
          badgeTooltip:
            pendingApprovalsCount && pendingApprovalsCount > 0
              ? `${pendingApprovalsCount} заявок ожидает рассмотрения`
              : rejectedApprovalsCount && rejectedApprovalsCount > 0
              ? `${rejectedApprovalsCount} отклоненных заявок требует доработки`
              : undefined,
        },
        {
          label: 'История изменений и аудит',
          path: '/eps/history',
          icon: <HistoryOutlinedIcon sx={{ fontSize: 15 }} />,
          permission: PERMISSIONS.EPS_HISTORY_VIEW,
        },
        {
          label: 'Генератор отчетов и ведомостей',
          path: '/eps/reports',
          icon: <AssessmentOutlinedIcon sx={{ fontSize: 15 }} />,
          permissions: [PERMISSIONS.EPS_REPORTS_VIEW, PERMISSIONS.EPS_REPORTS_MANAGE],
        },
      ],
    },
    {
      id: 'wms',
      label: 'Складской учёт ТМЦ (WMS)',
      icon: <WarehouseOutlinedIcon sx={{ fontSize: 18 }} />,
      permissions: [
        PERMISSIONS.WMS_STOCK_VIEW,
        PERMISSIONS.WMS_OPERATIONS_CREATE,
        PERMISSIONS.WMS_NOMENCLATURE_MANAGE,
        PERMISSIONS.WMS_WAREHOUSES_MANAGE,
        PERMISSIONS.WMS_ZONES_MANAGE,
        PERMISSIONS.WMS_INVENTORY_MANAGE,
      ],
      badgeText: maintenanceStatus?.modules.wms?.enabled ? 'ТО' : undefined,
      badgeColor: maintenanceStatus?.modules.wms?.enabled ? 'warning' : undefined,
      badgeTooltip: maintenanceStatus?.modules.wms?.enabled ? 'Модуль WMS находится на техническом обслуживании' : undefined,
      children: [
        {
          label: 'Панель материальных потоков',
          path: '/wms',
          icon: <AnalyticsOutlinedIcon sx={{ fontSize: 15 }} />,
          permission: PERMISSIONS.WMS_STOCK_VIEW,
        },
        {
          label: 'Номенклатура и остатки ТМЦ',
          path: '/wms/stock',
          icon: <FormatListBulletedIcon sx={{ fontSize: 15 }} />,
          permissions: [PERMISSIONS.WMS_STOCK_VIEW, PERMISSIONS.WMS_NOMENCLATURE_MANAGE],
          badge: wmsLowStockCount && wmsLowStockCount > 0 ? wmsLowStockCount : null,
          badgeColor: 'error',
          badgeTooltip: wmsLowStockCount && wmsLowStockCount > 0 ? `${wmsLowStockCount} поз. ТМЦ ниже неснижаемого остатка (дефицит)` : undefined,
        },
        {
          label: 'Складские операции и перемещения',
          path: '/wms/operations',
          icon: <SwapHorizIcon sx={{ fontSize: 15 }} />,
          permissions: [PERMISSIONS.WMS_STOCK_VIEW, PERMISSIONS.WMS_OPERATIONS_CREATE],
          badge: wmsPendingTransfersCount && wmsPendingTransfersCount > 0 ? wmsPendingTransfersCount : null,
          badgeColor: 'warning',
          badgeTooltip: wmsPendingTransfersCount && wmsPendingTransfersCount > 0 ? `${wmsPendingTransfersCount} перемещений ожидает приемки / отгрузки` : undefined,
        },
        {
          label: 'Инвентаризационные описи',
          path: '/wms/inventory',
          icon: <FactCheckOutlinedIcon sx={{ fontSize: 15 }} />,
          permissions: [PERMISSIONS.WMS_INVENTORY_MANAGE, PERMISSIONS.WMS_STOCK_VIEW],
          badge: wmsActiveInventoriesCount && wmsActiveInventoriesCount > 0 ? wmsActiveInventoriesCount : null,
          badgeColor: 'primary',
          badgeTooltip: wmsActiveInventoriesCount && wmsActiveInventoriesCount > 0 ? `${wmsActiveInventoriesCount} инвентаризаций в процессе` : undefined,
        },
        {
          label: 'Топология складов и ячеек',
          path: '/wms/warehouses',
          icon: <WarehouseOutlinedIcon sx={{ fontSize: 15 }} />,
          permissions: [PERMISSIONS.WMS_WAREHOUSES_MANAGE, PERMISSIONS.WMS_ZONES_MANAGE],
        },
      ],
    },
    {
      id: 'srm',
      label: 'Управление инцидентами (SRM)',
      icon: <BugReportOutlinedIcon sx={{ fontSize: 18 }} />,
      permissions: [
        PERMISSIONS.SRM_DASHBOARD_VIEW,
        PERMISSIONS.SRM_REQUESTS_CREATE,
        PERMISSIONS.SRM_REQUESTS_MANAGE,
        PERMISSIONS.SRM_RELIABILITY_VIEW,
      ],
      badgeText: maintenanceStatus?.modules.srm?.enabled ? 'ТО' : undefined,
      badgeColor: maintenanceStatus?.modules.srm?.enabled ? 'warning' : undefined,
      badgeTooltip: maintenanceStatus?.modules.srm?.enabled ? 'Модуль SRM находится на техническом обслуживании' : undefined,
      children: [
        {
          label: 'Журнал инцидентов и заявок',
          path: '/srm',
          icon: <FormatListBulletedIcon sx={{ fontSize: 15 }} />,
          permissions: [PERMISSIONS.SRM_DASHBOARD_VIEW, PERMISSIONS.SRM_REQUESTS_CREATE, PERMISSIONS.SRM_REQUESTS_MANAGE],
          badge: srmOpenCount && srmOpenCount > 0 ? srmOpenCount : null,
          badgeColor: srmOpenCount && srmOpenCount > 0 ? 'warning' : 'default',
          badgeTooltip: srmOpenCount && srmOpenCount > 0 ? `${srmOpenCount} активных сервисных заявок` : undefined,
        },
        {
          label: 'Аналитика надежности и RAMS',
          path: '/srm/analytics',
          icon: <TimelineIcon sx={{ fontSize: 15 }} />,
          permissions: [PERMISSIONS.SRM_RELIABILITY_VIEW, PERMISSIONS.SRM_REPORTS_EXPORT],
        },
      ],
    },
    {
      id: 'mro',
      label: 'Техническое обслуживание (MRO)',
      icon: <BuildOutlinedIcon sx={{ fontSize: 18 }} />,
      permissions: [
        PERMISSIONS.MRO_SCHEDULE_VIEW,
        PERMISSIONS.MRO_SCHEDULE_MANAGE,
        PERMISSIONS.MRO_EXECUTION_COMPLETE,
      ],
      badgeText: maintenanceStatus?.modules.mro?.enabled ? 'ТО' : undefined,
      badgeColor: maintenanceStatus?.modules.mro?.enabled ? 'warning' : undefined,
      badgeTooltip: maintenanceStatus?.modules.mro?.enabled ? 'Модуль MRO находится на техническом обслуживании' : undefined,
      children: [
        {
          label: 'График ППР и наряды на ТО',
          path: '/mro',
          icon: <CalendarMonthIcon sx={{ fontSize: 15 }} />,
          permissions: [PERMISSIONS.MRO_SCHEDULE_VIEW, PERMISSIONS.MRO_SCHEDULE_MANAGE, PERMISSIONS.MRO_EXECUTION_COMPLETE],
          badge: mroOverdueCount && mroOverdueCount > 0 ? mroOverdueCount : null,
          badgeColor: mroOverdueCount && mroOverdueCount > 0 ? 'error' : 'default',
          badgeTooltip: mroOverdueCount && mroOverdueCount > 0 ? `${mroOverdueCount} просроченных регламентов ТО` : undefined,
        },
        {
          label: 'Технологические карты и регламенты',
          path: '/mro/checklists',
          icon: <ChecklistIcon sx={{ fontSize: 15 }} />,
          permissions: [PERMISSIONS.MRO_SCHEDULE_VIEW, PERMISSIONS.MRO_SCHEDULE_MANAGE],
        },
        {
          label: 'Журнал выполненных работ',
          path: '/mro/history',
          icon: <FactCheckOutlinedIcon sx={{ fontSize: 15 }} />,
          permissions: [PERMISSIONS.MRO_SCHEDULE_VIEW, PERMISSIONS.MRO_EXECUTION_COMPLETE],
        },
      ],
    },
  ];
}

export function getAdminItems(): NavItemDef[] {
  return [
    {
      id: 'access',
      label: 'Управление доступом и правами',
      icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 18 }} />,
      permissions: [PERMISSIONS.ADMIN_USERS_MANAGE, PERMISSIONS.ADMIN_ROLES_MANAGE],
      children: [
        {
          label: 'Учетные записи пользователей',
          path: '/admin/users',
          icon: <GroupOutlinedIcon sx={{ fontSize: 15 }} />,
          permission: PERMISSIONS.ADMIN_USERS_MANAGE,
        },
        {
          label: 'Матрица ролей и полномочий',
          path: '/admin/roles',
          icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 15 }} />,
          permission: PERMISSIONS.ADMIN_ROLES_MANAGE,
        },
      ],
    },
    {
      id: 'module-settings',
      label: 'Конфигурация модулей',
      icon: <TuneOutlinedIcon sx={{ fontSize: 18 }} />,
      permission: PERMISSIONS.ADMIN_SETTINGS_MANAGE,
      children: [
        { label: 'Паспортизация оборудования (EPS)', path: '/admin/module-settings?tab=eps', icon: <BadgeOutlinedIcon sx={{ fontSize: 15 }} /> },
        { label: 'Складской учёт ТМЦ (WMS)', path: '/admin/module-settings?tab=wms', icon: <WarehouseOutlinedIcon sx={{ fontSize: 15 }} /> },
        { label: 'Управление инцидентами (SRM)', path: '/admin/module-settings?tab=srm', icon: <BugReportOutlinedIcon sx={{ fontSize: 15 }} /> },
        { label: 'ТО и Ремонт (MRO)', path: '/admin/module-settings?tab=mro', icon: <BuildOutlinedIcon sx={{ fontSize: 15 }} /> },
      ],
    },
    {
      id: 'audit-log',
      label: 'Журнал аудита безопасности',
      path: '/admin/audit-log',
      icon: <ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} />,
      permission: PERMISSIONS.ADMIN_AUDIT_VIEW,
    },
    {
      id: 'admin-feedback',
      label: 'Центр обратной связи и техподдержки',
      path: '/admin/feedback',
      icon: <FeedbackOutlinedIcon sx={{ fontSize: 18 }} />,
      permission: PERMISSIONS.ADMIN_FEEDBACK_MANAGE,
    },
    {
      id: 'settings',
      label: 'Системные параметры платформы',
      path: '/admin/settings',
      icon: <SettingsOutlinedIcon sx={{ fontSize: 18 }} />,
      permission: PERMISSIONS.ADMIN_SETTINGS_MANAGE,
    },
  ];
}

export function getBadgeColors(type?: string) {
  switch (type) {
    case 'warning':
      return {
        bg: 'warning.light',
        text: 'warning.main',
        border: 'warning.dark',
        animation: 'none',
      };
    case 'error':
      return {
        bg: 'error.light',
        text: 'error.main',
        border: 'error.dark',
        animation: 'badgePulse 2s infinite',
      };
    default:
      return {
        bg: 'primary.light',
        text: 'primary.main',
        border: 'primary.dark',
        animation: 'none',
      };
  }
}

import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import InventoryIcon from '@mui/icons-material/Inventory';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import OutboxIcon from '@mui/icons-material/Outbox';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TuneIcon from '@mui/icons-material/Tune';
import EventIcon from '@mui/icons-material/Event';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import PersonIcon from '@mui/icons-material/Person';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';

export interface StatusTheme {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}

export const BASE_STATUS_CONFIG: Record<string, StatusTheme> = {
  // EPS Equipment Statuses
  ACTIVE: {
    label: 'В работе',
    color: 'success.dark',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  UNDER_REPAIR: {
    label: 'В ремонте',
    color: 'warning.dark',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <BuildCircleIcon sx={{ fontSize: 13 }} />,
  },
  IN_STORAGE: {
    label: 'На складе',
    color: 'text.secondary',
    bg: 'action.hover',
    border: 'divider',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  DECOMMISSIONED: {
    label: 'Списано',
    color: 'error.dark',
    bg: 'error.light',
    border: 'error.light',
    icon: <CancelIcon sx={{ fontSize: 13 }} />,
  },

  // EPS Approvals Statuses
  PENDING: {
    label: 'На согласовании',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },
  SUBMITTED: {
    label: 'На согласовании',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },
  PARTIALLY_DELIVERED: {
    label: 'Частично поставлена',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <LocalShippingOutlinedIcon sx={{ fontSize: 13 }} />,
  },
  DELIVERED: {
    label: 'Поставлена',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  APPROVED: {
    label: 'Одобрено',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  REJECTED: {
    label: 'Отклонено',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <CancelIcon sx={{ fontSize: 13 }} />,
  },
  CANCELLED: {
    label: 'Отозвано',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <CancelIcon sx={{ fontSize: 13 }} />,
  },

  // EPS Approval Types
  COMMISSIONING: {
    label: 'Ввод в эксплуатацию',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  PARAMETER_CHANGE: {
    label: 'Изменение параметров',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },
  STATUS_CHANGE: {
    label: 'Смена статуса',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <SwapHorizIcon sx={{ fontSize: 13 }} />,
  },
  EQUIPMENT_CREATE: {
    label: 'Создание оборудования',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <AddCircleOutlineIcon sx={{ fontSize: 13 }} />,
  },
  EQUIPMENT_UPDATE: {
    label: 'Изменение характеристик',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <EditOutlinedIcon sx={{ fontSize: 13 }} />,
  },
  EQUIPMENT_DELETE: {
    label: 'Удаление оборудования',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <DeleteOutlineIcon sx={{ fontSize: 13 }} />,
  },
  DOCUMENT_APPROVAL: {
    label: 'Согласование документа',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  DOCUMENT_CREATE: {
    label: 'Загрузка документа',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <AddCircleOutlineIcon sx={{ fontSize: 13 }} />,
  },
  DOCUMENT_DELETE: {
    label: 'Удаление документа',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <DeleteOutlineIcon sx={{ fontSize: 13 }} />,
  },

  // WMS Statuses & Types
  IN_PROGRESS: {
    label: 'В процессе',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },
  COMPLETED: {
    label: 'Завершено',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  DRAFT: {
    label: 'Черновик',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },
  LOW_STOCK: {
    label: 'Дефицит ТМЦ',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <WarningAmberIcon sx={{ fontSize: 13 }} />,
  },
  NORMAL_STOCK: {
    label: 'В наличии',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  RECEIPT: {
    label: 'Приход ТМЦ',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <MoveToInboxIcon sx={{ fontSize: 13 }} />,
  },
  ISSUE: {
    label: 'Списание ТМЦ',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <OutboxIcon sx={{ fontSize: 13 }} />,
  },
  ISSUE_WRITE_OFF: {
    label: 'Списание в утиль',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <DeleteOutlineIcon sx={{ fontSize: 13 }} />,
  },
  ISSUE_EMPLOYEE: {
    label: 'Выдача сотруднику',
    color: 'info.dark',
    bg: 'info.light',
    border: 'info.light',
    icon: <PersonIcon sx={{ fontSize: 13 }} />,
  },
  TRANSFER: {
    label: 'Перемещение ТМЦ',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <SwapHorizIcon sx={{ fontSize: 13 }} />,
  },
  REQUESTED: {
    label: 'Запрошено (Ожидает отгрузки)',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },
  IN_TRANSIT: {
    label: 'В пути (Ожидает приемки)',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <LocalShippingOutlinedIcon sx={{ fontSize: 13 }} />,
  },
  ADJUSTMENT: {
    label: 'Корректировка',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },

  // MRO
  PLANNED: {
    label: 'Запланировано',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <EventIcon sx={{ fontSize: 13 }} />,
  },
  MISSED: {
    label: 'Просрочено',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <WarningAmberIcon sx={{ fontSize: 13 }} />,
  },

  // Audit
  CREATE: {
    label: 'Создание',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <AddCircleOutlineIcon sx={{ fontSize: 13 }} />,
  },
  UPDATE: {
    label: 'Изменение',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <EditOutlinedIcon sx={{ fontSize: 13 }} />,
  },
  DELETE: {
    label: 'Удаление',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <DeleteOutlineIcon sx={{ fontSize: 13 }} />,
  },
  LOGIN: {
    label: 'Вход',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <LoginIcon sx={{ fontSize: 13 }} />,
  },
  LOGOUT: {
    label: 'Выход',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <LogoutIcon sx={{ fontSize: 13 }} />,
  },

  // SRM Priorities & Statuses
  CRITICAL: {
    label: 'Критический',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <PriorityHighIcon sx={{ fontSize: 13 }} />,
  },
  HIGH: {
    label: 'Высокий',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <WarningAmberIcon sx={{ fontSize: 13 }} />,
  },
  MEDIUM: {
    label: 'Средний',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },
  LOW: {
    label: 'Низкий',
    color: 'info.main',
    bg: 'info.light',
    border: 'info.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  OPEN: {
    label: 'Открыта',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <ErrorOutlineIcon sx={{ fontSize: 13 }} />,
  },
  WAITING: {
    label: 'Ожидание',
    color: 'info.main',
    bg: 'info.light',
    border: 'info.light',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },
  RESOLVED: {
    label: 'Решена',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  CLOSED: {
    label: 'Закрыта',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },

  // Feedback Hub
  NEW: {
    label: 'Новое',
    color: 'info.main',
    bg: 'info.light',
    border: 'info.light',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },
  IN_REVIEW: {
    label: 'На рассмотрении',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },
  DUPLICATE: {
    label: 'Дубликат',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <CancelIcon sx={{ fontSize: 13 }} />,
  },
  BUG: {
    label: 'Ошибка',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <ErrorOutlineIcon sx={{ fontSize: 13 }} />,
  },
  FEATURE_REQUEST: {
    label: 'Предложение',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <AddCircleOutlineIcon sx={{ fontSize: 13 }} />,
  },
  QUESTION: {
    label: 'Вопрос',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <HelpOutlineIcon sx={{ fontSize: 13 }} />,
  },
  OTHER: {
    label: 'Другое',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <HelpOutlineIcon sx={{ fontSize: 13 }} />,
  },
};

export function getStatusTheme(status: string, label?: string): StatusTheme {
  const rawKey = status || '';
  const camelSplitKey = rawKey.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase().trim().replace(/[\s-]+/g, '_');
  const upperKey = rawKey.toUpperCase().trim().replace(/[\s-]+/g, '_');

  const base = BASE_STATUS_CONFIG[camelSplitKey] || BASE_STATUS_CONFIG[upperKey];
  if (base) return base;

  return {
    label: label || status || '—',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <HelpOutlineIcon sx={{ fontSize: 13 }} />,
  };
}

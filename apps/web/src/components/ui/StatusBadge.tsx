'use client';

import React from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
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

export type StatusVariant = 'subtle' | 'dot' | 'outlined' | 'solid';

export interface StatusTheme {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}

export interface StatusBadgeProps {
  status: string;
  label?: string;
  variant?: StatusVariant;
  size?: 'small' | 'medium';
  showIcon?: boolean;
  tooltip?: string;
  className?: string;
  customColor?: string;
  customBg?: string;
  customBorder?: string;
  customIcon?: React.ReactNode;
  customConfig?: Partial<StatusTheme>;
}

const STATUS_CONFIG_MAP: Record<string, StatusTheme> = {
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

  // EPS Approval Types (Russian Nomenclature)
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

  // WMS Inventory & Stock Statuses
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

  // WMS Operations Types
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
    label: 'Списание ТМЦ',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <DeleteOutlineIcon sx={{ fontSize: 13 }} />,
  },
  ISSUE_EMPLOYEE: {
    label: 'Выдача сотруднику',
    color: 'info.dark',
    bg: 'info.light',
    border: '#bfdbfe',
    icon: <PersonIcon sx={{ fontSize: 13 }} />,
  },
  TRANSFER: {
    label: 'Перемещение ТМЦ',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: '#ddd6fe',
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

  // MRO Maintenance Statuses
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

  // Audit Actions
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
    label: 'Вход в систему',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <LoginIcon sx={{ fontSize: 13 }} />,
  },
  LOGOUT: {
    label: 'Выход из системы',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <LogoutIcon sx={{ fontSize: 13 }} />,
  },

  // User Statuses
  USER_ACTIVE: {
    label: 'Активен',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  USER_BLOCKED: {
    label: 'Заблокирован',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <CancelIcon sx={{ fontSize: 13 }} />,
  },
  USER_INACTIVE: {
    label: 'Неактивен',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <CancelIcon sx={{ fontSize: 13 }} />,
  },

  // SRM / Jira Issue Statuses
  OPEN: {
    label: 'Открыто',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <ErrorOutlineIcon sx={{ fontSize: 13 }} />,
  },
  RESOLVED: {
    label: 'Решено',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  CLOSED: {
    label: 'Закрыто',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },

  // Integration Statuses
  SUCCESS: {
    label: 'ОК',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  OK: {
    label: 'ОК',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  ERROR: {
    label: 'Ошибка',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <ErrorOutlineIcon sx={{ fontSize: 13 }} />,
  },
  WAITING: {
    label: 'Ожидание',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },

  // Priorities
  EMERGENCY: {
    label: 'Критический',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <PriorityHighIcon sx={{ fontSize: 13 }} />,
  },
  HIGHEST: {
    label: 'Высочайший',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <PriorityHighIcon sx={{ fontSize: 13 }} />,
  },
  HIGH: {
    label: 'Высокий',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <PriorityHighIcon sx={{ fontSize: 13 }} />,
  },
  MEDIUM: {
    label: 'Средний',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },
  LOW: {
    label: 'Низкий',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <HelpOutlineIcon sx={{ fontSize: 13 }} />,
  },

  // Feedback & Bug Hub Statuses
  CRITICAL: {
    label: 'Критический',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <PriorityHighIcon sx={{ fontSize: 13 }} />,
  },
  NEW: {
    label: 'Новое',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <AddCircleOutlineIcon sx={{ fontSize: 13 }} />,
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
    bg: 'action.hover',
    border: 'divider',
    icon: <HelpOutlineIcon sx={{ fontSize: 13 }} />,
  },
  BUG: {
    label: 'Ошибка / Баг',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <ErrorOutlineIcon sx={{ fontSize: 13 }} />,
  },
  FEATURE_REQUEST: {
    label: 'Улучшение',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <BuildCircleIcon sx={{ fontSize: 13 }} />,
  },
  REQUIRED: {
    label: 'Обязательно',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <PriorityHighIcon sx={{ fontSize: 13 }} />,
  },
  READY: {
    label: 'Готово к отправке',
    color: 'success.dark',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  QUESTION: {
    label: 'Вопрос',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: '#ddd6fe',
    icon: <HelpOutlineIcon sx={{ fontSize: 13 }} />,
  },

  // Russian equipment statuses & aliases
  IN_SERVICE: {
    label: 'В работе',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  IN_REPAIR: {
    label: 'В ремонте',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <BuildCircleIcon sx={{ fontSize: 13 }} />,
  },
  PRESERVATION: {
    label: 'Консервация',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  DECOMMISSIONING: {
    label: 'Списание',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <CancelIcon sx={{ fontSize: 13 }} />,
  },

  // Maintenance Periodicity
  DAILY: {
    label: 'Ежедневно',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <EventIcon sx={{ fontSize: 13 }} />,
  },
  WEEKLY: {
    label: 'Еженедельно',
    color: 'secondary.main',
    bg: '#f0fdfa',
    border: 'secondary.light',
    icon: <EventIcon sx={{ fontSize: 13 }} />,
  },
  MONTHLY: {
    label: 'Ежемесячно',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <EventIcon sx={{ fontSize: 13 }} />,
  },
  QUARTERLY: {
    label: 'Ежеквартально',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <EventIcon sx={{ fontSize: 13 }} />,
  },
  SEMI_ANNUAL: {
    label: 'Раз в полгода',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <EventIcon sx={{ fontSize: 13 }} />,
  },
  ANNUAL: {
    label: 'Ежегодно',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <EventIcon sx={{ fontSize: 13 }} />,
  },

  // Inventory Discrepancy & Stock
  SURPLUS: {
    label: 'Излишек (+)',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <AddCircleOutlineIcon sx={{ fontSize: 13 }} />,
  },
  DEFICIT: {
    label: 'Недостача (-)',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <WarningAmberIcon sx={{ fontSize: 13 }} />,
  },
  MATCH: {
    label: 'Без расхождений',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  IN_STOCK: {
    label: 'В наличии',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  OUT_OF_STOCK: {
    label: 'Нет в наличии',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <CancelIcon sx={{ fontSize: 13 }} />,
  },

  // Roles & System
  SYSTEM: {
    label: 'Системная',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },
  ADMIN: {
    label: 'Администратор',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  USER: {
    label: 'Пользователь',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },

  // Document Types
  PASSPORT: {
    label: 'Тех. паспорт',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  MANUAL: {
    label: 'Руководство',
    color: 'secondary.main',
    bg: '#f0fdfa',
    border: 'secondary.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  SCHEMA: {
    label: 'Схема / Чертеж',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  ACT: {
    label: 'Акт',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  CERTIFICATE: {
    label: 'Сертификат',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  OTHER: {
    label: 'Прочее',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <HelpOutlineIcon sx={{ fontSize: 13 }} />,
  },

  // Field Types
  TEXT: {
    label: 'Текст',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <EditOutlinedIcon sx={{ fontSize: 13 }} />,
  },
  TEXTAREA: {
    label: 'Многострочный текст',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <EditOutlinedIcon sx={{ fontSize: 13 }} />,
  },
  NUMBER: {
    label: 'Число',
    color: 'secondary.main',
    bg: '#f0fdfa',
    border: 'secondary.light',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },
  DATE: {
    label: 'Дата',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <EventIcon sx={{ fontSize: 13 }} />,
  },
  SELECT: {
    label: 'Список',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },
  BOOLEAN: {
    label: 'Да/Нет',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },

  // Entity Types in Audit & System
  EQUIPMENT: {
    label: 'Оборудование',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  EQUIPMENT_APPROVAL: {
    label: 'Согласование',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },
  EQUIPMENTAPPROVAL: {
    label: 'Согласование',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },
  EQUIPMENT_DOCUMENT: {
    label: 'Документ / Чертеж',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  EQUIPMENTDOCUMENT: {
    label: 'Документ / Чертеж',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  DOCUMENT: {
    label: 'Документ',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  PHOTO: {
    label: 'Фотография',
    color: 'secondary.main',
    bg: '#f0fdfa',
    border: 'secondary.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  CUSTOM_FIELD: {
    label: 'Тех. параметр',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },
  CUSTOMFIELD: {
    label: 'Тех. параметр',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },
  EQUIPMENT_CUSTOM_SECTION: {
    label: 'Раздел параметров',
    color: 'text.secondary',
    bg: 'action.hover',
    border: 'divider',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },
  EQUIPMENTCUSTOMSECTION: {
    label: 'Раздел параметров',
    color: 'text.secondary',
    bg: 'action.hover',
    border: 'divider',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },
  SPARE_PART: {
    label: 'Запчасть / ТМЦ',
    color: 'secondary.main',
    bg: '#f0fdfa',
    border: 'secondary.light',
    icon: <BuildCircleIcon sx={{ fontSize: 13 }} />,
  },
  SPAREPART: {
    label: 'Запчасть / ТМЦ',
    color: 'secondary.main',
    bg: '#f0fdfa',
    border: 'secondary.light',
    icon: <BuildCircleIcon sx={{ fontSize: 13 }} />,
  },
  WAREHOUSE: {
    label: 'Склад',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  WAREHOUSE_ZONE: {
    label: 'Зона склада',
    color: 'secondary.main',
    bg: '#f0fdfa',
    border: 'secondary.light',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  WAREHOUSEZONE: {
    label: 'Зона склада',
    color: 'secondary.main',
    bg: '#f0fdfa',
    border: 'secondary.light',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  WAREHOUSE_CELL: {
    label: 'Ячейка склада',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  WAREHOUSECELL: {
    label: 'Ячейка склада',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  APPROVAL: {
    label: 'Согласование',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },
  MAINTENANCE: {
    label: 'ТО и Ремонт',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <BuildCircleIcon sx={{ fontSize: 13 }} />,
  },
  USER_ACCOUNT: {
    label: 'Пользователь',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <PersonIcon sx={{ fontSize: 13 }} />,
  },
  SYSTEM_SETTING: {
    label: 'Параметр системы',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },
  SYSTEMSETTING: {
    label: 'Параметр системы',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },
  SYSTEM_MODULE: {
    label: 'Системный модуль',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },
  SYSTEMMODULE: {
    label: 'Системный модуль',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },
  SETTING: {
    label: 'Параметр системы',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },
  MODULE: {
    label: 'Системный модуль',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },
  USER_ROLE: {
    label: 'Роль пользователя',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <PersonIcon sx={{ fontSize: 13 }} />,
  },
  USERROLE: {
    label: 'Роль пользователя',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <PersonIcon sx={{ fontSize: 13 }} />,
  },
  ROLE_PERMISSION: {
    label: 'Право роли',
    color: 'secondary.main',
    bg: '#f0fdfa',
    border: 'secondary.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  ROLEPERMISSION: {
    label: 'Право роли',
    color: 'secondary.main',
    bg: '#f0fdfa',
    border: 'secondary.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  STOCK_OPERATION: {
    label: 'Складская операция',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  STOCKOPERATION: {
    label: 'Складская операция',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  STOCK_ITEM: {
    label: 'ТМЦ на складе',
    color: 'secondary.main',
    bg: '#f0fdfa',
    border: 'secondary.light',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  STOCKITEM: {
    label: 'ТМЦ на складе',
    color: 'secondary.main',
    bg: '#f0fdfa',
    border: 'secondary.light',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  INVENTORY_AUDIT: {
    label: 'Инвентаризация',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  INVENTORYAUDIT: {
    label: 'Инвентаризация',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  NOMENCLATURE: {
    label: 'Номенклатура',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  NOMENCLATURE_CATEGORY: {
    label: 'Категория ТМЦ',
    color: 'secondary.main',
    bg: '#f0fdfa',
    border: 'secondary.light',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  NOMENCLATURECATEGORY: {
    label: 'Категория ТМЦ',
    color: 'secondary.main',
    bg: '#f0fdfa',
    border: 'secondary.light',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  MRO_PLAN: {
    label: 'План ТО',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <EventIcon sx={{ fontSize: 13 }} />,
  },
  MROPLAN: {
    label: 'План ТО',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <EventIcon sx={{ fontSize: 13 }} />,
  },
  MRO_SCHEDULE: {
    label: 'График ТО',
    color: 'secondary.main',
    bg: '#f0fdfa',
    border: 'secondary.light',
    icon: <EventIcon sx={{ fontSize: 13 }} />,
  },
  MROSCHEDULE: {
    label: 'График ТО',
    color: 'secondary.main',
    bg: '#f0fdfa',
    border: 'secondary.light',
    icon: <EventIcon sx={{ fontSize: 13 }} />,
  },
  MRO_CHECKLIST: {
    label: 'Чек-лист ТО',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  MROCHECKLIST: {
    label: 'Чек-лист ТО',
    color: 'secondary.main',
    bg: 'secondary.light',
    border: 'secondary.light',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  SRM_INTEGRATION: {
    label: 'Интеграция SRM',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },
  SRMINTEGRATION: {
    label: 'Интеграция SRM',
    color: 'primary.main',
    bg: 'info.light',
    border: 'primary.light',
    icon: <TuneIcon sx={{ fontSize: 13 }} />,
  },
  SRM_ISSUE: {
    label: 'Заявка SRM',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <ErrorOutlineIcon sx={{ fontSize: 13 }} />,
  },
  SRMISSUE: {
    label: 'Заявка SRM',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <ErrorOutlineIcon sx={{ fontSize: 13 }} />,
  },

  // Import Validation
  NEW_RECORD: {
    label: 'Новая запись',
    color: 'success.main',
    bg: 'success.light',
    border: 'success.light',
    icon: <AddCircleOutlineIcon sx={{ fontSize: 13 }} />,
  },
  COLLISION: {
    label: 'Коллизия',
    color: 'warning.main',
    bg: 'warning.light',
    border: 'warning.light',
    icon: <WarningAmberIcon sx={{ fontSize: 13 }} />,
  },
  VALIDATION_ERROR: {
    label: 'Ошибка валидации',
    color: 'error.main',
    bg: 'error.light',
    border: 'error.light',
    icon: <ErrorOutlineIcon sx={{ fontSize: 13 }} />,
  },
};

export function StatusBadge({
  status,
  label,
  variant = 'subtle',
  size = 'small',
  showIcon = true,
  tooltip,
  className,
  customColor,
  customBg,
  customBorder,
  customIcon,
  customConfig,
}: StatusBadgeProps) {
  const rawKey = status || '';
  const camelSplitKey = rawKey.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase().trim().replace(/[\s-]+/g, '_');
  const upperKey = rawKey.toUpperCase().trim().replace(/[\s-]+/g, '_');
  const baseConfig = STATUS_CONFIG_MAP[camelSplitKey] || STATUS_CONFIG_MAP[upperKey] || {
    label: label || status || '—',
    color: 'text.secondary',
    bg: 'background.default',
    border: 'divider',
    icon: <HelpOutlineIcon sx={{ fontSize: 13 }} />,
  };

  const config: StatusTheme = {
    label: customConfig?.label || label || baseConfig.label,
    color: customColor || customConfig?.color || baseConfig.color,
    bg: customBg || customConfig?.bg || (customColor ? `${customColor}14` : baseConfig.bg),
    border: customBorder || customConfig?.border || (customColor ? `${customColor}40` : baseConfig.border),
    icon: customIcon || customConfig?.icon || baseConfig.icon,
  };

  const displayText = config.label;

  const content = (
    <Box
      component="span"
      className={className}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.8,
        px: size === 'small' ? 1.25 : 1.5,
        py: size === 'small' ? 0.35 : 0.5,
        borderRadius: '20px',
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: '0.01em',
        fontFeatureSettings: '"tnum"',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        transition: 'all 0.15s ease',
        backgroundColor: config.bg,
        color: config.color,
        ...(variant === 'subtle' && {
          border: `1px solid ${config.border}`,
        }),
        ...(variant === 'dot' && {
          backgroundColor: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`,
        }),
        ...(variant === 'outlined' && {
          backgroundColor: 'transparent',
          color: config.color,
          border: `1px solid ${config.color}`,
        }),
        ...(variant === 'solid' && {
          backgroundColor: config.color,
          color: 'background.paper',
          border: 'none',
        }),
      }}
    >
      {/* Status Dot Indicator */}
      <Box
        component="span"
        sx={{
          width: size === 'small' ? 6 : 7,
          height: size === 'small' ? 6 : 7,
          borderRadius: '50%',
          backgroundColor: variant === 'solid' ? 'background.paper' : config.color,
          flexShrink: 0,
        }}
      />

      <Typography
        component="span"
        sx={{
          fontSize: 'inherit',
          fontWeight: 'inherit',
          color: 'inherit',
          lineHeight: 'inherit',
        }}
      >
        {displayText}
      </Typography>
    </Box>
  );

  if (tooltip) {
    return <Tooltip title={tooltip} arrow>{content}</Tooltip>;
  }

  return content;
}


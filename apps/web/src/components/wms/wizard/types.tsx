import React from 'react';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import PersonIcon from '@mui/icons-material/Person';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';

export type OperationType = 'RECEIPT' | 'ISSUE_EMPLOYEE' | 'ISSUE_WRITE_OFF' | 'TRANSFER';

export interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  responsibleUserId?: string | null;
  responsibleUser?: {
    id: string;
    displayName: string;
    ldapLogin: string;
  } | null;
}

export interface EquipmentOption {
  id: string;
  name: string;
  inventoryNumber: string;
  model?: string | null;
  location?: string | null;
}

export interface NomenclatureOption {
  id: string;
  name: string;
  article?: string | null;
  unit: string;
  category?: { name: string } | null;
  isNewAction?: boolean;
}

export interface CategoryOption {
  id: string;
  name: string;
}

export interface StorageCellItem {
  id: string;
  code: string;
  name?: string | null;
}

export interface ZoneWithCells {
  id: string;
  name: string;
  code: string;
  cells: StorageCellItem[];
}

export interface OperationLineItem {
  nomenclatureId: string;
  nomenclatureName: string;
  nomenclatureArticle?: string;
  unit: string;
  quantity: number;
  equipmentId?: string;
  equipmentName?: string;
  writeOffReason?: string;
  cellId?: string | null;
}

export interface WmsOperationWizardDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (operationId: string) => void;
  initialType?: OperationType;
  initialNomenclatureId?: string;
}

export const NOMENCLATURE_TYPES = [
  { id: 'SPARE_PART', label: 'Запчасть', icon: <PrecisionManufacturingIcon sx={{ fontSize: 16 }} />, prefix: 'SP' },
  { id: 'CONSUMABLE', label: 'Расходник', icon: <Inventory2OutlinedIcon sx={{ fontSize: 16 }} />, prefix: 'CS' },
  { id: 'TOOL', label: 'Инструмент', icon: <BuildOutlinedIcon sx={{ fontSize: 16 }} />, prefix: 'TL' },
  { id: 'LUBRICANT', label: 'Масла/ГСМ', icon: <ScienceOutlinedIcon sx={{ fontSize: 16 }} />, prefix: 'LB' },
  { id: 'PPE', label: 'СИЗ', icon: <SecurityOutlinedIcon sx={{ fontSize: 16 }} />, prefix: 'PPE' },
];

export const OPERATION_TYPES = [
  {
    type: 'RECEIPT' as OperationType,
    title: 'Приход ТМЦ',
    description: 'Поступление материалов и запчастей на закрепленный склад',
    icon: <MoveToInboxIcon />,
    color: 'success.main',
    bgcolor: 'rgba(22, 163, 74, 0.08)',
  },
  {
    type: 'ISSUE_EMPLOYEE' as OperationType,
    title: 'Выдача сотруднику',
    description: 'Выдача расходников или инструмента в подотчет',
    icon: <PersonIcon />,
    color: 'info.dark',
    bgcolor: 'rgba(29, 78, 216, 0.08)',
  },
  {
    type: 'ISSUE_WRITE_OFF' as OperationType,
    title: 'Списание ТМЦ',
    description: 'Монтаж на оборудование (ТОиР), списание в брак, неликвид или утилизация',
    icon: <DeleteSweepIcon />,
    color: 'warning.main',
    bgcolor: 'rgba(217, 119, 6, 0.08)',
  },
  {
    type: 'TRANSFER' as OperationType,
    title: 'Межскладское перемещение',
    description: 'Трансфер с закрепленного склада на другой склад',
    icon: <SwapHorizIcon />,
    color: 'secondary.main',
    bgcolor: 'rgba(124, 58, 237, 0.08)',
  },
];

export function getOperationSummaryLabel(
  operationType: OperationType,
  lineItems: OperationLineItem[],
  fallbackTitle: string
): string {
  if (operationType === 'ISSUE_WRITE_OFF') {
    const reasons = new Set(lineItems.map((i) => i.writeOffReason).filter(Boolean));
    const hasEq = lineItems.some((i) => i.equipmentName);
    if (hasEq) return 'Списание на оборудование';
    if (reasons.has('Списание в брак / дефект')) return 'Списание в брак / дефект';
    if (reasons.has('Списание в неликвид')) return 'Списание в неликвид';
    if (reasons.has('Утилизация / износ')) return 'Списание на утилизацию';
    return 'Списание ТМЦ';
  }
  return fallbackTitle;
}

export function getCurrentOpBannerTitle(
  operationType: OperationType,
  itemWriteOffType: 'EQUIPMENT' | 'DEFECT' | 'SCRAP' | 'OTHER',
  fallbackTitle: string
): string {
  if (operationType === 'ISSUE_WRITE_OFF') {
    if (itemWriteOffType === 'DEFECT') return 'Списание ТМЦ (Брак / Дефект)';
    if (itemWriteOffType === 'SCRAP') return 'Списание ТМЦ (Неликвид)';
    if (itemWriteOffType === 'OTHER') return 'Списание ТМЦ (Утилизация / Износ)';
    return 'Списание ТМЦ (Установка на оборудование)';
  }
  return fallbackTitle;
}

import React from 'react';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';

export const SKU_RANDOM_BASE = Number('1000');
export const SKU_RANDOM_RANGE = Number('9000');
export const FONT_WEIGHT_BOLD = Number('700');
export const FONT_WEIGHT_SEMI = Number('600');
export const FONT_WEIGHT_NORMAL = Number('500');
export const PLACEHOLDER_SKU = 'SKU-SAMPLE-CODE';
export const PLACEHOLDER_NAME = 'например, Подшипник радиальный шариковый';

export interface CategoryOption {
  id: string;
  name: string;
}

export interface StorageCellOption {
  id: string;
  code: string;
  name?: string | null;
  zoneName?: string;
}

export interface CreatedNomenclatureResult {
  id: string;
  name: string;
  article?: string | null;
  unit: string;
  category?: { name: string } | null;
  initialQuantity?: number;
  initialCellId?: string | null;
}

export interface NomenclatureTypeItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  prefix: string;
}

export const NOMENCLATURE_TYPES: NomenclatureTypeItem[] = [
  { id: 'SPARE_PART', label: 'Запчасть', icon: <PrecisionManufacturingIcon sx={{ fontSize: 18 }} />, prefix: 'SP' },
  { id: 'CONSUMABLE', label: 'Расходник', icon: <Inventory2OutlinedIcon sx={{ fontSize: 18 }} />, prefix: 'CS' },
  { id: 'TOOL', label: 'Инструмент', icon: <BuildOutlinedIcon sx={{ fontSize: 18 }} />, prefix: 'TL' },
  { id: 'LUBRICANT', label: 'Масла/ГСМ', icon: <ScienceOutlinedIcon sx={{ fontSize: 18 }} />, prefix: 'LB' },
  { id: 'PPE', label: 'СИЗ', icon: <SecurityOutlinedIcon sx={{ fontSize: 18 }} />, prefix: 'PPE' },
];

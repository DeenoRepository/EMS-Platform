'use client';

import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import DataObjectIcon from '@mui/icons-material/DataObject';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

export type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'json';

export interface ExportButtonProps {
  onExport: (format: ExportFormat) => void | Promise<void>;
  formats?: ExportFormat[];
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'inherit' | 'success' | 'info' | 'warning';
  className?: string;
}

const FORMAT_CONFIG: Record<ExportFormat, { label: string; subLabel: string; icon: React.ReactNode }> = {
  xlsx: {
    label: 'Excel (.xlsx)',
    subLabel: 'Таблица с форматированием',
    icon: <TableChartOutlinedIcon fontSize="small" sx={{ color: '#16a34a' }} />,
  },
  csv: {
    label: 'CSV (.csv)',
    subLabel: 'Текстовый формат с разделителями',
    icon: <DescriptionOutlinedIcon fontSize="small" sx={{ color: '#0284c7' }} />,
  },
  pdf: {
    label: 'PDF (.pdf)',
    subLabel: 'Печатный документ для отчёта',
    icon: <PictureAsPdfOutlinedIcon fontSize="small" sx={{ color: '#dc2626' }} />,
  },
  json: {
    label: 'JSON (.json)',
    subLabel: 'Машиночитаемый формат данных',
    icon: <DataObjectIcon fontSize="small" sx={{ color: '#8b5cf6' }} />,
  },
};

export function ExportButton({
  onExport,
  formats = ['xlsx', 'csv'],
  loading = false,
  disabled = false,
  label = 'Экспорт',
  size = 'medium',
  variant = 'outlined',
  color = 'primary',
  className,
}: ExportButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // If only 1 format, direct click without menu
  if (formats.length === 1) {
    return (
      <Button
        className={className}
        variant={variant}
        size={size}
        color={color}
        disabled={disabled || loading}
        startIcon={loading ? <CircularProgress size={15} color="inherit" /> : <FileDownloadOutlinedIcon />}
        onClick={() => onExport(formats[0])}
        sx={{
          fontWeight: 600,
          borderRadius: '8px',
          height: 36,
          minHeight: 36,
        }}
      >
        {label}
      </Button>
    );
  }

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectFormat = (format: ExportFormat) => {
    handleClose();
    onExport(format);
  };

  return (
    <>
      <Button
        className={className}
        variant={variant}
        size={size}
        color={color}
        disabled={disabled || loading}
        startIcon={loading ? <CircularProgress size={15} color="inherit" /> : <FileDownloadOutlinedIcon />}
        endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 18 }} />}
        onClick={handleClick}
        aria-controls={Boolean(anchorEl) ? 'export-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
        sx={{
          fontWeight: 600,
          borderRadius: '8px',
          height: 36,
          minHeight: 36,
        }}
      >
        {label}
      </Button>

      <Menu
        id="export-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'export-button',
          dense: true,
        }}
        PaperProps={{
          sx: {
            minWidth: 220,
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1)',
            mt: 0.5,
          },
        }}
      >
        {formats.map((fmt) => {
          const cfg = FORMAT_CONFIG[fmt];
          return (
            <MenuItem key={fmt} onClick={() => handleSelectFormat(fmt)} sx={{ py: 1, px: 1.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>{cfg.icon}</ListItemIcon>
              <ListItemText
                primary={cfg.label}
                secondary={cfg.subLabel}
                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.8125rem', color: '#0f172a' }}
                secondaryTypographyProps={{ fontSize: '0.6875rem', color: '#64748b' }}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

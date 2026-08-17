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
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import TableChartIcon from '@mui/icons-material/TableChart';
import DescriptionIcon from '@mui/icons-material/Description';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

export type ExportFormat = 'xlsx' | 'csv' | 'pdf';

export interface ExportButtonProps {
  onExport: (format: ExportFormat) => void | Promise<void>;
  formats?: ExportFormat[];
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  size?: 'small' | 'medium';
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'inherit' | 'success' | 'info' | 'warning';
  className?: string;
}

const FORMAT_CONFIG: Record<ExportFormat, { label: string; subLabel: string; icon: React.ReactNode }> = {
  xlsx: {
    label: 'Excel (.xlsx)',
    subLabel: 'Таблица с форматированием',
    icon: <TableChartIcon fontSize="small" sx={{ color: '#16a34a' }} />,
  },
  csv: {
    label: 'CSV (.csv)',
    subLabel: 'Текстовый формат с разделителями',
    icon: <DescriptionIcon fontSize="small" sx={{ color: '#0284c7' }} />,
  },
  pdf: {
    label: 'PDF (.pdf)',
    subLabel: 'Печатный документ для отчёта',
    icon: <PictureAsPdfIcon fontSize="small" sx={{ color: '#dc2626' }} />,
  },
};

export function ExportButton({
  onExport,
  formats = ['xlsx', 'csv'],
  loading = false,
  disabled = false,
  label = 'Экспорт',
  size = 'small',
  variant = 'outlined',
  color = 'inherit',
  className,
}: ExportButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // If only 1 format, direct click without menu
  if (formats.length === 1) {
    return (
      <Button
        className={className}
        variant={variant}
        color={color}
        size={size}
        disabled={disabled || loading}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <FileDownloadIcon />}
        onClick={() => onExport(formats[0])}
        sx={{ fontWeight: 600 }}
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
        color={color}
        size={size}
        disabled={disabled || loading}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <FileDownloadIcon />}
        endIcon={<KeyboardArrowDownIcon fontSize="small" />}
        onClick={handleClick}
        aria-controls={Boolean(anchorEl) ? 'export-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
        sx={{ fontWeight: 600 }}
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
          sx: { minWidth: 200, borderRadius: 2, mt: 0.5 },
        }}
      >
        {formats.map((fmt) => {
          const cfg = FORMAT_CONFIG[fmt];
          return (
            <MenuItem key={fmt} onClick={() => handleSelectFormat(fmt)}>
              <ListItemIcon>{cfg.icon}</ListItemIcon>
              <ListItemText
                primary={cfg.label}
                secondary={cfg.subLabel}
                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.8125rem' }}
                secondaryTypographyProps={{ fontSize: '0.7rem' }}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

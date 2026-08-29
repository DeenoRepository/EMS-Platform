'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tooltip,
  Button,
  Menu,
  MenuItem,
  Checkbox,
  Divider,
} from '@mui/material';
import ViewWeekOutlinedIcon from '@mui/icons-material/ViewWeekOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

export interface TableColumnOption {
  id: string;
  label: string;
  defaultVisible?: boolean;
  required?: boolean;
}

export interface ColumnSelectorProps {
  columns: TableColumnOption[];
  visibleColumns: string[];
  onToggle: (colId: string) => void;
  onSelectAll: () => void;
  onReset: () => void;
}

export function ColumnSelector({
  columns,
  visibleColumns,
  onToggle,
  onSelectAll,
  onReset,
}: ColumnSelectorProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isOpen = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Настройка видимости колонок">
        <Button
          size="small"
          variant="outlined"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          startIcon={<ViewWeekOutlinedIcon sx={{ fontSize: 16 }} />}
          sx={{
            height: 36,
            borderRadius: '8px',
            borderColor: 'divider',
            color: 'text.secondary',
            backgroundColor: 'background.paper',
            fontSize: '0.75rem',
            fontWeight: 600,
            '&:hover': {
              borderColor: 'text.disabled',
              backgroundColor: 'action.hover',
            },
          }}
        >
          Колонки {visibleColumns.length < columns.length && `(${visibleColumns.length}/${columns.length})`}
        </Button>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={isOpen}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: {
            minWidth: 280,
            maxWidth: 360,
            maxHeight: 440,
            borderRadius: '10px',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
            p: 0.5,
            overflowX: 'hidden',
          },
        }}
      >
        <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.8125rem', color: 'text.primary' }}>
            Колонки таблицы
          </Typography>
          <Button
            size="small"
            onClick={onReset}
            startIcon={<RestartAltIcon sx={{ fontSize: 13 }} />}
            sx={{ fontSize: '0.6875rem', p: 0, minWidth: 'auto', color: 'text.secondary' }}
          >
            Сброс
          </Button>
        </Box>
        <Divider sx={{ my: 0.5, borderColor: 'divider' }} />
        <Box sx={{ maxHeight: 290, overflowY: 'auto', overflowX: 'hidden' }}>
          {columns.map((col) => {
            const isChecked = visibleColumns.includes(col.id);
            return (
              <MenuItem
                key={col.id}
                onClick={() => onToggle(col.id)}
                sx={{
                  py: 0.6,
                  px: 1.25,
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  whiteSpace: 'normal',
                }}
              >
                <Checkbox size="small" checked={isChecked} sx={{ p: 0.5, mr: 1, flexShrink: 0 }} />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.8125rem',
                    fontWeight: isChecked ? 600 : 400,
                    color: isChecked ? 'text.primary' : 'text.secondary',
                    lineHeight: 1.3,
                  }}
                >
                  {col.label}
                </Typography>
              </MenuItem>
            );
          })}
        </Box>
        <Divider sx={{ my: 0.5, borderColor: 'divider' }} />
        <Box sx={{ px: 1, pt: 0.5, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            size="small"
            onClick={onSelectAll}
            sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'primary.main' }}
          >
            Показать все
          </Button>
          <Button
            size="small"
            onClick={() => setAnchorEl(null)}
            variant="contained"
            color="primary"
            sx={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              borderRadius: '6px',
              py: 0.35,
              px: 1.75,
            }}
          >
            Готово
          </Button>
        </Box>
      </Menu>
    </>
  );
}

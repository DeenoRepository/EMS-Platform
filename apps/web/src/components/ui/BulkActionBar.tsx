'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Chip,
  Stack,
  Slide,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';

export interface BulkActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  variant?: 'contained' | 'outlined' | 'text';
  disabled?: boolean;
}

export interface BulkActionBarProps {
  /** Number of selected items */
  selectedCount: number;
  /** Total count of items available */
  totalCount?: number;
  /** Clear selection callback */
  onClearSelection: () => void;
  /** List of bulk actions */
  actions: BulkActionItem[];
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onClearSelection,
  actions,
  className,
}: BulkActionBarProps) {
  const isOpen = selectedCount > 0;

  return (
    <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%) !important',
          zIndex: 1300,
          width: 'calc(100% - 48px)',
          maxWidth: 820,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        className={className}
      >
        <Paper
          elevation={8}
          sx={{
            p: 1.5,
            px: 2.5,
            borderRadius: 3,
            bgcolor: '#0f172a',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
          }}
        >
          {/* Selected count info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: 'rgba(2, 132, 199, 0.2)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckBoxOutlinedIcon sx={{ fontSize: 18 }} />
            </Box>

            <Typography variant="body2" fontWeight={600} sx={{ color: '#f8fafc', fontSize: '0.875rem' }}>
              Выбрано: <b>{selectedCount}</b>
              {totalCount !== undefined && (
                <Typography component="span" sx={{ color: '#94a3b8', ml: 0.5, fontSize: '0.8125rem' }}>
                  из {totalCount}
                </Typography>
              )}
            </Typography>

            <IconButton
              size="small"
              onClick={onClearSelection}
              sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' }, ml: 0.5 }}
              title="Снять выделение"
              aria-label="Снять выделение со всех строк"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Action buttons */}
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {actions.map((act, idx) => (
              <Button
                key={idx}
                size="small"
                variant={act.variant || 'contained'}
                color={act.color || 'primary'}
                startIcon={act.icon}
                onClick={act.onClick}
                disabled={act.disabled}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                  borderRadius: 1.5,
                  px: 1.75,
                }}
              >
                {act.label}
              </Button>
            ))}
          </Stack>
        </Paper>
      </Box>
    </Slide>
  );
}

export default BulkActionBar;

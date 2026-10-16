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
          bottom: { xs: 16, sm: 24 },
          left: '50%',
          transform: 'translateX(-50%) !important',
          zIndex: 1300,
          width: 'auto',
          maxWidth: { xs: 'calc(100% - 32px)', md: 'max-content' },
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        className={className}
      >
        <Paper
          elevation={8}
          sx={{
            p: 1,
            px: 2,
            borderRadius: '12px',
            bgcolor: '#0f172a',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 16px 36px rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            overflowX: { xs: 'auto', sm: 'visible' },
          }}
        >
          {/* Selected count info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0, whiteSpace: 'nowrap' }}>
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                bgcolor: 'rgba(2, 132, 199, 0.2)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckBoxOutlinedIcon sx={{ fontSize: 16 }} />
            </Box>

            <Typography variant="body2" fontWeight={600} sx={{ color: '#f8fafc', fontSize: '0.8125rem' }}>
              Выбрано: <b>{selectedCount}</b>
              {totalCount !== undefined && (
                <Typography component="span" sx={{ color: '#94a3b8', ml: 0.5, fontSize: '0.75rem' }}>
                  из {totalCount}
                </Typography>
              )}
            </Typography>

            <IconButton
              size="small"
              onClick={onClearSelection}
              sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' }, ml: 0.5, p: 0.25 }}
              title="Снять выделение"
              aria-label="Снять выделение со всех строк"
            >
              <CloseIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Box>

          {/* Action buttons */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              flexWrap: 'nowrap',
              alignItems: 'center',
              overflowX: { xs: 'auto', sm: 'visible' },
              py: 0.25,
            }}
          >
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
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                  borderRadius: '8px',
                  px: 1.5,
                  py: 0.5,
                  minHeight: 32,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  ...(act.variant === 'contained' && act.color === 'primary' && {
                    backgroundColor: 'primary.main',
                    '&:hover': { backgroundColor: 'primary.dark' },
                  }),
                  ...(act.variant === 'contained' && act.color === 'warning' && {
                    backgroundColor: 'warning.main',
                    color: 'warning.contrastText',
                    '&:hover': { backgroundColor: 'warning.dark' },
                  }),
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

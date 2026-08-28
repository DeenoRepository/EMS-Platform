'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Stack,
  Slide,
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
            p: 1.25,
            px: 2,
            borderRadius: '10px',
            bgcolor: 'grey.900',
            color: 'common.white',
            border: '1px solid',
            borderColor: 'rgba(255, 255, 255, 0.12)',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.35)',
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
                width: 26,
                height: 26,
                borderRadius: '50%',
                bgcolor: 'primary.dark',
                color: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckBoxOutlinedIcon sx={{ fontSize: 16 }} />
            </Box>

            <Typography variant="body2" fontWeight={600} sx={{ color: 'common.white', fontSize: '0.8125rem' }}>
              Выбрано: <b>{selectedCount}</b>
              {totalCount !== undefined && (
                <Typography component="span" sx={{ color: 'grey.400', ml: 0.5, fontSize: '0.75rem' }}>
                  из {totalCount}
                </Typography>
              )}
            </Typography>

            <IconButton
              size="small"
              onClick={onClearSelection}
              sx={{ color: 'grey.400', '&:hover': { color: 'common.white' }, ml: 0.5, p: 0.25 }}
              title="Снять выделение"
              aria-label="Снять выделение со всех строк"
            >
              <CloseIcon sx={{ fontSize: 15 }} />
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
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                  borderRadius: '8px',
                  px: 1.75,
                  py: 0.5,
                  minHeight: 32,
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

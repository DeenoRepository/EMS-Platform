'use client';

import React from 'react';
import { Box, Paper, Stack, Button, Chip, Typography, Divider } from '@mui/material';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

export interface FilterToolbarProps {
  children: React.ReactNode;
  activeFilterCount?: number;
  onResetFilters?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function FilterToolbar({
  children,
  activeFilterCount = 0,
  onResetFilters,
  actions,
  className,
}: FilterToolbarProps) {
  return (
    <Paper
      elevation={0}
      className={className}
      sx={{
        p: 1.75,
        mb: 2.5,
        borderRadius: '10px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: { xs: 'stretch', lg: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        {/* Controls Container */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.25,
            flexGrow: 1,
          }}
        >
          {children}

          {/* Reset Filters Button */}
          {activeFilterCount > 0 && onResetFilters && (
            <Button
              size="small"
              variant="text"
              startIcon={<RestartAltIcon sx={{ fontSize: 16 }} />}
              onClick={onResetFilters}
              sx={{
                color: '#64748b',
                fontWeight: 600,
                fontSize: '0.75rem',
                borderRadius: '6px',
                px: 1,
                py: 0.5,
                '&:hover': {
                  color: '#dc2626',
                  backgroundColor: '#fee2e2',
                },
              }}
            >
              Сбросить ({activeFilterCount})
            </Button>
          )}
        </Box>

        {/* Right Actions */}
        {actions && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexShrink: 0,
              justifyContent: { xs: 'flex-start', lg: 'flex-end' },
            }}
          >
            {actions}
          </Box>
        )}
      </Box>
    </Paper>
  );
}

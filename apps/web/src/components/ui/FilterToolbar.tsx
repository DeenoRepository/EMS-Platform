'use client';

import React from 'react';
import { Box, Paper, Button } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

export interface FilterToolbarProps {
  children: React.ReactNode;
  activeFilterCount?: number;
  onResetFilters?: () => void;
  actions?: React.ReactNode;
  variant?: 'standalone' | 'embedded';
  className?: string;
}

export function FilterToolbar({
  children,
  activeFilterCount = 0,
  onResetFilters,
  actions,
  variant = 'standalone',
  className,
}: FilterToolbarProps) {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        alignItems: { xs: 'stretch', lg: 'center' },
        justifyContent: 'space-between',
        gap: 1.5,
        width: '100%',
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
              px: 1.25,
              py: 0.5,
              height: 36,
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
  );

  if (variant === 'embedded') {
    return (
      <Box className={className} sx={{ width: '100%' }}>
        {content}
      </Box>
    );
  }

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
      {content}
    </Paper>
  );
}

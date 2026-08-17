'use client';

import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  LinearProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  statusBadge?: React.ReactNode;
  width?: number | string;
  loading?: boolean;
  headerActions?: React.ReactNode;
  footerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  statusBadge,
  width = 480,
  loading = false,
  headerActions,
  footerActions,
  children,
  className,
}: DetailDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      className={className}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: width },
          maxWidth: '100vw',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderLeft: '1px solid #e2e8f0',
          boxShadow: '-10px 0 30px -10px rgba(15, 23, 42, 0.12)',
        },
      }}
    >
      {loading && (
        <LinearProgress
          sx={{
            height: 2,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        />
      )}

      {/* Header */}
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9',
          bgcolor: '#ffffff',
          gap: 1.5,
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25, flexWrap: 'wrap' }}>
            {typeof title === 'string' ? (
              <Typography
                variant="h6"
                fontWeight={700}
                color="#0f172a"
                sx={{
                  fontSize: { xs: '1rem', sm: '1.125rem' },
                  lineHeight: 1.3,
                  letterSpacing: '-0.015em',
                }}
                noWrap
              >
                {title}
              </Typography>
            ) : (
              title
            )}
            {statusBadge}
          </Box>
          {subtitle && (
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }} noWrap display="block">
              {subtitle}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {headerActions}
          <IconButton
            aria-label="Закрыть панель"
            size="small"
            onClick={onClose}
            sx={{
              color: '#64748b',
              borderRadius: '6px',
              p: 0.5,
              '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          flex: 1,
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: '#cbd5e1',
            borderRadius: 3,
          },
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      {footerActions && (
        <Box
          sx={{
            p: { xs: 2, sm: 2 },
            borderTop: '1px solid #f1f5f9',
            bgcolor: '#ffffff',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1.25,
          }}
        >
          {footerActions}
        </Box>
      )}
    </Drawer>
  );
}

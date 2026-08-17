'use client';

import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  paper?: boolean;
  minHeight?: number | string;
  className?: string;
}

export function EmptyState({
  title = 'Ничего не найдено',
  description = 'Попробуйте изменить параметры поиска или сбросить фильтры',
  icon,
  actionText,
  onAction,
  actionIcon,
  paper = false,
  minHeight = 220,
  className,
}: EmptyStateProps) {
  const defaultIcon = <SearchOffOutlinedIcon sx={{ fontSize: 32, color: '#94a3b8' }} />;

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: { xs: 3, sm: 4 },
        minHeight,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          mb: 1.75,
          color: '#64748b',
        }}
      >
        {icon || defaultIcon}
      </Box>

      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          color: '#0f172a',
          fontSize: '0.9375rem',
          letterSpacing: '-0.01em',
          mb: 0.5,
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          sx={{
            color: '#64748b',
            maxWidth: 400,
            fontSize: '0.8125rem',
            lineHeight: 1.45,
            mb: actionText ? 2.5 : 0,
          }}
        >
          {description}
        </Typography>
      )}

      {actionText && onAction && (
        <Button
          variant="contained"
          size="small"
          startIcon={actionIcon}
          onClick={onAction}
          sx={{
            fontWeight: 600,
            borderRadius: '8px',
            px: 2.25,
            py: 0.75,
            backgroundColor: '#0284c7',
            '&:hover': {
              backgroundColor: '#0369a1',
            },
          }}
        >
          {actionText}
        </Button>
      )}
    </Box>
  );

  if (paper) {
    return (
      <Paper
        elevation={0}
        className={className}
        sx={{
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        }}
      >
        {content}
      </Paper>
    );
  }

  return <Box className={className}>{content}</Box>;
}

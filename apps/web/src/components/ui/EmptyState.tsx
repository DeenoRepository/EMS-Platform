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
  minHeight = 240,
  className,
}: EmptyStateProps) {
  const defaultIcon = <SearchOffOutlinedIcon sx={{ fontSize: 36, color: '#94a3b8' }} />;

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: 4,
        minHeight,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          mb: 2,
        }}
      >
        {icon || defaultIcon}
      </Box>

      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          color: '#1e293b',
          fontSize: '0.9375rem',
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
            maxWidth: 380,
            fontSize: '0.8125rem',
            lineHeight: 1.4,
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
            px: 2,
            py: 0.75,
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
        }}
      >
        {content}
      </Paper>
    );
  }

  return <Box className={className}>{content}</Box>;
}

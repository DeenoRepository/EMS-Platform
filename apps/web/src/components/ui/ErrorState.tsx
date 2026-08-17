'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Collapse,
  IconButton,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Link from 'next/link';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  statusCode?: number | string;
  error?: Error | string;
  onRetry?: () => void;
  onGoHome?: () => void;
  paper?: boolean;
  minHeight?: number | string;
  icon?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title = 'Произошла непредвиденная ошибка',
  description = 'Не удалось загрузить данные или выполнить запрашиваемую операцию. Попробуйте обновить страницу.',
  statusCode,
  error,
  onRetry,
  onGoHome,
  paper = false,
  minHeight = 320,
  icon,
  className,
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : null;
  const errorStack = error instanceof Error ? error.stack : null;

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: { xs: 3, sm: 5 },
        minHeight,
        width: '100%',
      }}
      role="alert"
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: '#fef2f2',
          color: '#dc2626',
          mb: 2.5,
          border: '1px solid #fee2e2',
        }}
      >
        {icon || <ErrorOutlineIcon sx={{ fontSize: 36 }} />}
      </Box>

      {statusCode && (
        <Typography
          variant="h3"
          fontWeight={800}
          color="error.main"
          sx={{ mb: 1, letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}
        >
          {statusCode}
        </Typography>
      )}

      <Typography
        variant="h6"
        fontWeight={700}
        color="text.primary"
        gutterBottom
        sx={{ maxWidth: 500, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 460, mb: 3.5, lineHeight: 1.6 }}
        >
          {description}
        </Typography>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
        {onRetry && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            sx={{ fontWeight: 600, px: 2.5 }}
          >
            Повторить попытку
          </Button>
        )}

        {onGoHome ? (
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<HomeIcon />}
            onClick={onGoHome}
            sx={{ px: 2.5 }}
          >
            На главную
          </Button>
        ) : (
          <Button
            component={Link}
            href="/"
            variant="outlined"
            color="inherit"
            startIcon={<HomeIcon />}
            sx={{ px: 2.5 }}
          >
            На главную
          </Button>
        )}
      </Box>

      {errorMessage && (
        <Box sx={{ mt: 3, width: '100%', maxWidth: 540 }}>
          <Box
            onClick={() => setShowDetails(!showDetails)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              cursor: 'pointer',
              color: 'text.secondary',
              userSelect: 'none',
              '&:hover': { color: 'text.primary' },
            }}
          >
            <Typography variant="caption" fontWeight={600}>
              {showDetails ? 'Скрыть технические детали' : 'Показать технические детали'}
            </Typography>
            <IconButton
              size="small"
              sx={{
                transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                p: 0.25,
              }}
            >
              <ExpandMoreIcon fontSize="inherit" />
            </IconButton>
          </Box>

          <Collapse in={showDetails}>
            <Box
              component="pre"
              sx={{
                mt: 1.5,
                p: 2,
                bgcolor: '#0f172a',
                color: '#f87171',
                borderRadius: 2,
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                textAlign: 'left',
                overflowX: 'auto',
                maxHeight: 200,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {errorMessage}
              {errorStack && `\n\n${errorStack}`}
            </Box>
          </Collapse>
        </Box>
      )}
    </Box>
  );

  if (paper) {
    return (
      <Paper
        className={className}
        variant="outlined"
        sx={{ borderRadius: 2, overflow: 'hidden' }}
      >
        {content}
      </Paper>
    );
  }

  return <Box className={className}>{content}</Box>;
}

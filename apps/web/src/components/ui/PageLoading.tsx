'use client';

import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Skeleton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  ButtonProps,
} from '@mui/material';

export interface PageLoadingProps {
  text?: string;
  minHeight?: number | string;
  size?: number;
  className?: string;
}

export function PageLoading({
  text = 'Загрузка данных...',
  minHeight = '60vh',
  size = 40,
  className,
}: PageLoadingProps) {
  return (
    <Box
      className={className}
      sx={{
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        width: '100%',
        py: 4,
      }}
      role="status"
      aria-label={text}
    >
      <CircularProgress size={size} thickness={4} />
      {text && (
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {text}
        </Typography>
      )}
    </Box>
  );
}

export interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  withHeader?: boolean;
  withPagination?: boolean;
  height?: number;
  className?: string;
}

export function TableSkeleton({
  columns = 5,
  rows = 5,
  withHeader = true,
  withPagination = true,
  height = 40,
  className,
}: TableSkeletonProps) {
  return (
    <Paper className={className} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          {withHeader && (
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                {Array.from({ length: columns }).map((_, idx) => (
                  <TableCell key={idx} sx={{ py: 1.5 }}>
                    <Skeleton variant="text" width={idx === 0 ? '60%' : '80%'} height={24} />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
          )}
          <TableBody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <TableRow key={rowIdx}>
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <TableCell key={colIdx} sx={{ py: 1.5 }}>
                    <Skeleton
                      variant="text"
                      width={
                        colIdx === 0
                          ? `${70 + (rowIdx % 3) * 10}%`
                          : colIdx === columns - 1
                          ? 60
                          : `${50 + (colIdx % 4) * 12}%`
                      }
                      height={height * 0.6}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {withPagination && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            p: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            gap: 2,
          }}
        >
          <Skeleton variant="text" width={120} height={24} />
          <Skeleton variant="rectangular" width={160} height={28} sx={{ borderRadius: 1 }} />
        </Box>
      )}
    </Paper>
  );
}

export interface CardSkeletonProps {
  count?: number;
  columns?: { xs?: number; sm?: number; md?: number; lg?: number };
}

export function CardSkeleton({ count = 4 }: CardSkeletonProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(4, 1fr)',
        },
        gap: 2,
      }}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <Paper key={idx} variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="circular" width={32} height={32} />
          </Box>
          <Skeleton variant="text" width="40%" height={36} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="75%" height={20} />
        </Paper>
      ))}
    </Box>
  );
}

export interface LoadingOverlayProps {
  loading: boolean;
  children: React.ReactNode;
  text?: string;
  blur?: boolean;
  minHeight?: number | string;
}

export function LoadingOverlay({
  loading,
  children,
  text = 'Загрузка...',
  blur = true,
  minHeight,
}: LoadingOverlayProps) {
  return (
    <Box sx={{ position: 'relative', minHeight, width: '100%' }}>
      <Box
        sx={{
          filter: loading && blur ? 'blur(2px)' : 'none',
          pointerEvents: loading ? 'none' : 'auto',
          userSelect: loading ? 'none' : 'auto',
          transition: 'filter 0.2s ease',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {children}
      </Box>

      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(1px)',
            zIndex: 10,
            gap: 1.5,
            borderRadius: 'inherit',
          }}
        >
          <CircularProgress size={36} thickness={4} />
          {text && (
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              {text}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

export function LoadingButton({
  loading = false,
  loadingText,
  children,
  disabled,
  startIcon,
  ...rest
}: LoadingButtonProps) {
  return (
    <Button
      {...rest}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
    >
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}

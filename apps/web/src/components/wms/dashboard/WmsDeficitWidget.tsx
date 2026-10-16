'use client';

import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  Chip,
  Skeleton,
  Stack,
  LinearProgress,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { EmptyState } from '@/components/ui';
import { LowStockItem } from './types';

const MAX_PERCENT = 100;
const CRITICAL_THRESHOLD = 30;
const FONT_SEMI_BOLD = 600;
const FONT_BOLD = 700;
const SKELETON_ITEMS = 3;
const TOP_ITEMS_LIMIT = 5;

function DeficitRow({ item, onNavigate }: { item: LowStockItem; onNavigate: (path: string) => void }) {
  const fillPercent = item.minStock > 0 ? Math.min((item.quantity / item.minStock) * MAX_PERCENT, MAX_PERCENT) : 0;
  const isCritical = fillPercent < CRITICAL_THRESHOLD;

  return (
    <Box
      onClick={() => onNavigate(`/wms/stock?search=${encodeURIComponent(item.name)}`)}
      sx={{
        py: 1.25,
        cursor: 'pointer',
        borderBottom: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.15s ease',
        '&:last-child': { borderBottom: 'none' },
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="body2" fontWeight={FONT_SEMI_BOLD} noWrap sx={{ flex: 1, mr: 1, color: 'text.primary' }}>
          {item.name}
        </Typography>
        <Chip
          label={item.warehouseCode}
          size="small"
          variant="outlined"
          sx={{ height: 18, fontSize: '0.625rem', fontWeight: FONT_SEMI_BOLD, borderRadius: '4px' }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <LinearProgress
            variant="determinate"
            value={fillPercent}
            color={isCritical ? 'error' : 'warning'}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: FONT_BOLD,
            fontFeatureSettings: '"tnum"',
            color: isCritical ? 'error.main' : 'warning.main',
            fontSize: '0.6875rem',
            whiteSpace: 'nowrap',
          }}
        >
          {item.quantity}/{item.minStock} {item.unit}
          {item.inTransitQuantity ? ` (+${item.inTransitQuantity} в пути)` : ''}
        </Typography>
      </Box>
    </Box>
  );
}

interface WmsDeficitWidgetProps {
  items: LowStockItem[];
  lowStockCount: number;
  loading: boolean;
  onNavigate: (path: string) => void;
}

export function WmsDeficitWidget({
  items,
  lowStockCount,
  loading,
  onNavigate,
}: WmsDeficitWidgetProps) {
  return (
    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={FONT_BOLD} color="text.primary">
            Позиции с дефицитом
          </Typography>
          <Button
            size="small"
            onClick={() => onNavigate('/wms/stock?lowStockOnly=true')}
            endIcon={<ArrowForwardIcon sx={{ fontSize: 13 }} />}
            sx={{ fontWeight: FONT_SEMI_BOLD, fontSize: '0.6875rem', textTransform: 'none', px: 1 }}
          >
            Все остатки
          </Button>
        </Box>

        {loading ? (
          <Stack spacing={1}>
            {[...Array(SKELETON_ITEMS)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={44} sx={{ borderRadius: '6px' }} />
            ))}
          </Stack>
        ) : items.length > 0 ? (
          <Box>
            {items.slice(0, TOP_ITEMS_LIMIT).map((item) => (
              <DeficitRow key={item.id} item={item} onNavigate={onNavigate} />
            ))}
            {items.length > TOP_ITEMS_LIMIT && (
              <Button
                fullWidth
                size="small"
                variant="outlined"
                onClick={() => onNavigate('/wms/stock?lowStockOnly=true')}
                sx={{
                  mt: 1.5,
                  fontWeight: FONT_SEMI_BOLD,
                  fontSize: '0.75rem',
                  borderRadius: '8px',
                  textTransform: 'none',
                }}
              >
                Показать все ({lowStockCount})
              </Button>
            )}
          </Box>
        ) : (
          <EmptyState
            icon={<Inventory2OutlinedIcon sx={{ fontSize: 28, color: 'success.main' }} />}
            title="Дефицит отсутствует"
            description="Все позиции в пределах нормативных остатков"
            minHeight={120}
          />
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  IconButton,
  Stack,
  Avatar,
  Grid,
  Button,
} from '@mui/material';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import { StatusBadge } from '@/components/ui';
import { WarehouseItem } from './types';

const FONT_SEMI_BOLD = 600;
const FONT_BOLD = 700;

interface WarehouseCardItemProps {
  warehouse: WarehouseItem;
  canManage: boolean;
  isMyWarehouse: boolean;
  onEdit: (w: WarehouseItem) => void;
  onOpenTopology: (w: WarehouseItem) => void;
}

export function WarehouseCardItem({
  warehouse: w,
  canManage,
  isMyWarehouse,
  onEdit,
  onOpenTopology,
}: WarehouseCardItemProps) {
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 1,
        transition: 'all 0.18s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 2,
          borderColor: 'primary.main',
        },
      }}
    >
      <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                bgcolor: 'action.hover',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <WarehouseOutlinedIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: FONT_BOLD, fontSize: '1rem', color: 'text.primary' }}>
              {w.name}
            </Typography>
          </Box>
          {canManage && (
            <IconButton
              size="small"
              onClick={() => onEdit(w)}
              aria-label={`Редактировать ${w.name}`}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <Chip label={`Код: ${w.code}`} size="small" variant="outlined" sx={{ fontWeight: FONT_BOLD, borderRadius: '4px' }} />
          <StatusBadge status={w.isActive ? 'ACTIVE' : 'DRAFT'} />
        </Stack>

        {/* Responsible Person Widget */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            p: 1.25,
            mb: 1.5,
            bgcolor: isMyWarehouse ? 'action.hover' : 'background.default',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: isMyWarehouse ? 'primary.light' : 'divider',
          }}
        >
          <Avatar
            sx={{
              width: 28,
              height: 28,
              fontSize: '0.75rem',
              fontWeight: FONT_BOLD,
              bgcolor: w.responsibleUser ? 'primary.main' : 'text.disabled',
            }}
          >
            {w.responsibleUser ? w.responsibleUser.displayName.charAt(0) : '?'}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.1 }}>
              Ответственное лицо:
            </Typography>
            <Typography
              variant="body2"
              noWrap
              sx={{
                fontWeight: FONT_SEMI_BOLD,
                fontSize: '0.8125rem',
                color: w.responsibleUser ? 'text.primary' : 'text.disabled',
              }}
            >
              {w.responsibleUser ? w.responsibleUser.displayName : 'Не назначен'}
            </Typography>
          </Box>
          {isMyWarehouse && (
            <Chip
              label="Мой склад"
              size="small"
              color="primary"
              sx={{ height: 20, fontSize: '0.6875rem', fontWeight: FONT_BOLD }}
            />
          )}
        </Box>

        {w.location && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: 'text.secondary' }}>
            <LocationOnOutlinedIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>{w.location}</Typography>
          </Box>
        )}

        <Box sx={{ mt: 'auto', pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Grid container spacing={1} sx={{ mb: 1.5 }}>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Номенклатурных позиций
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: FONT_BOLD, fontFeatureSettings: '"tnum"' }}>
                {w._count.stockItems}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Всего операций
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: FONT_BOLD, fontFeatureSettings: '"tnum"' }}>
                {w._count.operations}
              </Typography>
            </Grid>
          </Grid>

          <Button
            fullWidth
            variant="contained"
            size="small"
            startIcon={<MeetingRoomOutlinedIcon />}
            onClick={() => onOpenTopology(w)}
            aria-label={`Топология и ячейки склада ${w.name}`}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: FONT_SEMI_BOLD,
            }}
          >
            Топология и ячейки
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

interface WarehouseGridCardsProps {
  warehouses: WarehouseItem[];
  canManage: boolean;
  currentUserId?: string;
  onEdit: (w: WarehouseItem) => void;
  onOpenTopology: (w: WarehouseItem) => void;
}

export function WarehouseGridCards({
  warehouses,
  canManage,
  currentUserId,
  onEdit,
  onOpenTopology,
}: WarehouseGridCardsProps) {
  return (
    <Grid container spacing={2.5}>
      {warehouses.map((w) => (
        <Grid item xs={12} sm={6} md={4} key={w.id}>
          <WarehouseCardItem
            warehouse={w}
            canManage={canManage}
            isMyWarehouse={w.responsibleUserId === currentUserId}
            onEdit={onEdit}
            onOpenTopology={onOpenTopology}
          />
        </Grid>
      ))}
    </Grid>
  );
}

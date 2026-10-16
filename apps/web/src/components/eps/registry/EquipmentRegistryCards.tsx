'use client';

import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Tooltip,
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import { StatusBadge } from '@/components/ui';
import { formatDate } from '@ems/shared';
import { checkEquipmentCardCompleteness } from '@/lib/eps-helpers';
import { EquipmentItem } from './types';

interface EquipmentRegistryCardsProps {
  items: EquipmentItem[];
  onRowClick: (eq: EquipmentItem) => void;
}

export function EquipmentRegistryCards({ items, onRowClick }: EquipmentRegistryCardsProps) {
  return (
    <Grid container spacing={2.5}>
      {items.map((eq) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={eq.id}>
          <Card
            role="link"
            tabIndex={0}
            aria-label={`Открыть паспорт оборудования: ${eq.name}`}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: 2,
                borderColor: 'primary.main',
              },
            }}
            onClick={() => onRowClick(eq)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onRowClick(eq);
              }
            }}
          >
            <Box
              sx={{
                height: 140,
                backgroundColor: 'background.default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid',
                borderColor: 'divider',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {eq.primaryPhoto ? (
                <Box
                  component="img"
                  src={`/api/files/${eq.primaryPhoto}`}
                  alt={eq.name}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <PrecisionManufacturingIcon sx={{ fontSize: 54, color: 'text.disabled' }} />
              )}
              {checkEquipmentCardCompleteness(eq).isIncomplete && (
                <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
                  <Tooltip title="В карточке заполнены не все поля">
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: 'warning.light',
                        color: 'warning.dark',
                        boxShadow: 1,
                      }}
                    >
                      <WarningAmberIcon sx={{ fontSize: 16 }} />
                    </Box>
                  </Tooltip>
                </Box>
              )}
              <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                <StatusBadge status={eq.status} />
              </Box>
            </Box>

            <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: 'primary.main',
                    bgcolor: 'action.hover',
                    px: 0.75,
                    py: 0.25,
                    borderRadius: '4px',
                  }}
                >
                  {eq.inventoryNumber || '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {eq.location || '—'}
                </Typography>
              </Box>

              <Typography variant="subtitle2" fontWeight={700} lineHeight={1.3} sx={{ mb: 0.75, color: 'text.primary' }}>
                {eq.name}
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.75rem' }}>
                {eq.manufacturer} {eq.model && `• ${eq.model}`}
              </Typography>

              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2, flexGrow: 1 }}>
                {eq.customFields?.equipment_type && (
                  <Chip
                    label={String(eq.customFields.equipment_type)}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.6875rem', height: 20, borderRadius: '4px' }}
                  />
                )}
                {eq.customFields?.equipment_group && (
                  <Chip
                    label={String(eq.customFields.equipment_group)}
                    size="small"
                    variant="outlined"
                    color="primary"
                    sx={{ fontSize: '0.6875rem', height: 20, borderRadius: '4px' }}
                  />
                )}
              </Box>

              <Box
                sx={{
                  pt: 1.25,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                }}
              >
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Tooltip title="Документов">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      <DescriptionOutlinedIcon sx={{ fontSize: 15 }} />
                      <span>{eq.counts?.documents ?? 0}</span>
                    </Box>
                  </Tooltip>
                  <Tooltip title="Планов ТО">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      <ConstructionOutlinedIcon sx={{ fontSize: 15 }} />
                      <span>{eq.counts?.maintenancePlans ?? 0}</span>
                    </Box>
                  </Tooltip>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontFeatureSettings: '"tnum"' }}>
                  {formatDate(eq.commissionDate)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { StatusBadge } from '@/components/ui';
import type { EquipmentRegistryItem } from './equipment-registry-model';

interface EquipmentGridViewProps {
  items: EquipmentRegistryItem[];
  onItemClick: (item: EquipmentRegistryItem) => void;
}

export const EquipmentGridView: React.FC<EquipmentGridViewProps> = ({
  items,
  onItemClick,
}) => {
  return (
    <Grid container spacing={2.5}>
      {items.map((eq) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={eq.id}>
          <Card
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
                boxShadow: '0 12px 24px -8px rgba(15, 23, 42, 0.12)',
                borderColor: 'primary.main',
              },
            }}
            onClick={() => onItemClick(eq)}
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
                <PrecisionManufacturingIcon sx={{ fontSize: 54, color: 'grey.400' }} />
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
                    backgroundColor: 'rgba(2, 132, 199, 0.08)',
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
                {eq.tags.map((t) => (
                  <Chip
                    key={t.id}
                    label={t.name}
                    size="small"
                    sx={{
                      fontSize: '0.65rem',
                      height: 18,
                      backgroundColor: t.color ? `${t.color}15` : undefined,
                    }}
                  />
                ))}
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  ЗИП: {eq._count?.spareParts ?? eq.counts?.spareParts ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Документы: {eq._count?.documents ?? eq.counts?.documents ?? 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

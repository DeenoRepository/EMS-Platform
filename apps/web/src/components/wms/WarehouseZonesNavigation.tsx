import React from 'react';
import {
  Box,
  Button,
  Chip,
  Paper,
  Tab,
  Tabs,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { StorageZone } from './WarehouseTopologyModal';

export interface WarehouseZonesNavigationProps {
  zones: StorageZone[];
  selectedZoneIndex: number;
  canManageZones: boolean;
  onZoneChange: (index: number) => void;
  onCreateZone: () => void;
}

export function WarehouseZonesNavigation({
  zones,
  selectedZoneIndex,
  canManageZones,
  onZoneChange,
  onCreateZone,
}: WarehouseZonesNavigationProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: '12px',
        border: '1px solid divider',
        bgcolor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Tabs
        value={selectedZoneIndex}
        onChange={(_, value: number) => onZoneChange(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 40,
          '& .MuiTab-root': {
            minHeight: 38,
            py: 0.75,
            px: 2,
            fontSize: '0.8125rem',
            fontWeight: 600,
            borderRadius: '8px',
            textTransform: 'none',
            mr: 1,
            transition: 'all 0.2s ease',
            '&.Mui-selected': {
              bgcolor: 'rgba(2, 132, 199, 0.08)',
              color: 'primary.main',
            },
          },
          '& .MuiTabs-indicator': {
            display: 'none',
          },
        }}
      >
        {zones.map((zone, index) => (
          <Tab
            key={zone.id}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>{zone.name}</span>
                <Chip
                  label={zone.cells.length}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    bgcolor: index === selectedZoneIndex ? 'primary.main' : 'action.hover',
                    color: index === selectedZoneIndex ? 'background.paper' : 'text.secondary',
                  }}
                />
              </Box>
            }
          />
        ))}
      </Tabs>

      {canManageZones && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={onCreateZone}
          sx={{
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          + Новая зона
        </Button>
      )}
    </Paper>
  );
}

export default WarehouseZonesNavigation;

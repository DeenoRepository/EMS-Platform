'use client';

import React from 'react';
import { Paper, Tabs, Tab, Box, Chip, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { StorageZone } from '../WarehouseTopologyModal';

interface ZonesNavigationBarProps {
  zones: StorageZone[];
  selectedIndex: number;
  canManageZones: boolean;
  onSelectIndex: (index: number) => void;
  onOpenCreateZone: () => void;
}

export function ZonesNavigationBar({
  zones,
  selectedIndex,
  canManageZones,
  onSelectIndex,
  onOpenCreateZone,
}: ZonesNavigationBarProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Tabs
        value={selectedIndex}
        onChange={(_, val) => onSelectIndex(val)}
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
              bgcolor: 'action.hover',
              color: 'primary.main',
            },
          },
          '& .MuiTabs-indicator': {
            display: 'none',
          },
        }}
      >
        {zones.map((zone, idx) => (
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
                    bgcolor: idx === selectedIndex ? 'primary.main' : 'action.hover',
                    color: idx === selectedIndex ? 'primary.contrastText' : 'text.secondary',
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
          onClick={onOpenCreateZone}
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

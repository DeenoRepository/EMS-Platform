'use client';

import React from 'react';
import { Box, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';

interface EquipmentHeaderActionsProps {
  canCreate: boolean;
  onExport: () => void;
  onCreateClick: () => void;
}

const BUTTON_HEIGHT = 38;
const BORDER_RADIUS = '8px';

export const EquipmentHeaderActions: React.FC<EquipmentHeaderActionsProps> = ({
  canCreate,
  onExport,
  onCreateClick,
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
      <Button
        variant="outlined"
        startIcon={<FileDownloadOutlinedIcon />}
        onClick={onExport}
        sx={{
          height: BUTTON_HEIGHT,
          borderRadius: BORDER_RADIUS,
          borderColor: 'divider',
          color: 'text.secondary',
          px: 2,
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'none',
          backgroundColor: 'background.paper',
          '&:hover': {
            borderColor: 'grey.400',
            backgroundColor: 'background.default',
          },
        }}
      >
        Экспорт
      </Button>
      {canCreate && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateClick}
          sx={{
            height: BUTTON_HEIGHT,
            borderRadius: BORDER_RADIUS,
            fontWeight: 600,
            fontSize: '0.875rem',
            textTransform: 'none',
            px: 2.25,
            backgroundColor: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
          }}
        >
          Добавить оборудование
        </Button>
      )}
    </Box>
  );
};

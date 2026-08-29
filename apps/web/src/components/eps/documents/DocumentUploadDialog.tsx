'use client';

import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Autocomplete,
  Typography,
  Paper,
} from '@mui/material';
import { FormDialog, FileUploadDropzone } from '@/components/ui';
import { DOCUMENT_TYPE_MAP } from '@ems/shared';

export interface EquipmentOption {
  id: string;
  name: string;
  inventoryNumber: string | null;
}

interface DocumentUploadDialogProps {
  open: boolean;
  onClose: () => void;
  selectedFile: File | null;
  onSelectedFileChange: (file: File | null) => void;
  selectedEquipment: EquipmentOption | null;
  onSelectedEquipmentChange: (equipment: EquipmentOption | null) => void;
  docType: string;
  onDocTypeChange: (docType: string) => void;
  description: string;
  onDescriptionChange: (desc: string) => void;
  equipmentOptions: EquipmentOption[];
  uploading: boolean;
  onSubmit: () => Promise<void>;
}

export function DocumentUploadDialog({
  open,
  onClose,
  selectedFile,
  onSelectedFileChange,
  selectedEquipment,
  onSelectedEquipmentChange,
  docType,
  onDocTypeChange,
  description,
  onDescriptionChange,
  equipmentOptions,
  uploading,
  onSubmit,
}: DocumentUploadDialogProps) {
  return (
    <FormDialog
      open={open}
      title="Загрузка документа в архив"
      submitLabel={uploading ? 'Загрузка...' : 'Загрузить в архив'}
      onSubmit={onSubmit}
      submitDisabled={!selectedFile || !selectedEquipment || uploading}
      onClose={onClose}
      maxWidth="sm"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 0.5 }}>
        <FileUploadDropzone
          files={selectedFile ? [selectedFile] : []}
          onFileSelect={(file) => onSelectedFileChange(file)}
          onChange={(files) => onSelectedFileChange(files[0] || null)}
          maxSizeMb={50}
          description="PDF, DWG, DOCX, XLSX, ZIP до 50 МБ"
        />

        <Autocomplete
          options={equipmentOptions}
          getOptionLabel={(option) => `[${option.inventoryNumber || 'Б/Н'}] ${option.name}`}
          value={selectedEquipment}
          onChange={(_, newValue) => onSelectedEquipmentChange(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Привязать к оборудованию *"
              placeholder="Поиск по инв. номеру или наименованию..."
              required
              size="small"
            />
          )}
          renderOption={(props, option) => {
            const { key, ...optionProps } = props as { key: string; [k: string]: unknown };
            return (
              <Box key={key} component="li" {...optionProps} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Paper
                  variant="outlined"
                  sx={{
                    px: 0.75,
                    py: 0.25,
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    bgcolor: 'grey.50',
                  }}
                >
                  {option.inventoryNumber || 'Б/Н'}
                </Paper>
                <Typography variant="body2">{option.name}</Typography>
              </Box>
            );
          }}
        />

        <TextField
          select
          label="Тип документа"
          value={docType}
          onChange={(e) => onDocTypeChange(e.target.value)}
          fullWidth
          size="small"
        >
          {Object.entries(DOCUMENT_TYPE_MAP).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Краткое описание / назначение документа"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          multiline
          rows={3}
          fullWidth
          size="small"
          placeholder="Например: Паспорт сосуда под давлением № 45-А, редакция 2024 г."
        />
      </Box>
    </FormDialog>
  );
}

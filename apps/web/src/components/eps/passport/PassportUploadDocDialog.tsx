'use client';

import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
} from '@mui/material';
import { FormDialog, FileUploadDropzone } from '@/components/ui';
import { DOCUMENT_TYPE_MAP } from '@ems/shared';
import { detectDocumentTypeFromFileName } from '@/lib/eps-document-matcher';

interface PassportUploadDocDialogProps {
  open: boolean;
  equipmentModel?: string | null;
  decimalNumber?: string | null;
  selectedFiles: File[];
  docType: string;
  docDescription: string;
  applyToAllModel: boolean;
  applyToAllDecimal: boolean;
  uploading: boolean;
  onClose: () => void;
  onFilesChange: (files: File[]) => void;
  onDocTypeChange: (type: string) => void;
  onDescriptionChange: (desc: string) => void;
  onApplyToAllModelChange: (val: boolean) => void;
  onApplyToAllDecimalChange: (val: boolean) => void;
  onSubmit: () => void;
}

export function PassportUploadDocDialog({
  open,
  equipmentModel,
  decimalNumber,
  selectedFiles,
  docType,
  docDescription,
  applyToAllModel,
  applyToAllDecimal,
  uploading,
  onClose,
  onFilesChange,
  onDocTypeChange,
  onDescriptionChange,
  onApplyToAllModelChange,
  onApplyToAllDecimalChange,
  onSubmit,
}: PassportUploadDocDialogProps) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Прикрепление документов"
      maxWidth="sm"
      loading={uploading}
      submitLabel={
        uploading
          ? 'Прикрепление...'
          : selectedFiles.length > 1
          ? `Прикрепить документы (${selectedFiles.length})`
          : 'Прикрепить документ'
      }
      onSubmit={onSubmit}
      submitDisabled={selectedFiles.length === 0 || uploading}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          size="small"
          label="Модель оборудования"
          value={equipmentModel || ''}
          fullWidth
          disabled
        />

        <FileUploadDropzone
          multiple
          files={selectedFiles}
          onChange={(files) => {
            onFilesChange(files);
            if (files && files.length > 0) {
              const detected = detectDocumentTypeFromFileName(files[0].name);
              if (detected.type && detected.type !== 'OTHER') {
                onDocTypeChange(detected.type);
              }
            }
          }}
          compact
          maxSizeMb={50}
          title="Перетащите файлы документов или выберите"
          description="PDF, DOCX, XLSX, чертежи (до 50 МБ на файл)"
        />

        {equipmentModel && (
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={applyToAllModel}
                onChange={(e) => onApplyToAllModelChange(e.target.checked)}
              />
            }
            label={
              <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>
                Привязать также ко всем единицам модели «<strong>{equipmentModel}</strong>»
              </Typography>
            }
          />
        )}

        {decimalNumber && (
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={applyToAllDecimal}
                onChange={(e) => onApplyToAllDecimalChange(e.target.checked)}
              />
            }
            label={
              <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>
                Привязать также ко всем единицам с дец. номером «<strong>{decimalNumber}</strong>»
              </Typography>
            }
          />
        )}

        <FormControl fullWidth size="small">
          <InputLabel id="doc-type-label">Тип документа</InputLabel>
          <Select
            labelId="doc-type-label"
            value={docType}
            label="Тип документа"
            onChange={(e) => onDocTypeChange(e.target.value)}
          >
            {Object.entries(DOCUMENT_TYPE_MAP).map(([key, label]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          size="small"
          label="Описание / комментарий к документу"
          value={docDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          multiline
          rows={2}
        />
      </Box>
    </FormDialog>
  );
}

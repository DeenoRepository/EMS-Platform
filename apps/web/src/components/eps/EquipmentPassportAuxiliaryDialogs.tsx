'use client';

import React from 'react';
import { Box, MenuItem, Paper, TextField, Typography } from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { APPROVAL_TYPE_MAP, DOCUMENT_TYPE_MAP, EQUIPMENT_STATUS_MAP } from '@ems/shared';
import { FileUploadDropzone, FormDialog } from '@/components/ui';
import type { EquipmentDetails } from '@/app/eps/[id]/page';

interface EquipmentPassportAuxiliaryDialogsProps {
  equipment: EquipmentDetails;
  documentDialogOpen: boolean;
  selectedFile: File | null;
  documentType: string;
  documentDescription: string;
  uploading: boolean;
  onCloseDocumentDialog: () => void;
  onSelectedFileChange: (file: File | null) => void;
  onDocumentTypeChange: (value: string) => void;
  onDocumentDescriptionChange: (value: string) => void;
  onUploadDocument: () => void | Promise<void>;
  approvalDialogOpen: boolean;
  approvalType: string;
  approvalTitle: string;
  approvalDescription: string;
  approvalTargetStatus: string;
  submittingApproval: boolean;
  onCloseApprovalDialog: () => void;
  onApprovalTypeChange: (value: string) => void;
  onApprovalTitleChange: (value: string) => void;
  onApprovalDescriptionChange: (value: string) => void;
  onApprovalTargetStatusChange: (value: string) => void;
  onCreateApproval: () => void | Promise<void>;
  previewDocumentUrl: string | null;
  onClosePreview: () => void;
}

export function EquipmentPassportAuxiliaryDialogs({
  equipment,
  documentDialogOpen,
  selectedFile,
  documentType,
  documentDescription,
  uploading,
  onCloseDocumentDialog,
  onSelectedFileChange,
  onDocumentTypeChange,
  onDocumentDescriptionChange,
  onUploadDocument,
  approvalDialogOpen,
  approvalType,
  approvalTitle,
  approvalDescription,
  approvalTargetStatus,
  submittingApproval,
  onCloseApprovalDialog,
  onApprovalTypeChange,
  onApprovalTitleChange,
  onApprovalDescriptionChange,
  onApprovalTargetStatusChange,
  onCreateApproval,
  previewDocumentUrl,
  onClosePreview,
}: EquipmentPassportAuxiliaryDialogsProps) {
  return (
    <>
      <FormDialog
        open={documentDialogOpen}
        onClose={onCloseDocumentDialog}
        title="Прикрепление документа"
        maxWidth="xs"
        loading={uploading}
        submitLabel={uploading ? 'Прикрепление...' : 'Прикрепить документ'}
        onSubmit={onUploadDocument}
        submitDisabled={!selectedFile || uploading}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FileUploadDropzone
            files={selectedFile ? [selectedFile] : []}
            onChange={(files) => onSelectedFileChange(files[0] || null)}
            compact
            title="Перетащите файл документа или выберите"
            description="PDF, DOCX, XLSX, чертежи (до 15 МБ)"
          />
          <TextField select size="small" label="Тип документа" value={documentType} onChange={(event) => onDocumentTypeChange(event.target.value)}>
            {Object.entries(DOCUMENT_TYPE_MAP).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Примечание / Описание" value={documentDescription} onChange={(event) => onDocumentDescriptionChange(event.target.value)} multiline rows={2} />
        </Box>
      </FormDialog>

      <FormDialog
        open={approvalDialogOpen}
        onClose={onCloseApprovalDialog}
        title="Создание заявки на согласование"
        icon={<FactCheckOutlinedIcon color="primary" />}
        maxWidth="sm"
        loading={submittingApproval}
        submitLabel={submittingApproval ? 'Отправка...' : 'Подать заявку'}
        onSubmit={onCreateApproval}
        submitDisabled={!approvalTitle.trim() || submittingApproval}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary" display="block">Оборудование:</Typography>
            <Typography variant="subtitle2" fontWeight={700}>{equipment.name} • Инв. №: {equipment.inventoryNumber || 'Б/Н'}</Typography>
          </Paper>
          <TextField select size="small" label="Тип согласования" value={approvalType} onChange={(event) => onApprovalTypeChange(event.target.value)} fullWidth required>
            {Object.entries(APPROVAL_TYPE_MAP).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
          </TextField>
          {approvalType === 'STATUS_CHANGE' && (
            <TextField select size="small" label="Целевой рабочий статус" value={approvalTargetStatus} onChange={(event) => onApprovalTargetStatusChange(event.target.value)} fullWidth required>
              {Object.entries(EQUIPMENT_STATUS_MAP).map(([key, info]) => <MenuItem key={key} value={key}>{info.label}</MenuItem>)}
            </TextField>
          )}
          <TextField label="Тема заявки" value={approvalTitle} onChange={(event) => onApprovalTitleChange(event.target.value)} size="small" fullWidth required placeholder="Например: Согласование акта списания в связи с износом" />
          <TextField label="Обоснование / Описание" value={approvalDescription} onChange={(event) => onApprovalDescriptionChange(event.target.value)} multiline rows={3} size="small" fullWidth placeholder="Укажите подробную причину, номер служебной записки или дефектной ведомости..." />
        </Box>
      </FormDialog>

      <FormDialog open={Boolean(previewDocumentUrl)} onClose={onClosePreview} title="Просмотр документа" maxWidth="md" hideActions>
        <Box sx={{ display: 'flex', justifyContent: 'center', bgcolor: 'black', borderRadius: 1, overflow: 'hidden' }}>
          {previewDocumentUrl && <Box component="img" src={previewDocumentUrl} alt="Preview" sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />}
        </Box>
      </FormDialog>
    </>
  );
}

'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import { CustomSectionDef, CustomFieldDef } from './types';
import { PassportFieldEditor } from './PassportFieldEditor';

const FONT_SEMI_BOLD = 600;

interface PassportEditDialogProps {
  open: boolean;
  sections: CustomSectionDef[];
  unassignedFields: CustomFieldDef[];
  editForm: any;
  editCustomFields: Record<string, any>;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onFieldChange: (key: string, value: any, isBase: boolean) => void;
}

const BASE_FIELDS = [
  'name',
  'inventoryNumber',
  'serialNumber',
  'manufacturer',
  'model',
  'location',
  'status',
  'commissionDate',
];

export function PassportEditDialog({
  open,
  sections,
  unassignedFields,
  editForm,
  editCustomFields,
  saving,
  onClose,
  onSave,
  onFieldChange,
}: PassportEditDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Редактирование паспорта оборудования
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          {sections.map((sec) => (
            <Box key={sec.id}>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 1.5 }}>
                {sec.name}
              </Typography>
              <Grid container spacing={2}>
                {sec.fields.map((f) => {
                  const isBase = BASE_FIELDS.includes(f.key);
                  const val = isBase ? editForm[f.key] : editCustomFields[f.key];

                  return (
                    <PassportFieldEditor
                      key={f.key}
                      field={f}
                      value={val}
                      onChange={(v) => onFieldChange(f.key, v, isBase)}
                    />
                  );
                })}
              </Grid>
              <Divider sx={{ mt: 3 }} />
            </Box>
          ))}

          {unassignedFields.length > 0 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} color="text.secondary" sx={{ mb: 1.5 }}>
                Дополнительные параметры
              </Typography>
              <Grid container spacing={2}>
                {unassignedFields.map((f) => (
                  <PassportFieldEditor
                    key={f.key}
                    field={f}
                    value={editCustomFields[f.key]}
                    onChange={(v) => onFieldChange(f.key, v, false)}
                  />
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: FONT_SEMI_BOLD }}>
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={saving}
          sx={{ textTransform: 'none', fontWeight: FONT_SEMI_BOLD }}
        >
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { FormDialog } from '@/components/ui';

export interface PermissionItem {
  id: string;
  code: string;
  displayName: string;
  module: string;
  description: string | null;
}

export interface RoleItem {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
}

export const MODULE_LABELS: Record<string, string> = {
  eps: 'EPS — Паспортизация оборудования',
  wms: 'WMS — Складской учёт',
  srm: 'SRM — Система подачи заявок',
  mro: 'MRO — Техническое обслуживание',
  admin: 'Администрирование системы',
};

export interface RoleEditDialogProps {
  open: boolean;
  onClose: () => void;
  editingRole: RoleItem | null;
  roleName: string;
  setRoleName: (name: string) => void;
  roleDisplayName: string;
  setRoleDisplayName: (displayName: string) => void;
  roleDescription: string;
  setRoleDescription: (desc: string) => void;
  selectedPermCodes: string[];
  permsByModule: Record<string, PermissionItem[]>;
  handleTogglePerm: (code: string) => void;
  handleToggleModulePerms: (moduleKey: string) => void;
  handleSaveRole: () => void;
  saving: boolean;
}

export function RoleEditDialog({
  open,
  onClose,
  editingRole,
  roleName,
  setRoleName,
  roleDisplayName,
  setRoleDisplayName,
  roleDescription,
  setRoleDescription,
  selectedPermCodes,
  permsByModule,
  handleTogglePerm,
  handleToggleModulePerms,
  handleSaveRole,
  saving,
}: RoleEditDialogProps) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={editingRole ? `Редактирование роли: ${editingRole.displayName}` : 'Создание новой роли'}
      maxWidth="md"
      loading={saving}
      submitLabel={editingRole ? 'Сохранить изменения' : 'Создать роль'}
      onSubmit={handleSaveRole}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <TextField
          label="Отображаемое название роли"
          placeholder="например, Главный инженер склада"
          fullWidth
          required
          value={roleDisplayName}
          onChange={(e) => setRoleDisplayName(e.target.value)}
          size="small"
        />

        {!editingRole && (
          <TextField
            label="Системный код (латиницей, UNIQUE)"
            placeholder="например, warehouse_lead"
            fullWidth
            required
            value={roleName}
            onChange={(e) => setRoleName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            helperText="Используется внутри системы для проверки прав и связи с LDAP группами"
            size="small"
          />
        )}

        <TextField
          label="Описание назначения роли"
          placeholder="Краткое пояснение области ответственности"
          fullWidth
          multiline
          value={roleDescription}
          onChange={(e) => setRoleDescription(e.target.value)}
          rows={2}
          size="small"
        />
      </Box>

      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        Матрица гранулярных прав доступа:
      </Typography>

      {Object.entries(permsByModule).map(([moduleKey, modulePerms]) => {
        const allSelected = modulePerms.every((p) => selectedPermCodes.includes(p.code));

        return (
          <Accordion
            key={moduleKey}
            defaultExpanded
            sx={{ border: '1px solid', borderColor: 'divider', mb: 1, boxShadow: 'none' }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', pr: 2 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {MODULE_LABELS[moduleKey] || moduleKey.toUpperCase()}
                </Typography>
                <Button
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleModulePerms(moduleKey);
                  }}
                  color={allSelected ? 'primary' : 'inherit'}
                  sx={{ fontSize: '0.75rem' }}
                >
                  {allSelected ? 'Снять все' : 'Выбрать все в модуле'}
                </Button>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <FormGroup sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                {modulePerms.map((perm) => (
                  <FormControlLabel
                    key={perm.id}
                    control={
                      <Checkbox
                        checked={selectedPermCodes.includes(perm.code)}
                        onChange={() => handleTogglePerm(perm.code)}
                        size="small"
                        sx={{ alignSelf: 'flex-start', mt: 0.25 }}
                      />
                    }
                    sx={{
                      alignItems: 'flex-start',
                      m: 0,
                      p: 1.25,
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: selectedPermCodes.includes(perm.code) ? 'primary.light' : 'divider',
                      bgcolor: selectedPermCodes.includes(perm.code) ? 'action.hover' : 'background.paper',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: 'action.hover', borderColor: 'text.disabled' },
                    }}
                    label={
                      <Box sx={{ ml: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 0.25 }}>
                          <Typography variant="body2" fontWeight={600} fontSize="0.8125rem" color="text.primary">
                            {perm.displayName}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.6875rem',
                              color: 'text.secondary',
                              bgcolor: 'action.hover',
                              px: 0.75,
                              py: 0.1,
                              borderRadius: '4px',
                            }}
                          >
                            {perm.code}
                          </Typography>
                        </Box>
                        {perm.description && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.35 }}>
                            {perm.description}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </FormDialog>
  );
}

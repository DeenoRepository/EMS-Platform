'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PageHeader from '@/components/layout/PageHeader';
import { useSnackbar } from 'notistack';

interface PermissionItem {
  id: string;
  code: string;
  displayName: string;
  module: string;
  description: string | null;
}

interface RoleItem {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: string[]; // array of permission codes
}

const MODULE_LABELS: Record<string, string> = {
  eps: 'EPS — Паспортизация оборудования',
  wms: 'WMS — Складской учёт',
  srm: 'SRM — Система подачи заявок',
  mro: 'MRO — Техническое обслуживание',
  admin: 'Администрирование системы',
};

export default function AdminRolesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create / Edit Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDisplayName, setRoleDisplayName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermCodes, setSelectedPermCodes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch('/api/admin/roles'),
        fetch('/api/admin/permissions'),
      ]);

      if (rolesRes.ok && permsRes.ok) {
        const rolesJson = await rolesRes.json();
        const permsJson = await permsRes.json();
        if (rolesJson.success) setRoles(rolesJson.data);
        if (permsJson.success) setPermissions(permsJson.data);
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки данных', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDisplayName('');
    setRoleDescription('');
    setSelectedPermCodes([]);
    setDialogOpen(true);
  };

  const handleOpenEdit = (role: RoleItem) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDisplayName(role.displayName);
    setRoleDescription(role.description || '');
    setSelectedPermCodes([...role.permissions]);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleTogglePerm = (code: string) => {
    setSelectedPermCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleToggleModulePerms = (moduleName: string) => {
    const modulePerms = permissions.filter((p) => p.module === moduleName).map((p) => p.code);
    const allSelected = modulePerms.every((c) => selectedPermCodes.includes(c));

    if (allSelected) {
      setSelectedPermCodes((prev) => prev.filter((c) => !modulePerms.includes(c)));
    } else {
      setSelectedPermCodes((prev) => Array.from(new Set([...prev, ...modulePerms])));
    }
  };

  const handleSaveRole = async () => {
    if (!roleDisplayName.trim()) {
      enqueueSnackbar('Укажите отображаемое название роли', { variant: 'warning' });
      return;
    }
    if (!editingRole && !roleName.trim()) {
      enqueueSnackbar('Укажите системный идентификатор роли (латиницей)', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      let res;
      if (editingRole) {
        res = await fetch(`/api/admin/roles/${editingRole.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: roleDisplayName.trim(),
            description: roleDescription.trim(),
            permissionCodes: selectedPermCodes,
          }),
        });
      } else {
        res = await fetch('/api/admin/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: roleName.trim(),
            displayName: roleDisplayName.trim(),
            description: roleDescription.trim(),
            permissionCodes: selectedPermCodes,
          }),
        });
      }

      const data = await res.json();
      if (data.success) {
        enqueueSnackbar(`Роль успешно ${editingRole ? 'обновлена' : 'создана'}`, { variant: 'success' });
        handleCloseDialog();
        fetchData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка сохранения роли', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role: RoleItem) => {
    if (!confirm(`Вы действительно хотите удалить роль «${role.displayName}»?`)) return;

    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Роль удалена', { variant: 'info' });
        fetchData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка удаления роли', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    }
  };

  // Group permissions by module
  const permsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, PermissionItem[]>);

  return (
    <Box>
      <PageHeader
        title="Роли и гранулярные права"
        subtitle="Настройка матриц прав доступа и создание кастомных ролей"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование' },
          { label: 'Роли и права' },
        ]}
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
          >
            Создать роль
          </Button>
        }
      />

      <Card>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Название роли</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Системный код</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Описание</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Пользователей</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Количество прав</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {r.displayName}
                        </Typography>
                        {r.isSystem && (
                          <Chip label="Системная" size="small" variant="outlined" color="primary" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={r.name} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{r.description || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {r.userCount}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${r.permissions.length} из ${permissions.length}`}
                        size="small"
                        color={r.name === 'admin' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenEdit(r)}
                        title="Редактировать права"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      {!r.isSystem && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteRole(r)}
                          title="Удалить роль"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Role Form & Permission Matrix Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRole ? `Редактирование роли: ${editingRole.displayName}` : 'Создание новой роли'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Отображаемое название"
                placeholder="например: Специалист ОТК"
                value={roleDisplayName}
                onChange={(e) => setRoleDisplayName(e.target.value)}
                fullWidth
                required
                size="small"
              />
              <TextField
                label="Системный код (латиницей)"
                placeholder="например: quality_inspector"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                disabled={Boolean(editingRole)}
                fullWidth
                required
                size="small"
              />
            </Box>
            <TextField
              label="Описание роли"
              placeholder="Кратко опишите назначение и уровень доступа этой роли"
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
          </Box>

          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Матрица гранулярных прав доступа:
          </Typography>

          {Object.entries(permsByModule).map(([moduleKey, modulePerms]) => {
            const allSelected = modulePerms.every((p) => selectedPermCodes.includes(p.code));
            const someSelected = modulePerms.some((p) => selectedPermCodes.includes(p.code));

            return (
              <Accordion key={moduleKey} defaultExpanded sx={{ border: '1px solid #e2e8f0', mb: 1, boxShadow: 'none' }}>
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
                  <FormGroup sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                    {modulePerms.map((perm) => (
                      <FormControlLabel
                        key={perm.id}
                        control={
                          <Checkbox
                            checked={selectedPermCodes.includes(perm.code)}
                            onChange={() => handleTogglePerm(perm.code)}
                            size="small"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight={500} fontSize="0.8125rem">
                              {perm.displayName}
                            </Typography>
                            {perm.description && (
                              <Typography variant="caption" color="text.secondary" display="block">
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Отмена
          </Button>
          <Button onClick={handleSaveRole} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Сохранить роль'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

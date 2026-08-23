'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Button,
  IconButton,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SecurityIcon from '@mui/icons-material/Security';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import PageHeader from '@/components/layout/PageHeader';
import { useSnackbar } from 'notistack';
import {
  StatCard,
  DataTableWrapper,
  EmptyState,
  ConfirmDialog,
  FormDialog,
  StatusBadge,
} from '@/components/ui';

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

  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDeleteRole = async () => {
    if (!roleToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/roles/${roleToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Роль успешно удалена', { variant: 'info' });
        setRoleToDelete(null);
        fetchData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка удаления роли', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Group permissions by module
  const permsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, PermissionItem[]>);

  const totalRoles = roles.length;
  const systemRoles = roles.filter((r) => r.isSystem).length;
  const customRoles = roles.filter((r) => !r.isSystem).length;

  return (
    <Box sx={{ width: '100%', pb: 2 }}>
      <PageHeader
        title="Роли и гранулярные права"
        subtitle="Настройка матриц прав доступа и создание кастомных ролей"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование', href: '/admin/settings' },
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

      {/* KPI Metric Cards */}
      <Grid container spacing={1.75} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Всего ролей"
            value={totalRoles}
            subtitle="Настроенных в системе"
            icon={<SecurityIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Системные роли"
            value={systemRoles}
            subtitle="Встроенные базовые роли EMS"
            icon={<AdminPanelSettingsIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(124, 58, 237, 0.08)"
            iconColor="#7c3aed"
            accentColor="#7c3aed"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Кастомные роли"
            value={customRoles}
            subtitle="Созданные администраторами"
            icon={<VpnKeyIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="#16a34a"
            accentColor="#16a34a"
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Roles Registry Table */}
      {roles.length === 0 && !loading ? (
        <EmptyState
          paper
          icon={<SecurityIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
          title="Роли не найдены"
          description="В системе пока нет зарегистрированных ролей доступа."
          actionText="Создать роль"
          onAction={handleOpenCreate}
        />
      ) : (
        <DataTableWrapper
          loading={loading}
          total={roles.length}
          stickyHeader
        >
          <Table size="small" aria-label="Таблица ролей и прав доступа">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Название роли</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160 }}>Системный код</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Описание</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>Пользователей</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160 }}>Количество прав</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, width: 120 }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                        {r.displayName}
                      </Typography>
                      {r.isSystem && (
                        <StatusBadge status="SYSTEM" size="small" variant="outlined" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={r.name} size="small" variant="outlined" sx={{ borderRadius: '4px', height: 22, fontFamily: 'monospace' }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>{r.description || '—'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                      {r.userCount}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={r.name === 'admin' ? 'ADMIN' : 'USER'}
                      label={r.name === 'admin' ? `Все права (${permissions.length})` : `${r.permissions.length} из ${permissions.length}`}
                      size="small"
                      variant="subtle"
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
                        onClick={() => setRoleToDelete(r)}
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
        </DataTableWrapper>
      )}

      {/* Диалог подтверждения удаления роли */}
      <ConfirmDialog
        open={Boolean(roleToDelete)}
        title="Удаление роли"
        message={
          <Typography variant="body2">
            Вы действительно хотите безвозвратно удалить роль <b>«{roleToDelete?.displayName}»</b>? Пользователи, привязанные к этой роли, потеряют соответствующие привилегии.
          </Typography>
        }
        confirmText="Удалить роль"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDeleteRole}
        onClose={() => setRoleToDelete(null)}
      />

      {/* Role Form & Permission Matrix Dialog */}
      <FormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        title={editingRole ? `Редактирование роли: ${editingRole.displayName}` : 'Создание новой роли'}
        icon={<SecurityIcon color="primary" />}
        maxWidth="md"
        loading={saving}
        submitLabel={saving ? 'Сохранение...' : 'Сохранить роль'}
        onSubmit={handleSaveRole}
        submitDisabled={saving || !roleDisplayName || !roleName}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3, pt: 1 }}>
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
                        borderColor: selectedPermCodes.includes(perm.code) ? '#bae6fd' : '#f1f5f9',
                        bgcolor: selectedPermCodes.includes(perm.code) ? 'rgba(2, 132, 199, 0.04)' : '#ffffff',
                        transition: 'all 0.15s ease',
                        '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
                      }}
                      label={
                        <Box sx={{ ml: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 0.25 }}>
                            <Typography variant="body2" fontWeight={600} fontSize="0.8125rem" color="#0f172a">
                              {perm.displayName}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.6875rem',
                                color: '#64748b',
                                bgcolor: '#f1f5f9',
                                px: 0.75,
                                py: 0.1,
                                borderRadius: '4px',
                              }}
                            >
                              {perm.code}
                            </Typography>
                          </Box>
                          {perm.description && (
                            <Typography variant="caption" color="#64748b" display="block" sx={{ lineHeight: 1.35 }}>
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
    </Box>
  );
}

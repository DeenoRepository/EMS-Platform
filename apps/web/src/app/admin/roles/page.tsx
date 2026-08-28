'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const paginatedRoles = useMemo(() => {
    return roles.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [roles, page, rowsPerPage]);

  const totalRoles = roles.length;
  const systemRoles = roles.filter((r) => r.isSystem).length;
  const customRoles = roles.filter((r) => !r.isSystem).length;

  return (
    <Box sx={{ width: '100%', pb: 2 }}>
      <PageHeader
        title="Матрица ролей и гранулярных полномочий"
        subtitle="Конфигурация ролевой модели безопасности (RBAC) и распределение прав доступа по модулям"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование', href: '/admin/settings' },
          { label: 'Матрица ролей и полномочий' },
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
            iconBgColor="action.hover"
            iconColor="primary.main"
            accentColor="primary.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Системные роли"
            value={systemRoles}
            subtitle="Встроенные базовые роли EMS"
            icon={<AdminPanelSettingsIcon sx={{ fontSize: 20 }} />}
            iconBgColor="secondary.light"
            iconColor="secondary.main"
            accentColor="secondary.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Кастомные роли"
            value={customRoles}
            subtitle="Созданные администраторами"
            icon={<VpnKeyIcon sx={{ fontSize: 20 }} />}
            iconBgColor="success.light"
            iconColor="success.main"
            accentColor="success.main"
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
          page={page}
          pageSize={rowsPerPage}
          total={roles.length}
          onPageChange={(_, newPage) => setPage(newPage)}
          onPageSizeChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          pageSizeOptions={[10, 25, 50]}
          stickyHeader
        >
          <Table size="small" aria-label="Таблица ролей пользователей">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'background.paper' }}>
                <TableCell sx={{ minWidth: 200 }}>Название роли</TableCell>
                <TableCell sx={{ minWidth: 160 }}>Системный код</TableCell>
                <TableCell sx={{ minWidth: 240 }}>Описание</TableCell>
                <TableCell align="center" sx={{ minWidth: 120 }}>Тип</TableCell>
                <TableCell align="center" sx={{ minWidth: 130 }}>Пользователей</TableCell>
                <TableCell sx={{ minWidth: 180 }}>Полномочия</TableCell>
                <TableCell align="right" sx={{ minWidth: 100 }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRoles.map((role) => (
                <TableRow key={role.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {role.displayName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontWeight: 600 }}>
                      {role.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                      {role.description || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <StatusBadge
                      status={role.isSystem ? 'ACTIVE' : 'DRAFT'}
                      label={role.isSystem ? 'Системная' : 'Кастомная'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${role.userCount} польз.`}
                      size="small"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        height: 22,
                        fontSize: '0.75rem',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      {role.permissions.length === 0
                        ? 'Нет прав'
                        : `${role.permissions.length} ${
                            role.permissions.length === 1
                              ? 'полномочие'
                              : role.permissions.length < 5
                              ? 'полномочия'
                              : 'полномочий'
                          }`}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEdit(role)}
                        title="Редактировать роль"
                        sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setRoleToDelete(role)}
                        disabled={role.isSystem}
                        title={role.isSystem ? 'Системную роль нельзя удалить' : 'Удалить роль'}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableWrapper>
      )}

      {/* Delete Role Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(roleToDelete)}
        title="Удаление роли доступа"
        message={
          roleToDelete
            ? `Вы действительно хотите удалить роль «${roleToDelete.displayName}» (${roleToDelete.name})? Пользователи, имеющие только эту роль, потеряют связанные полномочия.`
            : ''
        }
        variant="danger"
        confirmText="Удалить роль"
        loading={isDeleting}
        onConfirm={handleConfirmDeleteRole}
        onClose={() => setRoleToDelete(null)}
      />

      {/* Create / Edit Role Modal Form */}
      <FormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        title={editingRole ? `Редактирование роли: ${editingRole.displayName}` : 'Создание новой роли'}
        icon={<SecurityIcon color="primary" />}
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
            <Accordion key={moduleKey} defaultExpanded sx={{ border: '1px solid', borderColor: 'divider', mb: 1, boxShadow: 'none' }}>
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
    </Box>
  );
}

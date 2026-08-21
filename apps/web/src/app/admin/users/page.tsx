'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Switch,
  IconButton,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PageHeader from '@/components/layout/PageHeader';
import { formatDateTime } from '@ems/shared';
import { useSnackbar } from 'notistack';
import {
  StatCard,
  SearchInput,
  FilterToolbar,
  DataTableWrapper,
  EmptyState,
  StatusBadge,
  FormDialog,
} from '@/components/ui';

interface UserItem {
  id: string;
  ldapLogin: string;
  displayName: string;
  email: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: { id: string; name: string; displayName: string }[];
}

interface RoleItem {
  id: string;
  name: string;
  displayName: string;
}

export default function AdminUsersPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Roles Dialog
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/roles'),
      ]);

      if (usersRes.ok && rolesRes.ok) {
        const usersJson = await usersRes.json();
        const rolesJson = await rolesRes.json();
        if (usersJson.success) setUsers(usersJson.data);
        if (rolesJson.success) setAvailableRoles(rolesJson.data);
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

  const handleOpenEdit = (user: UserItem) => {
    setSelectedUser(user);
    setSelectedRoleIds(user.roles.map((r) => r.id));
  };

  const handleCloseDialog = () => {
    setSelectedUser(null);
  };

  const handleToggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          roleIds: selectedRoleIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Роли пользователя успешно обновлены', { variant: 'success' });
        handleCloseDialog();
        fetchData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка сохранения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при сохранении', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: UserItem) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          isActive: !user.isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u))
        );
        enqueueSnackbar(
          `Пользователь ${user.ldapLogin} ${!user.isActive ? 'активирован' : 'деактивирован'}`,
          { variant: 'info' }
        );
      }
    } catch {
      enqueueSnackbar('Ошибка изменения статуса', { variant: 'error' });
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const adminUsers = users.filter((u) => u.roles.some((r) => r.name === 'admin')).length;

  const filteredUsers = users.filter((u) => {
    if (roleFilter && !u.roles.some((r) => r.id === roleFilter)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.displayName.toLowerCase().includes(q);
      const matchLogin = u.ldapLogin.toLowerCase().includes(q);
      const matchEmail = u.email ? u.email.toLowerCase().includes(q) : false;
      if (!matchName && !matchLogin && !matchEmail) return false;
    }
    return true;
  });

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto', pb: 4 }}>
      <PageHeader
        title="Управление пользователями"
        subtitle="Синхронизированные учетные записи LDAP и назначение ролей"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование', href: '/admin/settings' },
          { label: 'Пользователи' },
        ]}
      />

      {/* KPI Metric Cards */}
      <Grid container spacing={1.75} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Всего пользователей"
            value={totalUsers}
            subtitle="Учетных записей LDAP"
            icon={<PersonOutlineIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Активных аккаунтов"
            value={activeUsers}
            subtitle="С разрешенным входом"
            icon={<VerifiedUserIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="#16a34a"
            accentColor="#16a34a"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Администраторов"
            value={adminUsers}
            subtitle="С полным доступом к системе"
            icon={<AdminPanelSettingsIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(124, 58, 237, 0.08)"
            iconColor="#7c3aed"
            accentColor="#7c3aed"
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Filter Toolbar */}
      <FilterToolbar
        activeFilterCount={(searchQuery ? 1 : 0) + (roleFilter ? 1 : 0)}
        onResetFilters={() => {
          setSearchQuery('');
          setRoleFilter('');
        }}
        actions={
          availableRoles.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
              <TextField
                select
                size="small"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                SelectProps={{
                  displayEmpty: true,
                }}
                sx={{
                  minWidth: 200,
                  backgroundColor: '#ffffff',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    height: 36,
                    '& fieldset': { borderColor: '#e2e8f0' },
                    '&:hover fieldset': { borderColor: '#cbd5e1' },
                  },
                }}
              >
                <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все роли</MenuItem>
                {availableRoles.map((r) => (
                  <MenuItem key={r.id} value={r.id} sx={{ fontSize: '0.8125rem' }}>
                    {r.displayName}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          ) : undefined
        }
      >
        <Box sx={{ minWidth: { xs: '100%', sm: 260, md: 320 }, flexGrow: 1 }}>
          <SearchInput
            placeholder="Поиск по ФИО, логину или email..."
            value={searchQuery}
            onSearch={setSearchQuery}
          />
        </Box>
      </FilterToolbar>

      {/* Users Registry Table */}
      {filteredUsers.length === 0 && !loading ? (
        <EmptyState
          paper
          icon={<PersonOutlineIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
          title="Пользователи не найдены"
          description={
            searchQuery || roleFilter
              ? 'По указанным критериям поиска пользователи не найдены. Попробуйте сбросить фильтры.'
              : 'В системе пока нет зарегистрированных учетных записей.'
          }
          actionText={searchQuery || roleFilter ? 'Сбросить фильтры' : undefined}
          onAction={
            searchQuery || roleFilter
              ? () => {
                  setSearchQuery('');
                  setRoleFilter('');
                }
              : undefined
          }
        />
      ) : (
        <DataTableWrapper
          loading={loading}
          total={filteredUsers.length}
          stickyHeader
        >
          <Table size="small" aria-label="Таблица пользователей системы">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Пользователь</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 150 }}>LDAP Логин</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Назначенные роли</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160 }}>Последний вход</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 100 }}>Активен</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, width: 100 }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                      {u.displayName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={u.ldapLogin} size="small" variant="outlined" sx={{ borderRadius: '4px', height: 22, fontFamily: 'monospace' }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>{u.email || '—'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {u.roles.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          Нет ролей
                        </Typography>
                      ) : (
                        u.roles.map((r) => (
                          <StatusBadge
                            key={r.id}
                            status={r.name === 'admin' ? 'ADMIN' : 'USER'}
                            label={r.displayName}
                            size="small"
                            variant="outlined"
                          />
                        ))
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>{formatDateTime(u.lastLoginAt)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StatusBadge
                        status={u.isActive ? 'USER_ACTIVE' : 'USER_INACTIVE'}
                        variant="dot"
                        size="small"
                      />
                      <Switch
                        checked={u.isActive}
                        onChange={() => handleToggleActive(u)}
                        color="success"
                        size="small"
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenEdit(u)}
                      title="Настроить роли"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableWrapper>
      )}

      {/* Dialog for Editing User Roles */}
      <FormDialog
        open={Boolean(selectedUser)}
        onClose={handleCloseDialog}
        title="Назначение ролей"
        subtitle={selectedUser ? `${selectedUser.displayName} (@${selectedUser.ldapLogin})` : undefined}
        icon={<AdminPanelSettingsIcon color="primary" />}
        maxWidth="xs"
        loading={saving}
        submitLabel={saving ? 'Сохранение...' : 'Сохранить роли'}
        onSubmit={handleSaveRoles}
        submitDisabled={saving}
      >
        {selectedUser && (
          <Box sx={{ pt: 1 }}>
            <Typography variant="caption" color="text.secondary" paragraph>
              Выберите роли, предоставляющие доступ к модулям EMS:
            </Typography>

            <FormGroup>
              {availableRoles.map((role) => (
                <FormControlLabel
                  key={role.id}
                  control={
                    <Checkbox
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={() => handleToggleRole(role.id)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {role.displayName}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </Box>
        )}
      </FormDialog>
    </Box>
  );
}

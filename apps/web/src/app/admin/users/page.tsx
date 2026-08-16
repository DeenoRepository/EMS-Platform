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
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PageHeader from '@/components/layout/PageHeader';
import { formatDateTime } from '@ems/shared';
import { useSnackbar } from 'notistack';

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

  return (
    <Box>
      <PageHeader
        title="Управление пользователями"
        subtitle="Синхронизированные учетные записи LDAP и назначение ролей"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование' },
          { label: 'Пользователи' },
        ]}
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
                  <TableCell sx={{ fontWeight: 600 }}>Пользователь</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>LDAP Логин</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Назначенные роли</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Последний вход</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Активен</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {u.displayName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={u.ldapLogin} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{u.email || '—'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {u.roles.length === 0 ? (
                          <Typography variant="caption" color="text.secondary">
                            Нет ролей
                          </Typography>
                        ) : (
                          u.roles.map((r) => (
                            <Chip
                              key={r.id}
                              label={r.displayName}
                              size="small"
                              color={r.name === 'admin' ? 'primary' : 'default'}
                            />
                          ))
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{formatDateTime(u.lastLoginAt)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={u.isActive}
                        onChange={() => handleToggleActive(u)}
                        color="success"
                        size="small"
                      />
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
          </TableContainer>
        )}
      </Card>

      {/* Dialog for Editing User Roles */}
      <Dialog open={Boolean(selectedUser)} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Назначение ролей</DialogTitle>
        <DialogContent dividers>
          {selectedUser && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {selectedUser.displayName} ({selectedUser.ldapLogin})
              </Typography>
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
                        <Typography variant="body2" fontWeight={500}>
                          {role.displayName}
                        </Typography>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Отмена
          </Button>
          <Button onClick={handleSaveRoles} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

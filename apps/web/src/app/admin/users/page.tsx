'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  TableSortLabel,
  Typography,
  Chip,
  Switch,
  IconButton,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Paper,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SecurityIcon from '@mui/icons-material/Security';
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

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortField, setSortField] = useState<string>('displayName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

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

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    enqueueSnackbar(`${label} скопирован в буфер обмена`, { variant: 'info' });
  };

  const handleRequestSort = (property: string) => {
    setSortDirection((prevDir) => (sortField === property && prevDir === 'asc' ? 'desc' : 'asc'));
    setSortField(property);
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const adminUsers = users.filter((u) => u.roles.some((r) => r.name === 'admin')).length;

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
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
  }, [users, roleFilter, searchQuery]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let aVal: any = a[sortField as keyof UserItem] ?? '';
      let bVal: any = b[sortField as keyof UserItem] ?? '';

      if (sortField === 'roles') {
        aVal = a.roles.map((r) => r.displayName).join(', ');
        bVal = b.roles.map((r) => r.displayName).join(', ');
      }

      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        return sortDirection === 'asc' ? (aVal === bVal ? 0 : aVal ? -1 : 1) : aVal === bVal ? 0 : aVal ? 1 : -1;
      }

      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal), 'ru')
        : String(bVal).localeCompare(String(aVal), 'ru');
    });
  }, [filteredUsers, sortField, sortDirection]);

  const paginatedUsers = useMemo(() => {
    return sortedUsers.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [sortedUsers, page, rowsPerPage]);

  return (
    <Box sx={{ width: '100%', pb: 2 }}>
      <PageHeader
        title="Учетные записи пользователей платформы"
        subtitle="Управление профилями, синхронизация с каталогом OpenLDAP/Active Directory и назначение ролей"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование', href: '/admin/settings' },
          { label: 'Учетные записи' },
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
            iconColor="primary.main"
            accentColor="primary.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Активных аккаунтов"
            value={activeUsers}
            subtitle="С разрешенным входом"
            icon={<VerifiedUserIcon sx={{ fontSize: 20 }} />}
            iconColor="success.main"
            accentColor="success.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Администраторов"
            value={adminUsers}
            subtitle="С полным доступом к системе"
            icon={<AdminPanelSettingsIcon sx={{ fontSize: 20 }} />}
            iconColor="secondary.main"
            accentColor="secondary.main"
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Users Registry Table */}
      {filteredUsers.length === 0 && !loading ? (
        <EmptyState
          paper
          icon={<PersonOutlineIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
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
          page={page}
          pageSize={rowsPerPage}
          total={filteredUsers.length}
          onPageChange={(_, newPage) => setPage(newPage)}
          onPageSizeChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          pageSizeOptions={[15, 25, 50, 100]}
          stickyHeader
          toolbar={
            <FilterToolbar
              variant="embedded"
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
                        backgroundColor: 'background.paper',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          fontSize: '0.8125rem',
                          height: 36,
                          '& fieldset': { borderColor: 'divider' },
                          '&:hover fieldset': { borderColor: 'grey.400' },
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
          }
        >
          <Table size="small" aria-label="Таблица пользователей системы">
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ minWidth: 200, fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === 'displayName'}
                    direction={sortField === 'displayName' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('displayName')}
                  >
                    ФИО / Пользователь
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ minWidth: 160, fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === 'ldapLogin'}
                    direction={sortField === 'ldapLogin' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('ldapLogin')}
                  >
                    Учетная запись (Логин)
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ minWidth: 170, fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === 'email'}
                    direction={sortField === 'email' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('email')}
                  >
                    Корпоративный Email
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ minWidth: 170, fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === 'roles'}
                    direction={sortField === 'roles' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('roles')}
                  >
                    Назначенные роли
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ minWidth: 170, fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === 'lastLoginAt'}
                    direction={sortField === 'lastLoginAt' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('lastLoginAt')}
                  >
                    Дата последнего входа
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ minWidth: 140, fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === 'isActive'}
                    direction={sortField === 'isActive' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('isActive')}
                  >
                    Статус доступа
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 100, fontWeight: 700 }}>Операции</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedUsers.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem', color: 'text.primary' }}>
                      {u.displayName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      <Chip
                        label={u.ldapLogin}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderRadius: '6px',
                          height: 22,
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          bgcolor: 'action.hover',
                        }}
                      />
                      <Tooltip title="Скопировать логин">
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(u.ldapLogin, 'Логин')}
                          sx={{ p: 0.25, color: 'text.secondary' }}
                        >
                          <ContentCopyIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>
                    {u.email ? (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                          {u.email}
                        </Typography>
                        <Tooltip title="Скопировать email">
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(u.email!, 'Email')}
                            sx={{ p: 0.25, color: 'text.secondary' }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      '—'
                    )}
                  </TableCell>
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
                  <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                    {formatDateTime(u.lastLoginAt)}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StatusBadge
                        status={u.isActive ? 'ACTIVE' : 'INACTIVE'}
                        label={u.isActive ? 'Активен' : 'Отключен'}
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
                    <Tooltip title="Настроить роли пользователя">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenEdit(u)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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
        title="Назначение ролей пользователя"
        subtitle={selectedUser ? `${selectedUser.displayName} (@${selectedUser.ldapLogin})` : undefined}
        icon={<AdminPanelSettingsIcon color="primary" />}
        maxWidth="xs"
        fullWidth
        loading={saving}
        submitLabel={saving ? 'Сохранение...' : 'Сохранить роли'}
        onSubmit={handleSaveRoles}
        submitDisabled={saving}
      >
        {selectedUser && (
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Выберите роли, предоставляющие доступ к функциональным модулям платформы:
            </Typography>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'background.default' }}>
              <FormGroup>
                {availableRoles.map((role) => (
                  <FormControlLabel
                    key={role.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedRoleIds.includes(role.id)}
                        onChange={() => handleToggleRole(role.id)}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}>
                        <SecurityIcon sx={{ fontSize: 16, color: role.name === 'admin' ? 'secondary.main' : 'primary.main' }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {role.displayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            {role.name}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            </Paper>
          </Box>
        )}
      </FormDialog>
    </Box>
  );
}

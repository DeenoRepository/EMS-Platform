'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';

export interface AuthorizedUser {
  id: string;
  displayName: string;
  ldapLogin: string;
  email?: string | null;
  roles?: string[];
}

export interface ResponsibleUserSelectProps {
  value: string;
  onChange: (displayName: string, user?: AuthorizedUser | null) => void;
  label?: string;
  placeholder?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: 'Администратор',
  administrator: 'Администратор',
  chief_engineer: 'Главный инженер',
  engineer: 'Инженер',
  chief_mechanic: 'Главный механик',
  mechanic: 'Механик',
  storekeeper: 'Кладовщик',
  operator: 'Оператор',
  auditor: 'Аудитор',
  security_auditor: 'ИБ-аудитор',
  user: 'Сотрудник',
};

export function ResponsibleUserSelect({
  value,
  onChange,
  label = 'Ответственное лицо (МОЛ)',
  placeholder = 'Выберите сотрудника из списка аккаунтов или введите ФИО',
  size = 'small',
  fullWidth = true,
  required = false,
  disabled = false,
  error = false,
  helperText,
}: ResponsibleUserSelectProps) {
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    async function fetchUsers() {
      setLoading(true);
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const json = await res.json();
          if (active && json.success && Array.isArray(json.data)) {
            setUsers(json.data);
            setLoaded(true);
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки пользователей проекта:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (!loaded) {
      fetchUsers();
    }

    return () => {
      active = false;
    };
  }, [loaded]);

  const selectedUser = useMemo(() => {
    if (!value) return null;
    return (
      users.find(
        (u) =>
          u.displayName.toLowerCase() === value.trim().toLowerCase() ||
          u.ldapLogin.toLowerCase() === value.trim().toLowerCase()
      ) || null
    );
  }, [value, users]);

  return (
    <Autocomplete
      freeSolo
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      options={users}
      getOptionLabel={(option) => {
        if (typeof option === 'string') return option;
        return option.displayName || option.ldapLogin || '';
      }}
      value={
        selectedUser ||
        (value
          ? ({ id: 'manual', displayName: value, ldapLogin: '' } as AuthorizedUser)
          : null)
      }
      isOptionEqualToValue={(option, val) => {
        if (!val) return false;
        return (
          option.id === val.id ||
          option.displayName.toLowerCase() === val.displayName.toLowerCase()
        );
      }}
      onInputChange={(_e, newInputValue, reason) => {
        if (reason === 'input' || reason === 'clear') {
          const matched = users.find(
            (u) =>
              u.displayName.toLowerCase() === newInputValue.trim().toLowerCase() ||
              u.ldapLogin.toLowerCase() === newInputValue.trim().toLowerCase()
          );
          onChange(newInputValue, matched || null);
        }
      }}
      onChange={(_e, newValue) => {
        if (!newValue) {
          onChange('', null);
        } else if (typeof newValue === 'string') {
          const matched = users.find(
            (u) =>
              u.displayName.toLowerCase() === newValue.trim().toLowerCase() ||
              u.ldapLogin.toLowerCase() === newValue.trim().toLowerCase()
          );
          onChange(newValue, matched || null);
        } else {
          onChange(newValue.displayName, newValue);
        }
      }}
      renderOption={(props, userOption) => {
        const primaryRole = userOption.roles?.[0]
          ? ROLE_DISPLAY_NAMES[userOption.roles[0]] || userOption.roles[0]
          : null;

        return (
          <Box
            component="li"
            {...props}
            key={userOption.id}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 0.5,
              py: 0.75,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonOutlineIcon fontSize="small" color="primary" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {userOption.displayName}
                </Typography>
              </Box>
              {primaryRole && (
                <Chip
                  label={primaryRole}
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 3 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                @{userOption.ldapLogin}
              </Typography>
              {userOption.email && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {userOption.email}
                </Typography>
              )}
            </Box>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          error={error}
          helperText={
            helperText ||
            (selectedUser
              ? `Учетная запись: @${selectedUser.ldapLogin} • ${
                  selectedUser.roles?.[0]
                    ? ROLE_DISPLAY_NAMES[selectedUser.roles[0]] || selectedUser.roles[0]
                    : 'Сотрудник'
                }`
              : 'Выберите сотрудника из списка аккаунтов проекта')
          }
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <InputAdornment position="start">
                  <BadgeOutlinedIcon fontSize="small" color={selectedUser ? 'primary' : 'action'} />
                </InputAdornment>
                {params.InputProps.startAdornment}
              </>
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

export default ResponsibleUserSelect;

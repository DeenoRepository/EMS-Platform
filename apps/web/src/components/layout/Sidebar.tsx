'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Tooltip,
} from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS } from '@ems/shared';

export const SIDEBAR_WIDTH_EXPANDED = 260;
export const SIDEBAR_WIDTH_COLLAPSED = 68;

interface NavItemDef {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number | null;
  badgeColor?: 'warning' | 'error' | 'primary' | 'default';
  permission?: string;
}

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  variant?: 'permanent' | 'temporary';
}

export default function Sidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
  variant = 'permanent',
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hasPermission } = useAuth();

  // Operational alert stats
  const [repairCount, setRepairCount] = useState<number | null>(null);

  // User Profile Menu Anchor
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/eps/equipment?pageSize=1');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.statusCounts) {
            setRepairCount(json.data.statusCounts.underRepair || null);
          }
        }
      } catch {
        // ignore
      }
    }
    loadStats();
  }, [pathname]);

  const handleNavigate = (path: string) => {
    router.push(path);
    if (variant === 'temporary') onClose();
  };

  const isItemActive = (item: NavItemDef) => {
    if (item.path === '/eps' && pathname.startsWith('/eps')) return true;
    if (item.path === '/wms' && pathname.startsWith('/wms')) return true;
    if (item.path === '/mro' && pathname.startsWith('/mro')) return true;
    if (item.path === '/srm' && pathname.startsWith('/srm')) return true;
    return pathname === item.path;
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
  };

  const canAccessAdmin = user?.roles.includes('admin') || hasPermission(PERMISSIONS.ADMIN_USERS_MANAGE);

  // Direct, single-level operational items
  const operationalItems: NavItemDef[] = [
    {
      id: 'eps',
      label: 'Оборудование (EPS)',
      path: '/eps',
      icon: <PrecisionManufacturingIcon sx={{ fontSize: 18 }} />,
      badge: repairCount && repairCount > 0 ? repairCount : null,
      badgeColor: 'warning',
      permission: PERMISSIONS.EPS_EQUIPMENT_VIEW,
    },
    {
      id: 'wms',
      label: 'Складской учёт (WMS)',
      path: '/wms',
      icon: <Inventory2Icon sx={{ fontSize: 18 }} />,
      permission: PERMISSIONS.WMS_STOCK_VIEW,
    },
    {
      id: 'srm',
      label: 'Дашборд Jira (SRM)',
      path: '/srm',
      icon: <AssessmentIcon sx={{ fontSize: 18 }} />,
      permission: PERMISSIONS.SRM_DASHBOARD_VIEW,
    },
    {
      id: 'mro',
      label: 'ТО и Ремонт (MRO)',
      path: '/mro',
      icon: <BuildCircleIcon sx={{ fontSize: 18 }} />,
      permission: PERMISSIONS.MRO_SCHEDULE_VIEW,
    },
  ];

  const adminItems: NavItemDef[] = [
    {
      id: 'users',
      label: 'Пользователи',
      path: '/admin/users',
      icon: <PeopleOutlineIcon sx={{ fontSize: 18 }} />,
    },
    {
      id: 'roles',
      label: 'Роли и права',
      path: '/admin/roles',
      icon: <SecurityIcon sx={{ fontSize: 18 }} />,
    },
    {
      id: 'module-settings',
      label: 'Справочники модулей',
      path: '/admin/module-settings',
      icon: <TuneIcon sx={{ fontSize: 18 }} />,
    },
    {
      id: 'audit-log',
      label: 'Журнал аудита',
      path: '/admin/audit-log',
      icon: <HistoryIcon sx={{ fontSize: 18 }} />,
    },
    {
      id: 'settings',
      label: 'Настройки системы',
      path: '/admin/settings',
      icon: <SettingsOutlinedIcon sx={{ fontSize: 18 }} />,
    },
  ];

  const getBadgeColors = (type?: string) => {
    switch (type) {
      case 'warning':
        return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
      case 'error':
        return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
      default:
        return { bg: '#eff6ff', text: '#0284c7', border: '#bfdbfe' };
    }
  };

  const renderNavBlock = (item: NavItemDef) => {
    if (item.permission && !hasPermission(item.permission)) return null;

    const active = isItemActive(item);
    const badgeColors = getBadgeColors(item.badgeColor);
    const hasBadge = item.badge !== null && item.badge !== undefined && item.badge > 0;

    if (collapsed) {
      return (
        <Tooltip key={item.id} title={item.label} placement="right">
          <Box
            onClick={() => handleNavigate(item.path)}
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 42,
              height: 42,
              mx: 'auto',
              my: 0.25,
              borderRadius: '8px',
              cursor: 'pointer',
              color: active ? '#0284c7' : '#64748b',
              backgroundColor: active ? '#eff6ff' : 'transparent',
              transition: 'all 0.15s ease',
              '&:hover': {
                backgroundColor: active ? '#eff6ff' : '#f8fafc',
                color: '#0284c7',
              },
            }}
          >
            {/* Active Left Pill Indicator */}
            {active && (
              <Box
                sx={{
                  position: 'absolute',
                  left: -10,
                  top: 8,
                  bottom: 8,
                  width: 3,
                  borderRadius: '0 3px 3px 0',
                  backgroundColor: '#0284c7',
                }}
              />
            )}

            {item.icon}

            {hasBadge && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  minWidth: 15,
                  height: 15,
                  borderRadius: '8px',
                  backgroundColor: badgeColors.text,
                  color: '#ffffff',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 0.3,
                  fontFamily: 'monospace',
                }}
              >
                {item.badge}
              </Box>
            )}
          </Box>
        </Tooltip>
      );
    }

    return (
      <Box key={item.id} sx={{ mb: 0.25 }}>
        <Box
          onClick={() => handleNavigate(item.path)}
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            py: 0.85,
            borderRadius: '6px',
            cursor: 'pointer',
            color: active ? '#0284c7' : '#334155',
            backgroundColor: active ? '#eff6ff' : 'transparent',
            transition: 'all 0.12s ease',
            '&:hover': {
              backgroundColor: active ? '#eff6ff' : '#f8fafc',
              color: '#0284c7',
            },
          }}
        >
          {/* Active Left Indicator Bar */}
          {active && (
            <Box
              sx={{
                position: 'absolute',
                left: -12,
                top: 5,
                bottom: 5,
                width: 3,
                borderRadius: '0 3px 3px 0',
                backgroundColor: '#0284c7',
              }}
            />
          )}

          {/* Left: Icon & Label */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, overflow: 'hidden', minWidth: 0, flexGrow: 1 }}>
            <Box sx={{ color: active ? '#0284c7' : '#64748b', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {item.icon}
            </Box>
            <Typography
              variant="body2"
              noWrap
              sx={{
                fontSize: '0.78125rem', // 12.5px
                fontWeight: active ? 600 : 500,
                color: active ? '#0284c7' : 'inherit',
              }}
            >
              {item.label}
            </Typography>
          </Box>

          {/* Right: Badge (strictly right-aligned) */}
          {hasBadge && (
            <Box
              sx={{
                px: 0.75,
                height: 18,
                borderRadius: '9px',
                backgroundColor: badgeColors.bg,
                color: badgeColors.text,
                border: `1px solid ${badgeColors.border}`,
                fontSize: '0.6875rem',
                fontWeight: 700,
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                ml: 'auto',
                flexShrink: 0,
              }}
            >
              {item.badge}
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  const currentWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <Box
      component="nav"
      sx={{
        width: currentWidth,
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        boxSizing: 'border-box',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        p: collapsed ? 1 : 1.5,
        zIndex: 100,
      }}
    >
      {/* Top Header: Brand Logo & Collapse Icon */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          mb: 2,
          minHeight: 38,
        }}
      >
        {/* Logo */}
        <Box
          onClick={() => {
            if (collapsed) {
              onToggleCollapse();
            } else {
              handleNavigate('/eps');
            }
          }}
          title={collapsed ? 'Развернуть меню' : 'Перейти на главную'}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            cursor: 'pointer',
            p: 0.25,
            borderRadius: '8px',
            '&:hover': { backgroundColor: collapsed ? '#f1f5f9' : 'transparent' },
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.05rem',
              letterSpacing: -0.5,
            }}
          >
            ◬
          </Box>
          {!collapsed && (
            <Box>
              <Typography variant="subtitle2" fontWeight={800} lineHeight={1.1} color="#0f172a">
                EMS
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={500} fontSize="0.65rem">
                Equipment OS
              </Typography>
            </Box>
          )}
        </Box>

        {/* Toggle Sidebar Collapse Button */}
        {!collapsed && (
          <IconButton
            size="small"
            onClick={onToggleCollapse}
            title="Свернуть меню"
            sx={{
              color: '#64748b',
              p: 0.5,
              borderRadius: '6px',
              '&:hover': { backgroundColor: '#f1f5f9', color: '#0f172a' },
            }}
          >
            <ViewSidebarOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>

      {/* Scrollable Navigation Body */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 0.25 }}>
        {/* Main Menu Section */}
        {!collapsed && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              px: 1.25,
              mb: 0.5,
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '0.04em',
            }}
          >
            ГЛАВНОЕ МЕНЮ
          </Typography>
        )}
        {operationalItems.map(renderNavBlock)}

        {/* Settings and Support Section */}
        {canAccessAdmin && (
          <Box sx={{ mt: 2.5 }}>
            {!collapsed && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  px: 1.25,
                  mb: 0.5,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  letterSpacing: '0.04em',
                }}
              >
                АДМИНИСТРИРОВАНИЕ
              </Typography>
            )}
            {adminItems.map(renderNavBlock)}
          </Box>
        )}
      </Box>

      {/* Bottom User Account Card with Integrated Popup Menu */}
      <Box
        onClick={handleProfileMenuOpen}
        sx={{
          pt: 1.25,
          mt: 'auto',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 1.25,
          cursor: 'pointer',
          p: 0.75,
          borderRadius: '8px',
          transition: 'background-color 0.15s ease',
          '&:hover': {
            backgroundColor: '#f8fafc',
          },
        }}
      >
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          variant="dot"
          sx={{
            '& .MuiBadge-badge': {
              backgroundColor: '#22c55e',
              boxShadow: '0 0 0 2px #ffffff',
              width: 8,
              height: 8,
              borderRadius: '4px',
            },
          }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              backgroundColor: '#0284c7',
              fontSize: '0.8125rem',
              fontWeight: 700,
            }}
          >
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
          </Avatar>
        </Badge>

        {!collapsed && (
          <Box sx={{ overflow: 'hidden', flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap fontSize="0.78125rem" color="#0f172a" lineHeight={1.2}>
              {user?.displayName || 'Администратор'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block" fontSize="0.6875rem">
              {user?.roles?.[0] || 'Инженер'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* User Profile / Logout Popover Menu */}
      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={handleProfileMenuClose}
        transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            minWidth: 220,
            ml: 1,
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0',
            p: 0.5,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} fontSize="0.8125rem">
            {user?.displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Логин: {user?.ldapLogin}
          </Typography>
          <Box sx={{ mt: 0.75, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {user?.roles.map((r) => (
              <Chip key={r} label={r} size="small" variant="outlined" color="primary" />
            ))}
          </Box>
        </Box>
        <Divider sx={{ my: 0.5 }} />
        {user?.roles.includes('admin') && (
          <MenuItem
            onClick={() => {
              handleProfileMenuClose();
              router.push('/admin/users');
            }}
            sx={{ borderRadius: '6px', py: 0.75 }}
          >
            <ListItemIcon>
              <AdminPanelSettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Пользователи и доступ" primaryTypographyProps={{ fontSize: '0.78125rem' }} />
          </MenuItem>
        )}
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main', borderRadius: '6px', py: 0.75 }}>
          <ListItemIcon sx={{ color: 'error.main' }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Выйти из системы" primaryTypographyProps={{ fontSize: '0.78125rem', fontWeight: 600 }} />
        </MenuItem>
      </Menu>
    </Box>
  );
}

'use client';

import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Chip,
  Tooltip,
  IconButton,
} from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS } from '@ems/shared';

export const SIDEBAR_WIDTH_EXPANDED = 260;
export const SIDEBAR_WIDTH_COLLAPSED = 72;

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
  const { user, hasPermission } = useAuth();

  const navigate = (path: string) => {
    router.push(path);
    if (variant === 'temporary') {
      onClose();
    }
  };

  const isActive = (path: string, exact = false) => {
    if (exact) return pathname === path;
    return pathname.startsWith(path);
  };

  const canAccessEps = hasPermission(PERMISSIONS.EPS_EQUIPMENT_VIEW);
  const canAccessWms = hasPermission(PERMISSIONS.WMS_STOCK_VIEW);
  const canAccessSrm = hasPermission(PERMISSIONS.SRM_DASHBOARD_VIEW);
  const canAccessMro = hasPermission(PERMISSIONS.MRO_SCHEDULE_VIEW);
  const canAccessAdmin = user?.roles.includes('admin') || hasPermission(PERMISSIONS.ADMIN_USERS_MANAGE);

  const drawerWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const renderNavItem = (
    label: string,
    path: string,
    icon: React.ReactNode,
    badge?: { label: string | number; color?: 'primary' | 'warning' | 'error' | 'default' }
  ) => {
    const active = isActive(path, path === '/eps');
    const button = (
      <ListItem disablePadding sx={{ display: 'block', mb: 0.5 }}>
        <ListItemButton
          onClick={() => navigate(path)}
          selected={active}
          sx={{
            minHeight: 44,
            px: collapsed ? 2.5 : 2,
            mx: collapsed ? 1 : 1.5,
            borderRadius: 2,
            justifyContent: collapsed ? 'center' : 'initial',
            '&.Mui-selected': {
              backgroundColor: 'rgba(2, 132, 199, 0.09)',
              color: 'primary.main',
              '&:hover': { backgroundColor: 'rgba(2, 132, 199, 0.14)' },
              '& .MuiListItemIcon-root': { color: 'primary.main' },
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: collapsed ? 0 : 2,
              justifyContent: 'center',
              color: active ? 'primary.main' : 'text.secondary',
            }}
          >
            {icon}
          </ListItemIcon>

          {!collapsed && (
            <ListItemText
              primary={label}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 500,
                noWrap: true,
              }}
            />
          )}

          {!collapsed && badge && (
            <Chip
              label={badge.label}
              size="small"
              color={badge.color || 'default'}
              sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
            />
          )}
        </ListItemButton>
      </ListItem>
    );

    if (collapsed) {
      return (
        <Tooltip key={path} title={label} placement="right" arrow>
          {button}
        </Tooltip>
      );
    }

    return <React.Fragment key={path}>{button}</React.Fragment>;
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Brand Header */}
      <Box
        sx={{
          p: collapsed ? 1.5 : 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 64,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => navigate('/eps')}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              backgroundColor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.2rem',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
            }}
          >
            E
          </Box>
          {!collapsed && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.1}>
                EMS
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                Управление оборудованием
              </Typography>
            </Box>
          )}
        </Box>

        {variant === 'permanent' && !collapsed && (
          <IconButton size="small" onClick={onToggleCollapse} sx={{ color: 'text.secondary' }}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Divider />

      {/* Navigation Body */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1.5 }}>
        <List disablePadding>
          {/* SECTION: ОПЕРАЦИОННЫЕ МОДУЛИ */}
          {!collapsed ? (
            <Box sx={{ px: 3, pt: 1, pb: 0.75 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.6} fontSize="0.7rem">
                ОПЕРАЦИОННЫЕ МОДУЛИ
              </Typography>
            </Box>
          ) : (
            <Divider sx={{ my: 1 }} />
          )}

          {canAccessEps && renderNavItem('EPS — Оборудование', '/eps', <PrecisionManufacturingIcon />)}
          {canAccessWms && renderNavItem('WMS — Складской учёт', '/wms', <Inventory2Icon />)}
          {canAccessSrm && renderNavItem('SRM — Дашборд Jira', '/srm', <AssessmentIcon />)}
          {canAccessMro && renderNavItem('MRO — ТО и Ремонт', '/mro', <BuildCircleIcon />)}

          {/* SECTION: АДМИНИСТРИРОВАНИЕ И НАСТРОЙКИ */}
          {canAccessAdmin && (
            <>
              <Divider sx={{ my: 1.5, mx: 2 }} />

              {!collapsed && (
                <Box sx={{ px: 3, pt: 0.5, pb: 0.75 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.6} fontSize="0.7rem">
                    АДМИНИСТРИРОВАНИЕ
                  </Typography>
                </Box>
              )}

              {renderNavItem('Пользователи', '/admin/users', <PeopleIcon />)}
              {renderNavItem('Роли и права', '/admin/roles', <SecurityIcon />)}
              {renderNavItem('Справочники модулей', '/admin/module-settings', <TuneIcon />)}
              {renderNavItem('Журнал аудита', '/admin/audit-log', <HistoryIcon />)}
              {renderNavItem('Настройки системы', '/admin/settings', <SettingsIcon />)}
            </>
          )}
        </List>
      </Box>

      {/* Footer Toggle / Version */}
      <Divider />
      <Box
        sx={{
          p: collapsed ? 1.5 : 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          backgroundColor: '#f8fafc',
        }}
      >
        {!collapsed && (
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            Версия 1.0.0
          </Typography>
        )}
        {variant === 'permanent' && (
          <IconButton size="small" onClick={onToggleCollapse} sx={{ color: 'text.secondary' }}>
            {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        )}
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{
        width: { sm: drawerWidth },
        flexShrink: { sm: 0 },
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {variant === 'temporary' ? (
        <Drawer
          variant="temporary"
          open={open}
          onClose={onClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: SIDEBAR_WIDTH_EXPANDED,
              borderRight: '1px solid #e2e8f0',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid #e2e8f0',
              transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              overflowX: 'hidden',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      )}
    </Box>
  );
}

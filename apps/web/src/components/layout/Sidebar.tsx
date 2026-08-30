'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
} from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import LogoutIcon from '@mui/icons-material/Logout';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS, PlatformMaintenanceStatus } from '@ems/shared';
import { applySidebarDataUpdate, loadSidebarData, type SidebarDataSetters } from './sidebar-load-data';
import { StatusBadge } from '@/components/ui';
import FeedbackDialog from '@/components/feedback/FeedbackDialog';
import {
  NavItemDef,
  getMainItems,
  getOperationalItems,
  getAdminItems,
} from './sidebar-items';
import SidebarNavGroup from './SidebarNavGroup';
import SidebarCollapsedFlyout from './SidebarCollapsedFlyout';

export const SIDEBAR_WIDTH_EXPANDED = 330;
export const SIDEBAR_WIDTH_COLLAPSED = 68;

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
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number | null>(null);
  const [rejectedApprovalsCount, setRejectedApprovalsCount] = useState<number | null>(null);
  const [wmsLowStockCount, setWmsLowStockCount] = useState<number | null>(null);
  const [wmsPendingTransfersCount, setWmsPendingTransfersCount] = useState<number | null>(null);
  const [wmsActiveInventoriesCount, setWmsActiveInventoriesCount] = useState<number | null>(null);
  const [srmOpenCount, setSrmOpenCount] = useState<number | null>(null);
  const [srmInProgressCount, setSrmInProgressCount] = useState<number | null>(null);
  const [mroOverdueCount, setMroOverdueCount] = useState<number | null>(null);
  const [mroPlannedCount, setMroPlannedCount] = useState<number | null>(null);

  // Expanded items in expanded sidebar mode
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    eps: pathname.startsWith('/eps'),
    wms: pathname.startsWith('/wms'),
    mro: pathname.startsWith('/mro'),
    srm: pathname.startsWith('/srm'),
    access: pathname.startsWith('/admin/users') || pathname.startsWith('/admin/roles'),
    'module-settings': pathname.startsWith('/admin/module-settings'),
  });

  // User Profile Menu Anchor
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);

  // Flyout Popover state for collapsed mode
  const [flyoutAnchor, setFlyoutAnchor] = useState<HTMLElement | null>(null);
  const [activeFlyoutItem, setActiveFlyoutItem] = useState<NavItemDef | null>(null);

  // Feedback dialog state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Module activation status state
  const [moduleStatus, setModuleStatus] = useState<Record<string, boolean>>({
    eps: true,
    wms: true,
    srm: true,
    mro: true,
  });

  const [maintenanceStatus, setMaintenanceStatus] = useState<PlatformMaintenanceStatus | null>(null);

  useEffect(() => {
    fetch('/api/system/maintenance')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setMaintenanceStatus(json.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const sidebarDataSetters: SidebarDataSetters = {
      setRepairCount,
      setModuleStatus,
      setPendingApprovalsCount,
      setRejectedApprovalsCount,
      setWmsLowStockCount,
      setWmsActiveInventoriesCount,
      setWmsPendingTransfersCount,
      setSrmOpenCount,
      setSrmInProgressCount,
      setMroOverdueCount,
      setMroPlannedCount,
    };

    async function loadData() {
      try {
        applySidebarDataUpdate(await loadSidebarData(), sidebarDataSetters);
      } catch {
        // ignore
      }
    }
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, [pathname]);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setFlyoutAnchor(null);
    setActiveFlyoutItem(null);
    if (variant === 'temporary') onClose();
  };

  const handleOpenFlyout = (event: React.MouseEvent<HTMLElement>, item: NavItemDef) => {
    if (!collapsed) return;
    if (item.children && item.children.length > 0) {
      setFlyoutAnchor(event.currentTarget);
      setActiveFlyoutItem(item);
    } else if (item.path) {
      handleNavigate(item.path);
    }
  };

  const isItemActive = (item: NavItemDef) => {
    if (item.path && pathname === item.path) return true;
    if (item.children && item.children.some((c) => pathname === c.path || (c.path !== '/' && pathname.startsWith(c.path)))) {
      return true;
    }
    return false;
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
  };

  const canAccess = useCallback(
    (nav?: { permission?: string; permissions?: string[] } | null) => {
      if (!nav) return true;
      if (user?.roles?.includes('admin')) return true;
      if (nav.permissions && nav.permissions.length > 0) {
        return nav.permissions.some((p) => hasPermission(p));
      }
      if (nav.permission) {
        return hasPermission(nav.permission);
      }
      return true;
    },
    [user, hasPermission]
  );

  const counts = useMemo(
    () => ({
      repairCount,
      pendingApprovalsCount,
      rejectedApprovalsCount,
      wmsLowStockCount,
      wmsPendingTransfersCount,
      wmsActiveInventoriesCount,
      srmOpenCount,
      srmInProgressCount,
      mroOverdueCount,
      mroPlannedCount,
    }),
    [
      repairCount,
      pendingApprovalsCount,
      rejectedApprovalsCount,
      wmsLowStockCount,
      wmsPendingTransfersCount,
      wmsActiveInventoriesCount,
      srmOpenCount,
      srmInProgressCount,
      mroOverdueCount,
      mroPlannedCount,
    ]
  );

  const mainItems = useMemo(() => getMainItems(), []);
  const operationalItems = useMemo(() => getOperationalItems(counts, maintenanceStatus), [counts, maintenanceStatus]);
  const adminItems = useMemo(() => getAdminItems(), []);

  const canAccessAdmin =
    user?.roles?.includes('admin') ||
    hasPermission(PERMISSIONS.ADMIN_USERS_MANAGE) ||
    hasPermission(PERMISSIONS.ADMIN_ROLES_MANAGE) ||
    hasPermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
    hasPermission(PERMISSIONS.ADMIN_AUDIT_VIEW);

  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <Box
      component="nav"
      sx={{
        width: { xs: '100%', sm: width },
        flexShrink: 0,
        height: '100%',
        backgroundColor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 10,
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Top Header & Brand Bar */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          px: collapsed ? 1 : 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        {collapsed ? (
          <Tooltip title="Развернуть меню" placement="right">
            <IconButton
              size="small"
              onClick={onToggleCollapse}
              sx={{
                color: 'text.secondary',
                p: 1,
                borderRadius: '8px',
                '&:hover': { backgroundColor: 'action.hover', color: 'primary.main' },
              }}
            >
              <MenuOpenIcon sx={{ fontSize: 20, transform: 'rotate(180deg)' }} />
            </IconButton>
          </Tooltip>
        ) : (
          <>
            <Box
              onClick={() => handleNavigate('/')}
              title="Перейти на главную"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                cursor: 'pointer',
                p: 0.25,
              }}
            >
              <Box
                component="img"
                src="/logo.png"
                alt="EMS Platform"
                sx={{
                  width: 34,
                  height: 34,
                  objectFit: 'contain',
                  flexShrink: 0,
                  transition: 'transform 0.15s ease',
                  '&:hover': { transform: 'scale(1.06)' },
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.6 }}>
                  <Typography
                    component="span"
                    sx={{
                      fontWeight: 800,
                      fontSize: '1.0625rem',
                      lineHeight: 1.1,
                      letterSpacing: '-0.02em',
                      color: 'text.primary',
                    }}
                  >
                    EMS
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.9375rem',
                      lineHeight: 1.1,
                      color: 'primary.main',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Platform
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 500,
                    fontSize: '0.6875rem',
                    display: 'block',
                    lineHeight: 1.15,
                    mt: 0.3,
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Система управления оборудованием
                </Typography>
              </Box>
            </Box>

            <IconButton
              size="small"
              onClick={onToggleCollapse}
              title="Свернуть меню"
              sx={{
                color: 'text.secondary',
                p: 0.5,
                borderRadius: '6px',
                '&:hover': { backgroundColor: 'action.hover', color: 'primary.main' },
              }}
            >
              <MenuOpenIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </>
        )}
      </Box>

      {/* Navigation Groups List */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          px: collapsed ? 0.75 : 1.5,
          py: 1,
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: '4px' },
        }}
      >
        {/* Main section */}
        {!collapsed && (
          <Typography variant="overline" sx={{ px: 1, color: 'text.secondary', fontWeight: 700, fontSize: '0.6875rem' }}>
            Главное
          </Typography>
        )}
        {mainItems.map((item) => (
          <SidebarNavGroup
            key={item.id}
            item={item}
            collapsed={collapsed}
            active={isItemActive(item)}
            expanded={expandedItems[item.id] || false}
            moduleDisabled={false}
            canAccess={canAccess}
            onToggleExpand={toggleExpand}
            onNavigate={handleNavigate}
            onOpenFlyout={handleOpenFlyout}
            currentPath={pathname}
          />
        ))}

        <Divider sx={{ my: 1.5, borderColor: 'divider' }} />

        {/* Operational Modules */}
        {!collapsed && (
          <Typography variant="overline" sx={{ px: 1, color: 'text.secondary', fontWeight: 700, fontSize: '0.6875rem' }}>
            Модули платформы
          </Typography>
        )}
        {operationalItems.map((item) => (
          <SidebarNavGroup
            key={item.id}
            item={item}
            collapsed={collapsed}
            active={isItemActive(item)}
            expanded={expandedItems[item.id] || false}
            moduleDisabled={moduleStatus[item.id] === false}
            canAccess={canAccess}
            onToggleExpand={toggleExpand}
            onNavigate={handleNavigate}
            onOpenFlyout={handleOpenFlyout}
            currentPath={pathname}
          />
        ))}

        {canAccessAdmin && (
          <>
            <Divider sx={{ my: 1.5, borderColor: 'divider' }} />
            {!collapsed && (
              <Typography variant="overline" sx={{ px: 1, color: 'text.secondary', fontWeight: 700, fontSize: '0.6875rem' }}>
                Администрирование
              </Typography>
            )}
            {adminItems.map((item) => (
              <SidebarNavGroup
                key={item.id}
                item={item}
                collapsed={collapsed}
                active={isItemActive(item)}
                expanded={expandedItems[item.id] || false}
                moduleDisabled={false}
                canAccess={canAccess}
                onToggleExpand={toggleExpand}
                onNavigate={handleNavigate}
                onOpenFlyout={handleOpenFlyout}
                currentPath={pathname}
              />
            ))}
          </>
        )}
      </Box>

      {/* Footer: Feedback & User Profile */}
      <Box
        sx={{
          p: collapsed ? 1 : 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          flexShrink: 0,
        }}
      >
        {/* Support Button */}
        <Box
          onClick={() => setIsFeedbackOpen(true)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 1.25,
            px: collapsed ? 0 : 1.25,
            py: 0.75,
            mb: 1,
            borderRadius: '8px',
            cursor: 'pointer',
            color: 'primary.main',
            backgroundColor: 'info.light',
            border: '1px solid',
            borderColor: 'primary.light',
            transition: 'all 0.15s ease',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <FeedbackOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          {!collapsed && (
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
              Поддержка и связь
            </Typography>
          )}
        </Box>

        {/* User profile tile */}
        <Box
          onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            p: 0.75,
            borderRadius: '8px',
            cursor: 'pointer',
            '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'primary.main',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                }}
              >
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </Avatar>
              <Box
                component="span"
                role="status"
                aria-label="Пользователь онлайн"
                sx={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  border: '2px solid background.paper',
                }}
              />
            </Box>
            {!collapsed && (
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    color: 'text.primary',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.displayName || 'Пользователь'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.6875rem',
                    display: 'block',
                    lineHeight: 1.2,
                  }}
                >
                  {user?.roles?.[0] || 'Инженер'}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Flyout Popover for Collapsed Mode */}
      <SidebarCollapsedFlyout
        anchorEl={flyoutAnchor}
        activeItem={activeFlyoutItem}
        currentPath={pathname}
        onClose={() => {
          setFlyoutAnchor(null);
          setActiveFlyoutItem(null);
        }}
        onNavigate={handleNavigate}
        canAccess={canAccess}
      />

      {/* Profile Menu Dropdown */}
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
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
            border: '1px solid',
            borderColor: 'divider',
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
            {user?.roles?.map((r) => (
              <StatusBadge key={r} status={r} label={r} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>
        <Divider sx={{ my: 0.5 }} />
        {user?.roles?.includes('admin') && (
          <MenuItem
            onClick={() => {
              handleProfileMenuClose();
              router.push('/admin/users');
            }}
            sx={{ borderRadius: '6px', py: 0.75 }}
          >
            <ListItemIcon>
              <GroupOutlinedIcon fontSize="small" />
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

      <FeedbackDialog open={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </Box>
  );
}

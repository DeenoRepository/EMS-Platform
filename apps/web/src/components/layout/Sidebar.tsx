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
  Collapse,
  Popover,
} from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import TimelineIcon from '@mui/icons-material/Timeline';
import SpeedIcon from '@mui/icons-material/Speed';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChecklistIcon from '@mui/icons-material/Checklist';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS } from '@ems/shared';

export const SIDEBAR_WIDTH_EXPANDED = 284;
export const SIDEBAR_WIDTH_COLLAPSED = 72;

interface NavChild {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

interface NavItemDef {
  id: string;
  label: string;
  path?: string;
  icon: React.ReactNode;
  badge?: number | null;
  badgeColor?: 'warning' | 'error' | 'primary' | 'default';
  permission?: string;
  children?: NavChild[];
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
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number | null>(null);

  // Expanded items in expanded sidebar mode
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    eps: pathname.startsWith('/eps'),
    wms: pathname.startsWith('/wms'),
    mro: pathname.startsWith('/mro'),
    srm: pathname.startsWith('/srm'),
  });

  // User Profile Menu Anchor
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);

  // Flyout Popover state for collapsed mode
  const [flyoutAnchor, setFlyoutAnchor] = useState<HTMLElement | null>(null);
  const [activeFlyoutItem, setActiveFlyoutItem] = useState<NavItemDef | null>(null);

  // Module activation status state
  const [moduleStatus, setModuleStatus] = useState<Record<string, boolean>>({
    eps: true,
    wms: true,
    srm: true,
    mro: true,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [eqRes, modRes, appRes] = await Promise.all([
          fetch('/api/eps/equipment?pageSize=1'),
          fetch('/api/modules/status'),
          fetch('/api/eps/approvals?pageSize=1'),
        ]);
        if (eqRes.ok) {
          const json = await eqRes.json();
          if (json.success && json.data?.statusCounts) {
            setRepairCount(json.data.statusCounts.underRepair || null);
          }
        }
        if (modRes.ok) {
          const modJson = await modRes.json();
          if (modJson.success && modJson.data) {
            setModuleStatus(modJson.data);
          }
        }
        if (appRes.ok) {
          const appJson = await appRes.json();
          if (appJson.success && appJson.data?.stats?.pending) {
            setPendingApprovalsCount(appJson.data.stats.pending || null);
          }
        }
      } catch {
        // ignore
      }
    }
    loadData();
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

  // Purely Operational Modules with Consistent Modern Outlined Icons
  const operationalItems: NavItemDef[] = [
    {
      id: 'eps',
      label: 'Паспортизация (EPS)',
      icon: <BadgeOutlinedIcon sx={{ fontSize: 18 }} />,
      badge:
        pendingApprovalsCount && pendingApprovalsCount > 0
          ? pendingApprovalsCount
          : repairCount && repairCount > 0
          ? repairCount
          : null,
      badgeColor: pendingApprovalsCount && pendingApprovalsCount > 0 ? 'warning' : 'default',
      permission: PERMISSIONS.EPS_EQUIPMENT_VIEW,
      children: [
        { label: 'Реестр оборудования', path: '/eps', icon: <FormatListBulletedIcon sx={{ fontSize: 15 }} /> },
        { label: 'Конструктор отчетов', path: '/eps/reports', icon: <AssessmentOutlinedIcon sx={{ fontSize: 15 }} /> },
        { label: 'Импорт оборудования', path: '/eps/import', icon: <FileUploadOutlinedIcon sx={{ fontSize: 15 }} /> },
        { label: 'Документы', path: '/eps/documents', icon: <ArticleOutlinedIcon sx={{ fontSize: 15 }} /> },
        { label: 'Согласования', path: '/eps/approvals', icon: <FactCheckOutlinedIcon sx={{ fontSize: 15 }} /> },
        { label: 'История изменений', path: '/eps/history', icon: <HistoryOutlinedIcon sx={{ fontSize: 15 }} /> },
      ],
    },
    {
      id: 'wms',
      label: 'Складской учёт (WMS)',
      icon: <WarehouseOutlinedIcon sx={{ fontSize: 18 }} />,
      permission: PERMISSIONS.WMS_STOCK_VIEW,
      children: [
        { label: 'Остатки номенклатуры', path: '/wms', icon: <FormatListBulletedIcon sx={{ fontSize: 15 }} /> },
        { label: 'Приход и списание ТМЦ', path: '/wms?tab=operations', icon: <MoveToInboxIcon sx={{ fontSize: 15 }} /> },
      ],
    },
    {
      id: 'srm',
      label: 'Дашборд Jira (SRM)',
      icon: <AnalyticsOutlinedIcon sx={{ fontSize: 18 }} />,
      permission: PERMISSIONS.SRM_DASHBOARD_VIEW,
      children: [
        { label: 'Инциденты и заявки', path: '/srm', icon: <TimelineIcon sx={{ fontSize: 15 }} /> },
        { label: 'Метрики MTTR / MTBF', path: '/srm?tab=metrics', icon: <SpeedIcon sx={{ fontSize: 15 }} /> },
      ],
    },
    {
      id: 'mro',
      label: 'ТО и Ремонт (MRO)',
      icon: <BuildOutlinedIcon sx={{ fontSize: 18 }} />,
      permission: PERMISSIONS.MRO_SCHEDULE_VIEW,
      children: [
        { label: 'Графики ППР', path: '/mro', icon: <CalendarMonthIcon sx={{ fontSize: 15 }} /> },
        { label: 'Журнал регламентов', path: '/mro?tab=logs', icon: <AssignmentTurnedInIcon sx={{ fontSize: 15 }} /> },
        { label: 'Технологические карты', path: '/mro?tab=checklists', icon: <ChecklistIcon sx={{ fontSize: 15 }} /> },
      ],
    },
  ];

  // Administration Section with Sub-groups
  const adminItems: NavItemDef[] = [
    {
      id: 'access',
      label: 'Управление доступом',
      icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 18 }} />,
      children: [
        { label: 'Пользователи', path: '/admin/users', icon: <GroupOutlinedIcon sx={{ fontSize: 15 }} /> },
        { label: 'Роли и права', path: '/admin/roles', icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 15 }} /> },
      ],
    },
    {
      id: 'module-settings',
      label: 'Настройки модулей',
      icon: <TuneOutlinedIcon sx={{ fontSize: 18 }} />,
      children: [
        { label: 'Паспортизация (EPS)', path: '/admin/module-settings?tab=eps', icon: <BadgeOutlinedIcon sx={{ fontSize: 15 }} /> },
        { label: 'Складской учёт (WMS)', path: '/admin/module-settings?tab=wms', icon: <WarehouseOutlinedIcon sx={{ fontSize: 15 }} /> },
        { label: 'Интеграция Jira (SRM)', path: '/admin/module-settings?tab=srm', icon: <AnalyticsOutlinedIcon sx={{ fontSize: 15 }} /> },
        { label: 'ТО и Ремонт (MRO)', path: '/admin/module-settings?tab=mro', icon: <BuildOutlinedIcon sx={{ fontSize: 15 }} /> },
      ],
    },
    {
      id: 'audit-log',
      label: 'Журнал аудита',
      path: '/admin/audit-log',
      icon: <ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} />,
    },
    {
      id: 'settings',
      label: 'Параметры системы',
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

    // If an operational module is disabled in system settings, hide it from operational menu
    if (operationalItems.some((op) => op.id === item.id) && moduleStatus[item.id] === false) {
      return null;
    }

    const active = isItemActive(item);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.id] || false;
    const badgeColors = getBadgeColors(item.badgeColor);
    const hasBadge = item.badge !== null && item.badge !== undefined && item.badge > 0;

    if (collapsed) {
      return (
        <Tooltip key={item.id} title={item.label} placement="right">
          <Box
            onClick={(e) => handleOpenFlyout(e, item)}
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
        {/* Main Item Row */}
        <Box
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.id);
            } else if (item.path) {
              handleNavigate(item.path);
            }
          }}
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            py: 0.75,
            borderRadius: '6px',
            cursor: 'pointer',
            color: active ? '#0284c7' : '#334155',
            backgroundColor: active && !hasChildren ? '#eff6ff' : 'transparent',
            transition: 'all 0.12s ease',
            '&:hover': {
              backgroundColor: active && !hasChildren ? '#eff6ff' : '#f8fafc',
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

          {/* Right: Badge (strictly right-aligned) & Chevron */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0, ml: 'auto', pl: 1 }}>
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
                }}
              >
                {item.badge}
              </Box>
            )}

            {hasChildren && (
              <Box sx={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                {isExpanded ? (
                  <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
                ) : (
                  <KeyboardArrowRightIcon sx={{ fontSize: 16 }} />
                )}
              </Box>
            )}
          </Box>
        </Box>

        {/* Children Sub-links (Accordion) with Centered Vertical Line */}
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box
              sx={{
                ml: '21px',
                pl: '14px',
                borderLeft: '1.5px solid #e2e8f0',
                my: 0.25,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
              }}
            >
              {item.children?.map((child) => {
                const isChildActive = pathname === child.path;
                return (
                  <Box
                    key={child.path + child.label}
                    onClick={() => handleNavigate(child.path)}
                    sx={{
                      px: 1.25,
                      py: 0.5,
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '0.75rem', // 12px
                      color: isChildActive ? '#0284c7' : '#64748b',
                      fontWeight: isChildActive ? 600 : 500,
                      backgroundColor: isChildActive ? '#eff6ff' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      transition: 'all 0.12s ease',
                      '&:hover': {
                        backgroundColor: isChildActive ? '#eff6ff' : '#f8fafc',
                        color: '#0284c7',
                      },
                    }}
                  >
                    {child.icon}
                    {child.label}
                  </Box>
                );
              })}
            </Box>
          </Collapse>
        )}
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
      {/* Top Header: Brand Logo / Expand Button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          mb: 2,
          minHeight: 38,
        }}
      >
        {collapsed ? (
          <Tooltip title="Развернуть меню" placement="right">
            <IconButton
              size="small"
              onClick={onToggleCollapse}
              sx={{
                width: 38,
                height: 38,
                borderRadius: '8px',
                color: '#0284c7',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                transition: 'all 0.15s ease',
                '&:hover': {
                  backgroundColor: '#e0f2fe',
                  borderColor: '#7dd3fc',
                  color: '#0369a1',
                  transform: 'scale(1.05)',
                },
              }}
            >
              <MenuOpenIcon sx={{ fontSize: 20, transform: 'rotate(180deg)' }} />
            </IconButton>
          </Tooltip>
        ) : (
          <>
            {/* Brand Logo & Professional Typography */}
            <Box
              onClick={() => handleNavigate('/eps')}
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
                  width: 32,
                  height: 32,
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 8px rgba(124, 58, 237, 0.25))',
                  flexShrink: 0,
                  transition: 'transform 0.15s ease',
                  '&:hover': {
                    transform: 'scale(1.06)',
                  },
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography
                    component="span"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.9375rem',
                      lineHeight: 1.1,
                      letterSpacing: '-0.02em',
                      color: '#0f172a',
                    }}
                  >
                    EMS
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      lineHeight: 1.1,
                      color: '#0284c7',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Platform
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    fontWeight: 500,
                    fontSize: '0.625rem',
                    display: 'block',
                    lineHeight: 1.1,
                    mt: 0.3,
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Управление оборудованием
                </Typography>
              </Box>
            </Box>

            {/* Toggle Sidebar Collapse Button */}
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
              <MenuOpenIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </>
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

        {/* Administration Section with Sub-groups */}
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

      {/* Collapsed Mode Flyout Popover */}
      <Popover
        open={Boolean(flyoutAnchor && activeFlyoutItem)}
        anchorEl={flyoutAnchor}
        onClose={() => {
          setFlyoutAnchor(null);
          setActiveFlyoutItem(null);
        }}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            ml: 1,
            p: 1.25,
            minWidth: 200,
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0',
          },
        }}
      >
        {activeFlyoutItem && (
          <Box>
            {/* Flyout Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 0.75, mb: 0.75, borderBottom: '1px solid #f1f5f9' }}>
              <Typography variant="subtitle2" fontWeight={700} color="#0284c7" fontSize="0.78125rem">
                {activeFlyoutItem.label}
              </Typography>
              {activeFlyoutItem.badge && (
                <Box
                  sx={{
                    px: 0.6,
                    py: 0.05,
                    borderRadius: '5px',
                    backgroundColor: '#dbeafe',
                    color: '#0284c7',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                  }}
                >
                  {activeFlyoutItem.badge}
                </Box>
              )}
            </Box>

            {/* Flyout Children List */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              {activeFlyoutItem.children?.map((child) => (
                <Box
                  key={child.path + child.label}
                  onClick={() => handleNavigate(child.path)}
                  sx={{
                    px: 1.25,
                    py: 0.6,
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '0.78125rem',
                    color: pathname === child.path ? '#0284c7' : '#334155',
                    fontWeight: pathname === child.path ? 600 : 500,
                    backgroundColor: pathname === child.path ? '#eff6ff' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.12s ease',
                    '&:hover': {
                      backgroundColor: '#f8fafc',
                      color: '#0284c7',
                    },
                  }}
                >
                  {child.icon}
                  {child.label}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Popover>

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
    </Box>
  );
}

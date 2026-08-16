'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Popover,
  InputBase,
  Collapse,
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
import SearchIcon from '@mui/icons-material/Search';
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
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
  shortLabel?: string;
  path?: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeColor?: string;
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
  const { user, hasPermission } = useAuth();

  // Search in sidebar
  const [searchTerm, setSearchTerm] = useState('');

  // Expanded items in expanded sidebar mode
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    eps: pathname.startsWith('/eps'),
    wms: pathname.startsWith('/wms'),
    mro: pathname.startsWith('/mro'),
  });

  // Flyout Popover state for collapsed mode
  const [flyoutAnchor, setFlyoutAnchor] = useState<HTMLElement | null>(null);
  const [activeFlyoutItem, setActiveFlyoutItem] = useState<NavItemDef | null>(null);

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
    if (item.children && item.children.some((c) => pathname === c.path || pathname.startsWith(c.path))) {
      return true;
    }
    return false;
  };

  const canAccessAdmin = user?.roles.includes('admin') || hasPermission(PERMISSIONS.ADMIN_USERS_MANAGE);

  // Define Navigation Structure with clean, non-truncating labels
  const operationalItems: NavItemDef[] = [
    {
      id: 'eps',
      label: 'Оборудование (EPS)',
      icon: <PrecisionManufacturingIcon sx={{ fontSize: 18 }} />,
      badge: 3,
      permission: PERMISSIONS.EPS_EQUIPMENT_VIEW,
      children: [
        { label: 'Реестр оборудования', path: '/eps', icon: <FormatListBulletedIcon sx={{ fontSize: 15 }} /> },
        { label: 'Добавить единицу', path: '/eps/new', icon: <AddCircleOutlineIcon sx={{ fontSize: 15 }} /> },
      ],
    },
    {
      id: 'wms',
      label: 'Складской учёт (WMS)',
      icon: <Inventory2Icon sx={{ fontSize: 18 }} />,
      permission: PERMISSIONS.WMS_STOCK_VIEW,
      children: [
        { label: 'Остатки и номенклатура', path: '/wms', icon: <FormatListBulletedIcon sx={{ fontSize: 15 }} /> },
        { label: 'Приход / Расход ТМЦ', path: '/wms', icon: <MoveToInboxIcon sx={{ fontSize: 15 }} /> },
      ],
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
      icon: <BuildCircleIcon sx={{ fontSize: 18 }} />,
      permission: PERMISSIONS.MRO_SCHEDULE_VIEW,
      children: [
        { label: 'Графики ППР', path: '/mro', icon: <CalendarMonthIcon sx={{ fontSize: 15 }} /> },
        { label: 'Регламентные чек-листы', path: '/mro', icon: <FormatListBulletedIcon sx={{ fontSize: 15 }} /> },
      ],
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

  const renderNavBlock = (item: NavItemDef) => {
    if (item.permission && !hasPermission(item.permission)) return null;

    const active = isItemActive(item);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.id] || false;

    if (collapsed) {
      return (
        <Box
          key={item.id}
          onClick={(e) => handleOpenFlyout(e, item)}
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
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

          {item.badge && (
            <Box
              sx={{
                position: 'absolute',
                top: 3,
                right: 3,
                minWidth: 14,
                height: 14,
                borderRadius: '7px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontSize: '0.6rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.3,
              }}
            >
              {item.badge}
            </Box>
          )}
        </Box>
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
            px: 1.25,
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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, overflow: 'hidden', minWidth: 0 }}>
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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0, ml: 0.5 }}>
            {item.badge && (
              <Box
                sx={{
                  px: 0.6,
                  py: 0.05,
                  borderRadius: '6px',
                  backgroundColor: active ? '#dbeafe' : '#f1f5f9',
                  color: active ? '#0284c7' : '#64748b',
                  fontSize: '0.65rem',
                  fontWeight: 700,
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

        {/* Children Sub-links (Accordion) */}
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box
              sx={{
                ml: 2,
                pl: 1.25,
                borderLeft: '1px solid #e2e8f0',
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
                      transition: 'all 0.12s ease',
                      '&:hover': {
                        backgroundColor: isChildActive ? '#eff6ff' : '#f8fafc',
                        color: '#0284c7',
                      },
                    }}
                  >
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
      {/* Top Header: Brand Logo & Collapse Icon */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          mb: 1.5,
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

      {/* Search Bar */}
      {!collapsed ? (
        <Box
          sx={{
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.25,
            py: 0.5,
            borderRadius: '6px',
            backgroundColor: '#f1f5f9',
            color: '#64748b',
          }}
        >
          <SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
          <InputBase
            placeholder="Поиск..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              fontSize: '0.78125rem',
              flexGrow: 1,
              '& input::placeholder': { color: '#94a3b8', opacity: 1 },
            }}
          />
        </Box>
      ) : (
        <Box
          onClick={onToggleCollapse}
          sx={{
            mb: 1.5,
            mx: 'auto',
            width: 36,
            height: 36,
            borderRadius: '6px',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            '&:hover': { backgroundColor: '#e2e8f0' },
          }}
        >
          <SearchIcon sx={{ fontSize: 16 }} />
        </Box>
      )}

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
          <Box sx={{ mt: 2 }}>
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

      {/* Bottom User Account Card */}
      <Box
        sx={{
          pt: 1.25,
          mt: 'auto',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 1.25,
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
            minWidth: 190,
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
    </Box>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Chip,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import NotificationCenter from './NotificationCenter';
import CommandPalette from './CommandPalette';
import { useAuth } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { PERMISSIONS } from '@ems/shared';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { user, hasPermission } = useAuth();
  const router = useRouter();

  // Command Palette State
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Quick Action Dropdown State
  const [createMenuAnchor, setCreateMenuAnchor] = useState<null | HTMLElement>(null);

  // Global keyboard shortcut for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenCreateMenu = (event: React.MouseEvent<HTMLElement>) => {
    setCreateMenuAnchor(event.currentTarget);
  };

  const handleCloseCreateMenu = () => {
    setCreateMenuAnchor(null);
  };

  const canCreateEquipment = hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE);
  const canAccessSettings = user?.roles.includes('admin') || hasPermission(PERMISSIONS.ADMIN_USERS_MANAGE);

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          color: '#0f172a',
          zIndex: 10,
        }}
      >
        <Toolbar sx={{ minHeight: 64, px: { xs: 2, sm: 3 }, display: 'flex', justifyContent: 'space-between' }}>
          {/* Left: Mobile Toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={onToggleSidebar}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          </Box>

          {/* Center: Command Palette Search Bar Trigger */}
          <Box
            onClick={() => setPaletteOpen(true)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: { xs: '100%', sm: 440, md: 540, lg: 620 },
              maxWidth: '100%',
              mx: 2,
              px: 2,
              py: 0.9,
              borderRadius: '12px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease',
              '&:hover': {
                backgroundColor: '#e2e8f0',
                borderColor: '#cbd5e1',
                color: '#0f172a',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
              <SearchIcon sx={{ fontSize: 20, color: '#0284c7' }} />
              <Typography variant="body2" noWrap sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Поиск оборудования, запчастей, документов...
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip
                label="Ctrl + K"
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              />
            </Box>
          </Box>

          {/* Right: Quick Action, Notifications, Settings */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Quick Action Button: + Создать */}
            {canCreateEquipment && (
              <>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleOpenCreateMenu}
                  sx={{
                    px: 2,
                    py: 0.85,
                    borderRadius: '10px',
                    fontWeight: 700,
                    textTransform: 'none',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  Создать
                </Button>

                <Menu
                  anchorEl={createMenuAnchor}
                  open={Boolean(createMenuAnchor)}
                  onClose={handleCloseCreateMenu}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  PaperProps={{
                    sx: {
                      minWidth: 240,
                      mt: 1,
                      borderRadius: '14px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      border: '1px solid #e2e8f0',
                      p: 0.5,
                    },
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      handleCloseCreateMenu();
                      router.push('/eps/new');
                    }}
                    sx={{ borderRadius: '8px', py: 1 }}
                  >
                    <ListItemIcon sx={{ color: '#0284c7' }}>
                      <PrecisionManufacturingIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Новое оборудование (EPS)" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }} />
                  </MenuItem>

                  <MenuItem
                    onClick={() => {
                      handleCloseCreateMenu();
                      router.push('/wms');
                    }}
                    sx={{ borderRadius: '8px', py: 1 }}
                  >
                    <ListItemIcon sx={{ color: '#16a34a' }}>
                      <Inventory2Icon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Приход ТМЦ на склад (WMS)" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }} />
                  </MenuItem>

                  <MenuItem
                    onClick={() => {
                      handleCloseCreateMenu();
                      router.push('/mro');
                    }}
                    sx={{ borderRadius: '8px', py: 1 }}
                  >
                    <ListItemIcon sx={{ color: '#d97706' }}>
                      <BuildCircleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Запланировать ТО (MRO)" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }} />
                  </MenuItem>
                </Menu>
              </>
            )}

            {/* Notification Center */}
            <NotificationCenter />

            {/* Settings Quick Link */}
            {canAccessSettings && (
              <Tooltip title="Справочники и настройки модулей">
                <IconButton
                  size="small"
                  onClick={() => router.push('/admin/module-settings')}
                  sx={{
                    color: '#64748b',
                    p: 1,
                    borderRadius: '10px',
                    '&:hover': { backgroundColor: '#f1f5f9', color: '#0f172a' },
                  }}
                >
                  <SettingsOutlinedIcon sx={{ fontSize: 22 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Global Command Palette Dialog */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Typography,
  Chip,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
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
              width: { xs: '100%', sm: 460, md: 580, lg: 680 },
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

          {/* Right: Notifications & Settings */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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

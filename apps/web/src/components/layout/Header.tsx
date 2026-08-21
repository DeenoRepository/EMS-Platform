'use client';

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationCenter from './NotificationCenter';
import CommandPalette from './CommandPalette';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed?: boolean;
}

export default function Header({ onToggleSidebar, sidebarCollapsed }: HeaderProps) {
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
          {/* Left: Mobile Toggle & Brand Logo when Sidebar is Collapsed */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={onToggleSidebar}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            {sidebarCollapsed && (
              <Box
                onClick={() => router.push('/eps')}
                title="Перейти на главную"
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  gap: 1.25,
                  cursor: 'pointer',
                  mr: 2.5,
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
                    filter: 'drop-shadow(0 2px 8px rgba(2, 132, 199, 0.3))',
                    flexShrink: 0,
                    transition: 'transform 0.15s ease',
                    '&:hover': {
                      transform: 'scale(1.06)',
                    },
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
                        color: '#0f172a',
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
            )}
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

          {/* Right: Notifications */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Notification Center */}
            <NotificationCenter />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Global Command Palette Dialog */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Header from './Header';
import Sidebar, { SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED } from './Sidebar';
import { usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const saved = localStorage.getItem('ems_sidebar_collapsed');
    if (saved !== null) {
      setCollapsed(saved === 'true');
    }
  }, []);

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      const next = !collapsed;
      setCollapsed(next);
      localStorage.setItem('ems_sidebar_collapsed', String(next));
    }
  };

  const handleToggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('ems_sidebar_collapsed', String(next));
  };

  // If on login or setup page, don't show Shell sidebar/header
  if (pathname.startsWith('/login') || pathname.startsWith('/setup')) {
    return <Box component="main">{children}</Box>;
  }

  const currentSidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        '@media print': {
          display: 'block !important',
          backgroundColor: 'background.paper !important',
          minHeight: 'auto !important',
        },
      }}
    >
      {/* Sidebar Navigation */}
      <Box className="no-print" sx={{ display: { print: 'none' } }}>
        <Sidebar
          open={mobileOpen}
          collapsed={collapsed}
          onClose={() => setMobileOpen(false)}
          onToggleCollapse={handleToggleCollapse}
          variant={isMobile ? 'temporary' : 'permanent'}
        />
      </Box>

      {/* Main Content Area */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          width: { sm: `calc(100% - ${currentSidebarWidth}px)` },
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '@media print': {
            width: '100% !important',
            maxWidth: '100% !important',
            display: 'block !important',
            margin: '0 !important',
            padding: '0 !important',
          },
        }}
      >
        <Box className="no-print" sx={{ display: { print: 'none' } }}>
          <Header onToggleSidebar={handleDrawerToggle} sidebarCollapsed={collapsed} />
        </Box>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 1.5, sm: 2, md: 2.5 },
            maxWidth: '100%',
            width: '100%',
            boxSizing: 'border-box',
            '@media print': {
              p: '0 !important',
              m: '0 !important',
              width: '100% !important',
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

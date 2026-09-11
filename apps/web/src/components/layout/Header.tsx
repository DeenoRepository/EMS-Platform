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
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import NotificationCenter from './NotificationCenter';
import FeedbackDialog from '@/components/feedback/FeedbackDialog';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed?: boolean;
}

export default function Header({ onToggleSidebar, sidebarCollapsed }: HeaderProps) {
  const router = useRouter();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenFeedback = (e: any) => {
      if (e.detail?.ticketId) {
        setSelectedTicketId(e.detail.ticketId);
      } else {
        setSelectedTicketId(null);
      }
      setFeedbackOpen(true);
    };

    window.addEventListener('open-feedback-dialog', handleOpenFeedback);
    return () => window.removeEventListener('open-feedback-dialog', handleOpenFeedback);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ticketIdParam = params.get('feedbackTicketId');
      if (ticketIdParam) {
        setSelectedTicketId(ticketIdParam);
        setFeedbackOpen(true);
      }
    }
  }, []);

  const handleOpenCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

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
                onClick={() => router.push('/')}
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
            onClick={handleOpenCommandPalette}
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

          {/* Right: Feedback & Notifications */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Feedback Button */}
            <Tooltip title="Обратная связь и техподдержка (сообщить об ошибке)">
              <IconButton
                onClick={() => {
                  setSelectedTicketId(null);
                  setFeedbackOpen(true);
                }}
                sx={{
                  color: '#475569',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '10px',
                  p: 1,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    color: '#0284c7',
                    backgroundColor: '#e0f2fe',
                  },
                }}
              >
                <FeedbackOutlinedIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>

            {/* Notification Center */}
            <NotificationCenter />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Global Feedback Dialog */}
      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => {
          setFeedbackOpen(false);
          setSelectedTicketId(null);
        }}
        initialTicketId={selectedTicketId}
      />
    </>
  );
}

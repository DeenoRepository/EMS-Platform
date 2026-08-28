'use client';

import React from 'react';
import {
  Popover,
  Paper,
  Box,
  Typography,
  Divider,
  Tooltip,
} from '@mui/material';
import { NavItemDef, getBadgeColors } from './sidebar-items';

interface SidebarCollapsedFlyoutProps {
  anchorEl: HTMLElement | null;
  activeItem: NavItemDef | null;
  currentPath: string;
  onClose: () => void;
  onNavigate: (path: string) => void;
  canAccess: (item?: { permission?: string; permissions?: string[] } | null) => boolean;
}

export function SidebarCollapsedFlyout({
  anchorEl,
  activeItem,
  currentPath,
  onClose,
  onNavigate,
  canAccess,
}: SidebarCollapsedFlyoutProps) {
  if (!activeItem) return null;

  const visibleChildren = activeItem.children ? activeItem.children.filter((c) => canAccess(c)) : [];

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
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
          borderRadius: '8px',
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          minWidth: 220,
          p: 0.5,
        },
      }}
    >
      <Paper elevation={0} sx={{ p: 0.5, backgroundColor: 'transparent' }}>
        <Typography
          variant="subtitle2"
          sx={{
            px: 1.5,
            py: 0.75,
            fontWeight: 700,
            color: 'text.primary',
            fontSize: '0.8125rem',
          }}
        >
          {activeItem.label}
        </Typography>
        <Divider sx={{ my: 0.5, borderColor: 'divider' }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          {visibleChildren.map((child) => {
            const childActive = currentPath === child.path;
            const childBadgeColor = getBadgeColors(child.badgeColor);
            const hasChildBadge = Boolean(child.badge && child.badge > 0);

            return (
              <Box
                key={child.path}
                onClick={() => onNavigate(child.path)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 1.25,
                  py: 0.6,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: childActive ? 'primary.main' : 'text.primary',
                  backgroundColor: childActive ? 'action.selected' : 'transparent',
                  transition: 'all 0.1s ease',
                  '&:hover': {
                    backgroundColor: childActive ? 'action.selected' : 'action.hover',
                    color: 'primary.main',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  {child.icon && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        color: childActive ? 'primary.main' : 'text.secondary',
                        fontSize: 15,
                      }}
                    >
                      {child.icon}
                    </Box>
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.8125rem',
                      fontWeight: childActive ? 600 : 400,
                      color: childActive ? 'primary.main' : 'text.primary',
                    }}
                  >
                    {child.label}
                  </Typography>
                </Box>

                {hasChildBadge && (
                  <Tooltip title={child.badgeTooltip || ''} arrow placement="right">
                    <Box
                      sx={{
                        minWidth: 16,
                        height: 16,
                        borderRadius: '8px',
                        backgroundColor: childBadgeColor.bg,
                        color: childBadgeColor.text,
                        border: '1px solid',
                        borderColor: childBadgeColor.border,
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 0.4,
                        fontFamily: 'monospace',
                      }}
                    >
                      {child.badge}
                    </Box>
                  </Tooltip>
                )}
              </Box>
            );
          })}
        </Box>
      </Paper>
    </Popover>
  );
}

export default SidebarCollapsedFlyout;

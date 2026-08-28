'use client';

import React from 'react';
import {
  Box,
  Typography,
  Collapse,
  Tooltip,
} from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { NavItemDef, getBadgeColors } from './sidebar-items';

interface SidebarNavGroupProps {
  item: NavItemDef;
  collapsed: boolean;
  active: boolean;
  expanded: boolean;
  moduleDisabled: boolean;
  canAccess: (item?: { permission?: string; permissions?: string[] } | null) => boolean;
  onToggleExpand: (id: string) => void;
  onNavigate: (path: string) => void;
  onOpenFlyout: (event: React.MouseEvent<HTMLElement>, item: NavItemDef) => void;
  currentPath: string;
}

export function SidebarNavGroup({
  item,
  collapsed,
  active,
  expanded,
  moduleDisabled,
  canAccess,
  onToggleExpand,
  onNavigate,
  onOpenFlyout,
  currentPath,
}: SidebarNavGroupProps) {
  if (!canAccess(item) || moduleDisabled) return null;

  const visibleChildren = item.children ? item.children.filter((c) => canAccess(c)) : [];
  const hasChildren = visibleChildren.length > 0;

  if (item.children && item.children.length > 0 && visibleChildren.length === 0 && !item.path) {
    return null;
  }

  const parentBadgeCount =
    hasChildren
      ? visibleChildren.reduce((acc, c) => acc + (c.badge && c.badge > 0 ? c.badge : 0), 0) || item.badge
      : item.badge;

  const effectiveBadgeColor = (() => {
    if (hasChildren) {
      if (visibleChildren.some((c) => c.badge && c.badge > 0 && c.badgeColor === 'error')) return 'error';
      if (visibleChildren.some((c) => c.badge && c.badge > 0 && c.badgeColor === 'warning')) return 'warning';
      const firstWithBadge = visibleChildren.find((c) => c.badge && c.badge > 0);
      if (firstWithBadge?.badgeColor) return firstWithBadge.badgeColor;
    }
    return item.badgeColor || 'default';
  })();

  const effectiveBadgeTooltip = (() => {
    if (hasChildren) {
      const activeChildrenWithBadge = visibleChildren.filter((c) => c.badge && c.badge > 0 && c.badgeTooltip);
      if (activeChildrenWithBadge.length > 0) {
        return activeChildrenWithBadge.map((c) => c.badgeTooltip).join(' • ');
      }
    }
    return item.badgeTooltip || undefined;
  })();

  const badgeColors = getBadgeColors(effectiveBadgeColor);
  const parentBadgeDisplay = item.badgeText || (parentBadgeCount && parentBadgeCount > 0 ? parentBadgeCount : null);
  const hasBadge = Boolean(parentBadgeDisplay);

  if (collapsed) {
    return (
      <Tooltip title={item.label} placement="right">
        <Box
          onClick={(e) => onOpenFlyout(e, item)}
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
            color: active ? 'primary.light' : 'text.disabled',
            backgroundColor: active ? 'action.selected' : 'transparent',
            transition: 'all 0.15s ease',
            '&:hover': {
              backgroundColor: active ? 'action.selected' : 'action.hover',
              color: 'primary.light',
            },
          }}
        >
          {active && (
            <Box
              sx={{
                position: 'absolute',
                left: -10,
                top: 8,
                bottom: 8,
                width: 3,
                borderRadius: '0 3px 3px 0',
                backgroundColor: 'primary.light',
              }}
            />
          )}

          {item.icon}

          {hasBadge && (
            <Tooltip title={effectiveBadgeTooltip || (item.badgeText ? item.badgeText : `${parentBadgeCount} событий`)} arrow placement="right">
              <Box
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 2,
                  minWidth: item.badgeText ? 24 : 15,
                  height: 15,
                  borderRadius: '8px',
                  backgroundColor: item.badgeText ? 'grey.700' : badgeColors.text,
                  color: item.badgeText ? 'grey.50' : 'text.primary',
                  fontSize: item.badgeText ? '0.55rem' : '0.625rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: item.badgeText ? 0.4 : 0.3,
                  fontFamily: item.badgeText ? 'inherit' : 'monospace',
                }}
              >
                {parentBadgeDisplay}
              </Box>
            </Tooltip>
          )}
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box sx={{ mb: 0.25 }}>
      <Box
        onClick={() => {
          if (hasChildren) {
            onToggleExpand(item.id);
          } else if (item.path) {
            onNavigate(item.path);
          }
        }}
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pl: 1,
          pr: 0.5,
          py: 0.7,
          borderRadius: '6px',
          cursor: 'pointer',
          color: active ? 'primary.light' : 'grey.300',
          backgroundColor: active && !hasChildren ? 'action.selected' : 'transparent',
          transition: 'all 0.12s ease',
          '&:hover': {
            backgroundColor: active && !hasChildren ? 'action.selected' : 'action.hover',
            color: 'common.white',
          },
        }}
      >
        {active && (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 6,
              bottom: 6,
              width: 3,
              borderRadius: '0 3px 3px 0',
              backgroundColor: 'primary.light',
            }}
          />
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: active ? 'primary.light' : 'text.disabled',
              flexShrink: 0,
            }}
          >
            {item.icon}
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.8125rem',
              fontWeight: active ? 700 : 500,
              color: active ? 'common.white' : 'grey.300',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.label}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
          {hasBadge && (
            <Tooltip title={effectiveBadgeTooltip || ''} arrow placement="top">
              <Box
                sx={{
                  minWidth: item.badgeText ? 24 : 16,
                  height: 16,
                  borderRadius: '8px',
                  backgroundColor: item.badgeText ? 'grey.700' : badgeColors.bg,
                  color: item.badgeText ? 'grey.50' : badgeColors.text,
                  border: '1px solid',
                  borderColor: item.badgeText ? 'transparent' : badgeColors.border,
                  fontSize: item.badgeText ? '0.55rem' : '0.625rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: item.badgeText ? 0.4 : 0.4,
                  fontFamily: item.badgeText ? 'inherit' : 'monospace',
                }}
              >
                {parentBadgeDisplay}
              </Box>
            </Tooltip>
          )}

          {hasChildren && (
            <Box sx={{ color: 'text.disabled', display: 'flex', alignItems: 'center' }}>
              {expanded ? (
                <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
              ) : (
                <KeyboardArrowRightIcon sx={{ fontSize: 16 }} />
              )}
            </Box>
          )}
        </Box>
      </Box>

      {hasChildren && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ pl: 2.5, pr: 0.5, py: 0.25, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
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
                    px: 1,
                    py: 0.55,
                    borderRadius: '5px',
                    cursor: 'pointer',
                    color: childActive ? 'primary.light' : 'grey.400',
                    backgroundColor: childActive ? 'action.selected' : 'transparent',
                    transition: 'all 0.1s ease',
                    '&:hover': {
                      backgroundColor: childActive ? 'action.selected' : 'action.hover',
                      color: 'common.white',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    {child.icon && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          color: childActive ? 'primary.light' : 'text.disabled',
                          fontSize: 15,
                        }}
                      >
                        {child.icon}
                      </Box>
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: childActive ? 600 : 400,
                        color: childActive ? 'common.white' : 'grey.400',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {child.label}
                    </Typography>
                  </Box>

                  {hasChildBadge && (
                    <Tooltip title={child.badgeTooltip || ''} arrow placement="top">
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
        </Collapse>
      )}
    </Box>
  );
}

export default SidebarNavGroup;

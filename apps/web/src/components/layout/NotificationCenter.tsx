'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Divider,
  CircularProgress,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import BuildIcon from '@mui/icons-material/Build';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { formatDateTime } from '@ems/shared';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationCenter() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setNotifications(json.data.notifications || []);
          setUnreadCount(json.data.unreadCount || 0);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleMarkItemRead = async (id: string, link?: string | null) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (link) {
        window.location.href = link;
      }
    } catch {
      // ignore
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'MAINTENANCE_UPCOMING':
      case 'MAINTENANCE_MISSED':
        return <BuildIcon color="primary" fontSize="small" />;
      case 'LOW_STOCK':
        return <Inventory2Icon color="warning" fontSize="small" />;
      case 'SLA_BREACH':
        return <WarningAmberIcon color="error" fontSize="small" />;
      default:
        return <InfoOutlinedIcon color="info" fontSize="small" />;
    }
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton color="inherit" onClick={handleClick} sx={{ mr: 1 }} aria-label="Уведомления">
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 380, maxHeight: 480, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Уведомления {unreadCount > 0 && `(${unreadCount})`}
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<DoneAllIcon />}
              onClick={handleMarkAllAsRead}
              disabled={loading}
            >
              Прочитать все
            </Button>
          )}
        </Box>
        <Divider />

        <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <NotificationsIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
              <Typography variant="body2">Нет новых уведомлений</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((item) => (
                <ListItem
                  key={item.id}
                  button
                  onClick={() => handleMarkItemRead(item.id, item.link)}
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: item.isRead ? 'transparent' : 'rgba(2, 132, 199, 0.04)',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{getNotificationIcon(item.type)}</ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" fontWeight={item.isRead ? 500 : 700}>
                        {item.title}
                      </Typography>
                    }
                    secondary={
                      <React.Fragment>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {item.message}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                          {formatDateTime(item.createdAt)}
                        </Typography>
                      </React.Fragment>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}

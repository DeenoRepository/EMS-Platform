'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  TextField,
  Button,
  CircularProgress,
  Divider,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CommentIcon from '@mui/icons-material/Comment';
import { formatDateTime } from '@ems/shared';

export interface ActivityFeedItem {
  id: string;
  author: {
    name: string;
    login?: string;
    avatar?: string;
    role?: string;
  };
  content: string;
  createdAt: string;
  type?: 'comment' | 'system' | 'status_change';
}

export interface ActivityFeedProps {
  items: ActivityFeedItem[];
  onAddComment?: (content: string) => void | Promise<void>;
  submitting?: boolean;
  loading?: boolean;
  title?: string;
  paper?: boolean;
  placeholder?: string;
  className?: string;
}

export function ActivityFeed({
  items,
  onAddComment,
  submitting = false,
  loading = false,
  title = 'История активности и комментарии',
  paper = true,
  placeholder = 'Написать комментарий или служебную записку...',
  className,
}: ActivityFeedProps) {
  const [commentText, setCommentText] = useState('');

  const handleSend = async () => {
    if (!commentText.trim() || submitting || !onAddComment) return;
    await onAddComment(commentText.trim());
    setCommentText('');
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (name[0] || 'U').toUpperCase();
  };

  const content = (
    <Box className={className} sx={{ p: paper ? { xs: 2, sm: 2.5 } : 0 }}>
      {title && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CommentIcon fontSize="small" color="primary" />
          <Typography variant="subtitle1" fontWeight={700}>
            {title} ({items.length})
          </Typography>
        </Box>
      )}

      {/* Input box */}
      {onAddComment && (
        <Box sx={{ mb: 3 }}>
          <TextField
            multiline
            rows={2}
            fullWidth
            size="small"
            placeholder={placeholder}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={submitting}
            sx={{ bgcolor: 'background.paper', mb: 1 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              disabled={!commentText.trim() || submitting}
              startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}
              onClick={handleSend}
              sx={{ fontWeight: 600 }}
            >
              {submitting ? 'Отправка...' : 'Отправить'}
            </Button>
          </Box>
        </Box>
      )}

      {onAddComment && items.length > 0 && <Divider sx={{ mb: 2.5 }} />}

      {/* Items list */}
      {loading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          Комментариев и записей пока нет
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((item) => (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                gap: 1.5,
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: item.type === 'system' ? 'grey.50' : 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Avatar
                src={item.author.avatar}
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  bgcolor: item.type === 'system' ? 'grey.400' : 'primary.main',
                }}
              >
                {getInitials(item.author.name)}
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {item.author.name}
                    </Typography>
                    {item.author.login && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        @{item.author.login}
                      </Typography>
                    )}
                    {item.author.role && (
                      <Typography variant="caption" sx={{ bgcolor: 'grey.100', px: 0.75, py: 0.1, borderRadius: 1 }}>
                        {item.author.role}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFeatureSettings: '"tnum"' }}>
                    {formatDateTime(item.createdAt)}
                  </Typography>
                </Box>

                <Typography
                  variant="body2"
                  color="text.primary"
                  sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5, fontSize: '0.8125rem' }}
                >
                  {item.content}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );

  if (paper) {
    return (
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        {content}
      </Paper>
    );
  }

  return content;
}

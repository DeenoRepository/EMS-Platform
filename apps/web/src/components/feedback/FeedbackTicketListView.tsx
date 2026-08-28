'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { StatusBadge, EmptyState } from '@/components/ui';
import {
  FeedbackTicketDto,
  FEEDBACK_MODULE_LABELS,
  formatDateTime,
} from '@ems/shared';

interface FeedbackTicketListViewProps {
  loading: boolean;
  tickets: FeedbackTicketDto[];
  onSelectTicket: (ticket: FeedbackTicketDto) => void;
  onCreateNew: () => void;
}

export function FeedbackTicketListView({
  loading,
  tickets,
  onSelectTicket,
  onCreateNew,
}: FeedbackTicketListViewProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (tickets.length === 0) {
    return (
      <EmptyState
        title="У вас пока нет обращений"
        description="Если вы столкнулись с ошибкой или хотите предложить новую функцию, заполните форму во вкладке «Подать обращение»."
        actionText="Создать обращение"
        onAction={onCreateNew}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 420, overflowY: 'auto' }}>
      {tickets.map((ticket) => (
        <Paper
          key={ticket.id}
          onClick={() => onSelectTicket(ticket)}
          elevation={0}
          sx={{
            p: 2,
            borderRadius: '12px',
            border: '1px solid',
            borderColor: 'divider',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'background.default',
              transform: 'translateY(-1px)',
              boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.common.black, 0.05)}`,
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {ticket.ticketNumber}
              </Typography>
              <StatusBadge status={ticket.type} />
            </Box>
            <StatusBadge status={ticket.status} />
          </Box>

          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
            {ticket.title}
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {FEEDBACK_MODULE_LABELS[ticket.module] || ticket.module} • {formatDateTime(ticket.createdAt)}
            </Typography>

            {ticket.commentsCount && ticket.commentsCount > 0 ? (
              <Chip
                label={`${ticket.commentsCount} сообщений`}
                size="small"
                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, backgroundColor: 'info.light', color: 'info.dark' }}
              />
            ) : null}
          </Box>
        </Paper>
      ))}
    </Box>
  );
}

export default FeedbackTicketListView;

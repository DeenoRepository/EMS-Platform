'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  CircularProgress,
  TextField,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import { StatusBadge } from '@/components/ui';
import {
  FeedbackTicketDto,
  FEEDBACK_MODULE_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  formatDateTime,
  formatBytes,
} from '@ems/shared';

interface FeedbackTicketDetailViewProps {
  selectedTicket: FeedbackTicketDto;
  loadingSelected: boolean;
  replyMessage: string;
  sendingReply: boolean;
  onBack: () => void;
  onReplyMessageChange: (val: string) => void;
  onSendReply: () => void;
}

export function FeedbackTicketDetailView({
  selectedTicket,
  loadingSelected,
  replyMessage,
  sendingReply,
  onBack,
  onReplyMessageChange,
  onSendReply,
}: FeedbackTicketDetailViewProps) {
  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={onBack}
        sx={{ mb: 2, textTransform: 'none', fontWeight: 600 }}
        size="small"
      >
        Назад к списку обращений
      </Button>

      {loadingSelected ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Box>
          {/* Header Details */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.default',
              mb: 2.5,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {selectedTicket.ticketNumber} — {selectedTicket.title}
                </Typography>
              </Box>
              <StatusBadge status={selectedTicket.status} />
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
              <StatusBadge status={selectedTicket.type} />
              <Chip
                label={FEEDBACK_MODULE_LABELS[selectedTicket.module] || selectedTicket.module}
                size="small"
                sx={{ height: 22, fontSize: '0.75rem' }}
              />
              <StatusBadge
                status={selectedTicket.priority}
                label={`Приоритет: ${FEEDBACK_PRIORITY_LABELS[selectedTicket.priority]?.label || selectedTicket.priority}`}
                size="small"
              />
              <Typography variant="caption" sx={{ color: 'text.disabled', alignSelf: 'center' }}>
                Создано: {formatDateTime(selectedTicket.createdAt)}
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap' }}>
              {selectedTicket.description}
            </Typography>

            {/* Attached files */}
            {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
              <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed', borderTopColor: 'grey.300' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
                  Прикрепленные файлы:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedTicket.attachments.map((att) => (
                    <Chip
                      key={att.id}
                      component="a"
                      href={`/api/files/${att.filePath}`}
                      target="_blank"
                      clickable
                      icon={<AttachFileIcon sx={{ fontSize: 16 }} />}
                      label={`${att.originalName} (${formatBytes(att.fileSize)})`}
                      size="small"
                      sx={{ borderRadius: '6px', backgroundColor: 'background.paper', border: '1px solid', borderColor: 'grey.300' }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Resolution note */}
            {selectedTicket.resolution && (
              <Alert severity="success" icon={<CheckCircleOutlineIcon />} sx={{ mt: 2, borderRadius: '8px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Резолюция администратора:
                </Typography>
                <Typography variant="body2">{selectedTicket.resolution}</Typography>
              </Alert>
            )}
          </Paper>

          {/* Chat / Comments Thread */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>
            История переписки ({selectedTicket.comments?.length || 0})
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 280, overflowY: 'auto', p: 1 }}>
            {(!selectedTicket.comments || selectedTicket.comments.length === 0) && (
              <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', py: 2 }}>
                Пока нет сообщений в переписке
              </Typography>
            )}

            {selectedTicket.comments?.map((c) => (
              <Box
                key={c.id}
                sx={{
                  p: 1.5,
                  borderRadius: '10px',
                  backgroundColor: c.user?.id === selectedTicket.createdById ? 'info.light' : 'background.default',
                  border: '1px solid',
                  borderColor: c.user?.id === selectedTicket.createdById ? 'info.main' : 'divider',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {c.user?.displayName || 'Пользователь'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                    {formatDateTime(c.createdAt)}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                  {c.message}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Reply Input */}
          {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'REJECTED' ? (
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Написать сообщение администратору..."
                value={replyMessage}
                onChange={(e) => onReplyMessageChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSendReply();
                  }
                }}
              />
              <Button
                variant="contained"
                disabled={!replyMessage.trim() || sendingReply}
                onClick={onSendReply}
                sx={{
                  backgroundColor: 'primary.main',
                  px: 2.5,
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                {sendingReply ? <CircularProgress size={20} color="inherit" /> : <SendIcon sx={{ fontSize: 18 }} />}
              </Button>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 2, borderRadius: '8px' }}>
              Обращение закрыто. Для новых вопросов создайте новое обращение.
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
}

export default FeedbackTicketDetailView;

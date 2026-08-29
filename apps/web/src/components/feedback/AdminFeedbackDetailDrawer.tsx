'use client';

import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Chip,
  Button,
  TextField,
  MenuItem,
  Paper,
  Divider,
  Checkbox,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import LinkIcon from '@mui/icons-material/Link';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  DetailDrawer,
  StatusBadge,
} from '@/components/ui';
import {
  FeedbackTicketDto,
  FeedbackStatus,
  FeedbackPriority,
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_MODULE_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_STATUS_LABELS,
  formatDateTime,
  formatBytes,
} from '@ems/shared';

export interface AdminFeedbackDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  ticket: FeedbackTicketDto | null;
  editStatus: FeedbackStatus;
  setEditStatus: (status: FeedbackStatus) => void;
  editPriority: FeedbackPriority;
  setEditPriority: (priority: FeedbackPriority) => void;
  editResolution: string;
  setEditResolution: (resolution: string) => void;
  savingChanges: boolean;
  onSaveChanges: () => void;
  newCommentText: string;
  setNewCommentText: (text: string) => void;
  isInternalComment: boolean;
  setIsInternalComment: (isInternal: boolean) => void;
  commentFiles: File[];
  setCommentFiles: React.Dispatch<React.SetStateAction<File[]>>;
  sendingComment: boolean;
  onSendComment: () => void;
  onDeleteTicket: () => void;
}

export function AdminFeedbackDetailDrawer({
  open,
  onClose,
  ticket,
  editStatus,
  setEditStatus,
  editPriority,
  setEditPriority,
  editResolution,
  setEditResolution,
  savingChanges,
  onSaveChanges,
  newCommentText,
  setNewCommentText,
  isInternalComment,
  setIsInternalComment,
  commentFiles,
  setCommentFiles,
  sendingComment,
  onSendComment,
  onDeleteTicket,
}: AdminFeedbackDetailDrawerProps) {
  if (!ticket) return null;

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={`${ticket.ticketNumber}: ${ticket.title}`}
      width={680}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Status & Priority Management Panel */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: '12px',
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.default',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.primary' }}>
            Управление статусом и приоритетом
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Статус обращения"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as FeedbackStatus)}
              >
                {Object.entries(FEEDBACK_STATUS_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Приоритет"
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as FeedbackPriority)}
              >
                {Object.entries(FEEDBACK_PRIORITY_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                size="small"
                label="Официальная резолюция / Ответ службы поддержки"
                placeholder="Укажите принятые меры, причину отказа или ссылку на релиз с исправлением..."
                value={editResolution}
                onChange={(e) => setEditResolution(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                disabled={savingChanges}
                onClick={onSaveChanges}
                sx={{
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                {savingChanges ? 'Сохранение...' : 'Сохранить статус и резолюцию'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Author and Ticket Description */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Автор обращения:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {ticket.createdBy?.displayName || 'Пользователь'} ({ticket.createdBy?.ldapLogin})
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Создано:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {formatDateTime(ticket.createdAt)}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            Описание проблемы / предложения:
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {ticket.description}
          </Typography>

          {/* Attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
                Прикрепленные файлы и скриншоты:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {ticket.attachments.map((att) => (
                  <Chip
                    key={att.id}
                    component="a"
                    href={`/api/files/${att.filePath}`}
                    target="_blank"
                    clickable
                    icon={<AttachFileIcon sx={{ fontSize: 16 }} />}
                    label={`${att.originalName} (${formatBytes(att.fileSize)})`}
                    size="small"
                    sx={{ borderRadius: '6px', backgroundColor: 'action.hover', border: '1px solid', borderColor: 'divider' }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Paper>

        {/* Context Telemetry */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.default' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
            Контекст и телеметрия окружения
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinkIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  URL страницы: <strong>{ticket.pageUrl || 'Не указан'}</strong>
                </Typography>
              </Box>
            </Grid>
            {ticket.browserInfo && (
              <>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Разрешение: {ticket.browserInfo.screenResolution || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Язык: {ticket.browserInfo.language || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem', wordBreak: 'break-all' }}>
                    User Agent: {ticket.browserInfo.userAgent || '—'}
                  </Typography>
                </Grid>
              </>
            )}
          </Grid>
        </Paper>

        {/* Conversation / Comments Timeline */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>
            Переписка и внутренние заметки ({ticket.comments?.length || 0})
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 320, overflowY: 'auto', p: 1 }}>
            {(!ticket.comments || ticket.comments.length === 0) && (
              <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', py: 2 }}>
                История сообщений пуста
              </Typography>
            )}

            {ticket.comments?.map((comment) => (
              <Paper
                key={comment.id}
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: comment.isInternal ? 'warning.light' : 'divider',
                  backgroundColor: comment.isInternal ? 'rgba(237, 108, 2, 0.04)' : 'background.paper',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {comment.user?.displayName || 'Администратор'}
                    </Typography>
                    {comment.isInternal && (
                      <Chip
                        icon={<LockOutlinedIcon sx={{ fontSize: 13 }} />}
                        label="Внутренняя заметка"
                        size="small"
                        color="warning"
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {formatDateTime(comment.createdAt)}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {comment.message}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        {/* Reply Form */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: '12px',
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
            Добавить ответ пользователю или внутреннюю заметку
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Текст сообщения для пользователя или служебная заметка..."
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            sx={{ mb: 1.5 }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isInternalComment}
                    onChange={(e) => setIsInternalComment(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="caption" sx={{ fontWeight: 600, color: isInternalComment ? 'warning.main' : 'text.secondary' }}>
                    Внутренняя заметка
                  </Typography>
                }
              />

              <Button
                component="label"
                size="small"
                variant="outlined"
                startIcon={<AttachFileIcon fontSize="small" />}
                sx={{ borderRadius: '8px', textTransform: 'none' }}
              >
                Файлы
                <input
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => {
                    if (e.target.files) {
                      setCommentFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                    }
                  }}
                />
              </Button>
            </Box>

            <Button
              variant="contained"
              size="small"
              disabled={sendingComment || !newCommentText.trim()}
              onClick={onSendComment}
              endIcon={sendingComment ? <CircularProgress size={16} color="inherit" /> : <SendIcon fontSize="small" />}
              sx={{ borderRadius: '8px', fontWeight: 600, textTransform: 'none' }}
            >
              {sendingComment ? 'Отправка...' : isInternalComment ? 'Добавить заметку' : 'Ответить автору'}
            </Button>
          </Box>

          {commentFiles.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
              {commentFiles.map((file, idx) => (
                <Chip
                  key={idx}
                  label={`${file.name} (${formatBytes(file.size)})`}
                  size="small"
                  onDelete={() => setCommentFiles((prev) => prev.filter((_, i) => i !== idx))}
                  deleteIcon={<DeleteOutlineIcon fontSize="small" />}
                  sx={{ borderRadius: '6px' }}
                />
              ))}
            </Box>
          )}
        </Paper>

        {/* Bottom Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            color="error"
            size="small"
            startIcon={<DeleteOutlineIcon />}
            onClick={onDeleteTicket}
            sx={{ textTransform: 'none' }}
          >
            Удалить обращение
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={onClose}
            sx={{ borderRadius: '8px', textTransform: 'none' }}
          >
            Закрыть
          </Button>
        </Box>
      </Box>
    </DetailDrawer>
  );
}

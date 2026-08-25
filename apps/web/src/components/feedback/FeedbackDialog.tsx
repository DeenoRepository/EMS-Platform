'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Button,
  IconButton,
  CircularProgress,
  Chip,
  Paper,
  Divider,
  Grid,
  Alert,
  Avatar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BugReportIcon from '@mui/icons-material/BugReport';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LinkIcon from '@mui/icons-material/Link';
import DevicesIcon from '@mui/icons-material/Devices';
import { useSnackbar } from 'notistack';
import { StatusBadge, EmptyState } from '@/components/ui';
import {
  FeedbackType,
  FeedbackModule,
  FeedbackPriority,
  FeedbackTicketDto,
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_MODULE_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  formatDateTime,
  formatBytes,
} from '@ems/shared';

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  initialTicketId?: string | null;
}

export default function FeedbackDialog({ open, onClose, initialTicketId }: FeedbackDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [tabIndex, setTabIndex] = useState(0);

  // Form State
  const [type, setType] = useState<FeedbackType>('BUG');
  const [module, setModule] = useState<FeedbackModule>('GENERAL');
  const [priority, setPriority] = useState<FeedbackPriority>('MEDIUM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [pageUrl, setPageUrl] = useState('');
  const [browserInfo, setBrowserInfo] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // My Tickets State
  const [myTickets, setMyTickets] = useState<FeedbackTicketDto[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<FeedbackTicketDto | null>(null);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect page URL and browser info when opened
  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      setPageUrl(window.location.pathname + window.location.search);
      setBrowserInfo({
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
      });
    }
  }, [open]);

  // Load user tickets when switching to tab 1 or when initialTicketId is given
  const fetchMyTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch('/api/feedback?onlyOwn=true');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMyTickets(json.data);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  const fetchTicketDetails = useCallback(async (ticketId: string) => {
    setLoadingSelected(true);
    try {
      const res = await fetch(`/api/feedback/${ticketId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSelectedTicket(json.data);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки деталей обращения', { variant: 'error' });
    } finally {
      setLoadingSelected(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    if (open) {
      if (initialTicketId) {
        setTabIndex(1);
        fetchTicketDetails(initialTicketId);
      } else if (tabIndex === 1) {
        fetchMyTickets();
      }
    }
  }, [open, tabIndex, initialTicketId, fetchMyTickets, fetchTicketDetails]);

  // Global Ctrl+V clipboard paste handler for screenshots
  useEffect(() => {
    if (!open || tabIndex !== 0) return;

    const handlePaste = (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const items = clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const ext = item.type.split('/')[1] || 'png';
            const screenshotFile = new File([blob], `screenshot_${Date.now()}.${ext}`, {
              type: blob.type,
            });
            setFiles((prev) => [...prev, screenshotFile]);
            enqueueSnackbar('Скриншот вставлен из буфера обмена', { variant: 'info' });
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [open, tabIndex, enqueueSnackbar]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      enqueueSnackbar('Укажите тему обращения', { variant: 'warning' });
      return;
    }
    if (!description.trim()) {
      enqueueSnackbar('Укажите описание проблемы или предложения', { variant: 'warning' });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('type', type);
      formData.append('module', module);
      formData.append('priority', priority);
      if (pageUrl) formData.append('pageUrl', pageUrl);
      if (browserInfo) formData.append('browserInfo', JSON.stringify(browserInfo));

      files.forEach((file) => {
        formData.append('files', file);
      });

      const res = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        enqueueSnackbar(`Обращение ${data.data.ticketNumber} успешно создано!`, { variant: 'success' });
        // Reset form
        setTitle('');
        setDescription('');
        setFiles([]);
        setType('BUG');
        // Switch to my tickets
        setTabIndex(1);
        fetchMyTickets();
      } else {
        enqueueSnackbar(data.error || 'Ошибка отправки обращения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка при отправке', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/feedback/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReplyMessage('');
        fetchTicketDetails(selectedTicket.id);
        enqueueSnackbar('Сообщение отправлено', { variant: 'success' });
      } else {
        enqueueSnackbar(data.error || 'Ошибка отправки сообщения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка при отправке сообщения', { variant: 'error' });
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)',
          overflow: 'hidden',
          minHeight: 620,
        },
      }}
    >
      {/* Dialog Header */}
      <DialogTitle
        sx={{
          m: 0,
          p: 2.5,
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BugReportIcon sx={{ color: '#38bdf8', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem', lineHeight: 1.2 }}>
              Обратная связь и техподдержка
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              Сообщите о неисправности или предложите улучшение платформы
            </Typography>
          </Box>
        </Box>

        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: '#94a3b8',
            '&:hover': { color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', px: 2 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, val) => {
            setTabIndex(val);
            if (val === 1 && !selectedTicket) fetchMyTickets();
          }}
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              minHeight: 48,
            },
          }}
        >
          <Tab label="Подать обращение" />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Мои обращения</span>
                {myTickets.length > 0 && (
                  <Chip
                    label={myTickets.length}
                    size="small"
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#e2e8f0' }}
                  />
                )}
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Dialog Body */}
      <DialogContent sx={{ p: 3, backgroundColor: '#ffffff' }}>
        {tabIndex === 0 ? (
          /* Tab 0: New Ticket Form */
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2.5}>
              {/* Type Selection */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#334155' }}>
                  Тип обращения
                </Typography>
                <Grid container spacing={1.5}>
                  {[
                    { id: 'BUG', label: 'Неисправность / Ошибка', icon: <BugReportIcon sx={{ color: '#ef4444' }} />, border: '#ef4444' },
                    { id: 'FEATURE_REQUEST', label: 'Предложение по улучшению', icon: <LightbulbOutlinedIcon sx={{ color: '#0284c7' }} />, border: '#0284c7' },
                    { id: 'QUESTION', label: 'Вопрос / Консультация', icon: <HelpOutlineIcon sx={{ color: '#8b5cf6' }} />, border: '#8b5cf6' },
                    { id: 'OTHER', label: 'Другое', icon: <MoreHorizIcon sx={{ color: '#64748b' }} />, border: '#64748b' },
                  ].map((item) => (
                    <Grid item xs={6} sm={3} key={item.id}>
                      <Paper
                        onClick={() => setType(item.id as FeedbackType)}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: '10px',
                          border: type === item.id ? `2px solid ${item.border}` : '1px solid #e2e8f0',
                          backgroundColor: type === item.id ? '#f8fafc' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          gap: 0.75,
                          transition: 'all 0.15s ease',
                          '&:hover': { borderColor: item.border, backgroundColor: '#f8fafc' },
                        }}
                      >
                        {item.icon}
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1e293b' }}>
                          {item.label}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* Module & Priority */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Модуль системы"
                  value={module}
                  onChange={(e) => setModule(e.target.value as FeedbackModule)}
                >
                  {Object.entries(FEEDBACK_MODULE_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Приоритет / Критичность"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as FeedbackPriority)}
                >
                  {Object.entries(FEEDBACK_PRIORITY_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={v.label} color={v.color} size="small" sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }} />
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Title */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  size="small"
                  label="Тема обращения"
                  placeholder="Кратко сформулируйте суть проблемы или идеи..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  multiline
                  minRows={4}
                  label="Подробное описание"
                  placeholder="Опишите подробности, последовательность действий для воспроизведения или ожидаемый результат..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  helperText="💡 Подсказка: вы можете вставить скриншот прямо сюда комбинацией клавиш Ctrl+V"
                />
              </Grid>

              {/* Attachments / Dropzone */}
              <Grid item xs={12}>
                <Box
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    p: 2,
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': { borderColor: '#0284c7', backgroundColor: '#f0f9ff' },
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.log,.zip"
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, color: '#0284c7', mb: 0.5 }}>
                    <CloudUploadOutlinedIcon />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Прикрепить файлы или скриншоты
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Нажмите для выбора файлов или вставьте скриншот из буфера (Ctrl+V)
                  </Typography>
                </Box>

                {/* Attached Files List */}
                {files.length > 0 && (
                  <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {files.map((file, idx) => (
                      <Chip
                        key={idx}
                        icon={file.type.startsWith('image/') ? <ContentPasteIcon sx={{ fontSize: 16 }} /> : <AttachFileIcon sx={{ fontSize: 16 }} />}
                        label={`${file.name} (${formatBytes(file.size)})`}
                        onDelete={() => handleRemoveFile(idx)}
                        deleteIcon={<DeleteOutlineIcon />}
                        sx={{
                          borderRadius: '8px',
                          backgroundColor: '#f1f5f9',
                          fontWeight: 500,
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Grid>

              {/* Context Telemetry Preview */}
              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkIcon sx={{ color: '#64748b', fontSize: 18 }} />
                    <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500 }}>
                      Страница: <strong>{pageUrl || '/'}</strong>
                    </Typography>
                  </Box>

                  {browserInfo && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DevicesIcon sx={{ color: '#64748b', fontSize: 18 }} />
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Экран: {browserInfo.screenResolution}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        ) : (
          /* Tab 1: My Tickets & Conversation Thread */
          <Box>
            {selectedTicket ? (
              /* Ticket Detail & Conversation View */
              <Box>
                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={() => setSelectedTicket(null)}
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
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        mb: 2.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
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
                        <Chip
                          label={`Приоритет: ${FEEDBACK_PRIORITY_LABELS[selectedTicket.priority]?.label || selectedTicket.priority}`}
                          color={FEEDBACK_PRIORITY_LABELS[selectedTicket.priority]?.color || 'default'}
                          size="small"
                          sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                        />
                        <Typography variant="caption" sx={{ color: '#64748b', alignSelf: 'center' }}>
                          Создано: {formatDateTime(selectedTicket.createdAt)}
                        </Typography>
                      </Box>

                      <Typography variant="body2" sx={{ color: '#334155', whiteSpace: 'pre-wrap' }}>
                        {selectedTicket.description}
                      </Typography>

                      {/* Attached files */}
                      {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                        <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed #cbd5e1' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', display: 'block', mb: 1 }}>
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
                                sx={{ borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}
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
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1.5 }}>
                      История переписки ({selectedTicket.comments?.length || 0})
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 280, overflowY: 'auto', p: 1 }}>
                      {(!selectedTicket.comments || selectedTicket.comments.length === 0) && (
                        <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center', py: 2 }}>
                          Пока нет сообщений в переписке
                        </Typography>
                      )}

                      {selectedTicket.comments?.map((c) => (
                        <Box
                          key={c.id}
                          sx={{
                            p: 1.5,
                            borderRadius: '10px',
                            backgroundColor: c.user?.id === selectedTicket.createdById ? '#f0f9ff' : '#f8fafc',
                            border: '1px solid',
                            borderColor: c.user?.id === selectedTicket.createdById ? '#bae6fd' : '#e2e8f0',
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a' }}>
                              {c.user?.displayName || 'Пользователь'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                              {formatDateTime(c.createdAt)}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ color: '#334155', whiteSpace: 'pre-wrap' }}>
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
                          onChange={(e) => setReplyMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendReply();
                            }
                          }}
                        />
                        <Button
                          variant="contained"
                          disabled={!replyMessage.trim() || sendingReply}
                          onClick={handleSendReply}
                          sx={{
                            backgroundColor: '#0284c7',
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
            ) : (
              /* My Tickets List */
              <Box>
                {loadingTickets ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : myTickets.length === 0 ? (
                  <EmptyState
                    title="У вас пока нет обращений"
                    description="Если вы столкнулись с ошибкой или хотите предложить новую функцию, заполните форму во вкладке «Подать обращение»."
                    actionText="Создать обращение"
                    onAction={() => setTabIndex(0)}
                  />
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 420, overflowY: 'auto' }}>
                    {myTickets.map((ticket) => (
                      <Paper
                        key={ticket.id}
                        onClick={() => {
                          setSelectedTicket(ticket);
                          fetchTicketDetails(ticket.id);
                        }}
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            borderColor: '#0284c7',
                            backgroundColor: '#f8fafc',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0284c7' }}>
                              {ticket.ticketNumber}
                            </Typography>
                            <StatusBadge status={ticket.type} />
                          </Box>
                          <StatusBadge status={ticket.status} />
                        </Box>

                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', mb: 0.5 }}>
                          {ticket.title}
                        </Typography>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {FEEDBACK_MODULE_LABELS[ticket.module] || ticket.module} • {formatDateTime(ticket.createdAt)}
                          </Typography>

                          {ticket.commentsCount && ticket.commentsCount > 0 ? (
                            <Chip
                              label={`${ticket.commentsCount} сообщений`}
                              size="small"
                              sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, backgroundColor: '#e0f2fe', color: '#0369a1' }}
                            />
                          ) : null}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      {/* Dialog Footer Actions */}
      {tabIndex === 0 && (
        <DialogActions sx={{ p: 2.5, backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={onClose} sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}>
            Отмена
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
            sx={{
              backgroundColor: '#0284c7',
              borderRadius: '8px',
              px: 3,
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { backgroundColor: '#0369a1' },
            }}
          >
            {submitting ? 'Отправка...' : 'Отправить обращение'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

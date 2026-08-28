'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { alpha } from '@mui/material/styles';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  CircularProgress,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BugReportIcon from '@mui/icons-material/BugReport';
import SendIcon from '@mui/icons-material/Send';
import { useSnackbar } from 'notistack';
import { FeedbackType, FeedbackModule, FeedbackPriority, FeedbackTicketDto } from '@ems/shared';
import FeedbackNewTicketTab from './FeedbackNewTicketTab';
import FeedbackTicketListView from './FeedbackTicketListView';
import FeedbackTicketDetailView from './FeedbackTicketDetailView';

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
        setTitle('');
        setDescription('');
        setFiles([]);
        setType('BUG');
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
        sx: (theme) => ({
          borderRadius: '16px',
          boxShadow: `0 20px 40px ${alpha(theme.palette.text.primary, 0.15)}`,
          overflow: 'hidden',
          minHeight: 620,
        }),
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2.5,
          backgroundColor: 'background.paper',
          borderBottom: '1px solid',
          borderBottomColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={(theme) => ({
              width: 42,
              height: 42,
              borderRadius: '10px',
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              border: '1px solid',
              borderColor: alpha(theme.palette.primary.main, 0.18),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
              flexShrink: 0,
            })}
          >
            <BugReportIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography
              component="div"
              sx={{
                fontWeight: 800,
                fontSize: '1.125rem',
                lineHeight: 1.3,
                color: 'text.primary',
                letterSpacing: '-0.015em',
              }}
            >
              Обратная связь и техподдержка
            </Typography>
            <Typography
              component="div"
              variant="caption"
              sx={{
                color: 'text.disabled',
                fontSize: '0.8125rem',
                display: 'block',
                lineHeight: 1.2,
                mt: 0.25,
              }}
            >
              Сообщите о неисправности или предложите улучшение платформы
            </Typography>
          </Box>
        </Box>

        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: 'text.disabled',
            borderRadius: '8px',
            p: 1,
            transition: 'all 0.15s ease',
            '&:hover': { color: 'text.primary', backgroundColor: 'action.hover' },
          }}
        >
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: '1px solid', borderBottomColor: 'divider', backgroundColor: 'background.default', px: 2 }}>
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
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'divider' }}
                  />
                )}
              </Box>
            }
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3, backgroundColor: 'background.paper' }}>
        {tabIndex === 0 ? (
          <FeedbackNewTicketTab
            type={type}
            setType={setType}
            module={module}
            setModule={setModule}
            priority={priority}
            setPriority={setPriority}
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            files={files}
            setFiles={setFiles}
            pageUrl={pageUrl}
            browserInfo={browserInfo}
            onSubmit={handleSubmit}
          />
        ) : (
          <Box>
            {selectedTicket ? (
              <FeedbackTicketDetailView
                selectedTicket={selectedTicket}
                loadingSelected={loadingSelected}
                replyMessage={replyMessage}
                sendingReply={sendingReply}
                onBack={() => setSelectedTicket(null)}
                onReplyMessageChange={setReplyMessage}
                onSendReply={handleSendReply}
              />
            ) : (
              <FeedbackTicketListView
                loading={loadingTickets}
                tickets={myTickets}
                onSelectTicket={(ticket) => {
                  setSelectedTicket(ticket);
                  fetchTicketDetails(ticket.id);
                }}
                onCreateNew={() => setTabIndex(0)}
              />
            )}
          </Box>
        )}
      </DialogContent>

      {tabIndex === 0 && (
        <DialogActions sx={{ p: 2.5, backgroundColor: 'background.default', borderTop: '1px solid', borderTopColor: 'divider' }}>
          <Button onClick={onClose} sx={{ textTransform: 'none', color: 'text.disabled', fontWeight: 600 }}>
            Отмена
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
            sx={{
              backgroundColor: 'primary.main',
              borderRadius: '8px',
              px: 3,
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { backgroundColor: 'primary.dark' },
            }}
          >
            {submitting ? 'Отправка...' : 'Отправить обращение'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

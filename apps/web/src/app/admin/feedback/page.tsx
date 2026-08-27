'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  Chip,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Paper,
  Divider,
  Alert,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DevicesIcon from '@mui/icons-material/Devices';
import LinkIcon from '@mui/icons-material/Link';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PageHeader from '@/components/layout/PageHeader';
import { useSnackbar } from 'notistack';
import {
  StatCard,
  FilterToolbar,
  SearchInput,
  DataTableWrapper,
  StatusBadge,
  DetailDrawer,
  ConfirmDialog,
  EmptyState,
} from '@/components/ui';
import {
  FeedbackTicketDto,
  FeedbackType,
  FeedbackModule,
  FeedbackPriority,
  FeedbackStatus,
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_MODULE_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_STATUS_LABELS,
  formatDateTime,
  formatBytes,
} from '@ems/shared';

export default function AdminFeedbackPage() {
  const { enqueueSnackbar } = useSnackbar();

  // Tickets state
  const [tickets, setTickets] = useState<FeedbackTicketDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // Filters & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterModule, setFilterModule] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Detail Drawer State
  const [selectedTicket, setSelectedTicket] = useState<FeedbackTicketDto | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Drawer Edit state
  const [editStatus, setEditStatus] = useState<FeedbackStatus>('NEW');
  const [editPriority, setEditPriority] = useState<FeedbackPriority>('MEDIUM');
  const [editResolution, setEditResolution] = useState('');
  const [savingChanges, setSavingChanges] = useState(false);

  // Comment reply state
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  // Delete dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);

  // Load KPI stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/feedback/stats');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setStats(json.data);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Load tickets list
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(rowsPerPage),
        offset: String(page * rowsPerPage),
      });

      if (filterType !== 'ALL') params.set('type', filterType);
      if (filterModule !== 'ALL') params.set('module', filterModule);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      if (filterPriority !== 'ALL') params.set('priority', filterPriority);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/feedback?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTickets(json.data);
          setTotalCount(json.total);
        }
      } else {
        enqueueSnackbar('Ошибка загрузки обращений', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка при загрузке данных', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [rowsPerPage, page, filterType, filterModule, filterStatus, filterPriority, searchQuery, enqueueSnackbar]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Load selected ticket details
  const fetchTicketDetails = useCallback(
    async (id: string) => {
      setLoadingDetails(true);
      try {
        const res = await fetch(`/api/feedback/${id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setSelectedTicket(json.data);
            setEditStatus(json.data.status);
            setEditPriority(json.data.priority);
            setEditResolution(json.data.resolution || '');
          }
        }
      } catch {
        enqueueSnackbar('Ошибка загрузки деталей обращения', { variant: 'error' });
      } finally {
        setLoadingDetails(false);
      }
    },
    [enqueueSnackbar]
  );

  const handleOpenTicket = (ticket: FeedbackTicketDto) => {
    setSelectedTicket(ticket);
    setEditStatus(ticket.status);
    setEditPriority(ticket.priority);
    setEditResolution(ticket.resolution || '');
    setDrawerOpen(true);
    fetchTicketDetails(ticket.id);
  };

  const handleSaveChanges = async () => {
    if (!selectedTicket) return;

    setSavingChanges(true);
    try {
      const res = await fetch(`/api/feedback/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          priority: editPriority,
          resolution: editResolution.trim() || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Параметры обращения успешно обновлены', { variant: 'success' });
        fetchTickets();
        fetchStats();
        fetchTicketDetails(selectedTicket.id);
      } else {
        enqueueSnackbar(json.error || 'Ошибка сохранения изменений', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка при сохранении', { variant: 'error' });
    } finally {
      setSavingChanges(false);
    }
  };

  const handleSendComment = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    setSendingComment(true);
    try {
      const res = await fetch(`/api/feedback/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyMessage.trim(),
          isInternal: isInternalComment,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setReplyMessage('');
        setIsInternalComment(false);
        fetchTicketDetails(selectedTicket.id);
        fetchTickets();
        enqueueSnackbar(isInternalComment ? 'Внутренняя заметка добавлена' : 'Ответ автору успешно отправлен', {
          variant: 'success',
        });
      } else {
        enqueueSnackbar(json.error || 'Ошибка отправки сообщения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка при отправке сообщения', { variant: 'error' });
    } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!deletingTicketId) return;

    try {
      const res = await fetch(`/api/feedback/${deletingTicketId}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Обращение удалено', { variant: 'success' });
        setDeleteConfirmOpen(false);
        setDrawerOpen(false);
        fetchTickets();
        fetchStats();
      } else {
        enqueueSnackbar(json.error || 'Ошибка удаления', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка при удалении', { variant: 'error' });
    }
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'ALL') count++;
    if (filterModule !== 'ALL') count++;
    if (filterStatus !== 'ALL') count++;
    if (filterPriority !== 'ALL') count++;
    return count;
  }, [filterType, filterModule, filterStatus, filterPriority]);

  const handleResetFilters = () => {
    setFilterType('ALL');
    setFilterModule('ALL');
    setFilterStatus('ALL');
    setFilterPriority('ALL');
    setSearchQuery('');
    setPage(0);
  };

  return (
    <Box sx={{ width: '100%', pb: 2 }}>
      {/* Page Header */}
      <PageHeader
        title="Центр обратной связи и техподдержки"
        subtitle="Обработка обращений пользователей, баг-репортов и предложений по развитию платформы"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование', href: '/admin/settings' },
          { label: 'Обратная связь' },
        ]}
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchTickets();
              fetchStats();
            }}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Обновить
          </Button>
        }
      />

      {/* KPI Stats Block */}
      <Grid container spacing={1.75} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Всего обращений"
            value={stats?.total ?? '—'}
            icon={<HourglassEmptyIcon sx={{ color: '#0284c7' }} />}
            accentColor="#0284c7"
            active={filterStatus === 'ALL' && filterType === 'ALL'}
            onClick={() => {
              setFilterStatus('ALL');
              setFilterType('ALL');
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Новые"
            value={stats?.new ?? '—'}
            icon={<HourglassEmptyIcon sx={{ color: '#0284c7' }} />}
            accentColor="#0284c7"
            active={filterStatus === 'NEW'}
            trend={stats?.new > 0 ? { value: stats.new, label: 'требуют рассмотрения', direction: 'up' } : undefined}
            onClick={() => setFilterStatus('NEW')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="В работе"
            value={stats?.inProgress ?? '—'}
            icon={<HourglassEmptyIcon sx={{ color: '#2563eb' }} />}
            accentColor="#2563eb"
            active={filterStatus === 'IN_PROGRESS'}
            onClick={() => setFilterStatus('IN_PROGRESS')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Ошибки / Баги"
            value={stats?.bugs ?? '—'}
            icon={<BugReportIcon sx={{ color: '#ef4444' }} />}
            accentColor="#ef4444"
            active={filterType === 'BUG'}
            onClick={() => setFilterType('BUG')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Предложения"
            value={stats?.features ?? '—'}
            icon={<LightbulbOutlinedIcon sx={{ color: '#3b82f6' }} />}
            accentColor="#3b82f6"
            active={filterType === 'FEATURE_REQUEST'}
            onClick={() => setFilterType('FEATURE_REQUEST')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Решено / Готово"
            value={stats?.resolved ?? '—'}
            icon={<CheckCircleOutlineIcon sx={{ color: '#16a34a' }} />}
            accentColor="#16a34a"
            active={filterStatus === 'RESOLVED'}
            onClick={() => setFilterStatus('RESOLVED')}
          />
        </Grid>
      </Grid>

      {/* Filter Toolbar */}
      <FilterToolbar
        activeFilterCount={activeFiltersCount}
        onResetFilters={handleResetFilters}
      >
        <Box sx={{ width: { xs: '100%', sm: 320 } }}>
          <SearchInput
            placeholder="Поиск по номеру, теме, автору..."
            value={searchQuery}
            onSearch={(val) => {
              setSearchQuery(val);
              setPage(0);
            }}
          />
        </Box>

        <TextField
          select
          size="small"
          label="Тип"
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="ALL">Все типы</MenuItem>
          {Object.entries(FEEDBACK_TYPE_LABELS).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Модуль"
          value={filterModule}
          onChange={(e) => {
            setFilterModule(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 170 }}
        >
          <MenuItem value="ALL">Все модули</MenuItem>
          {Object.entries(FEEDBACK_MODULE_LABELS).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Статус"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="ALL">Все статусы</MenuItem>
          {Object.entries(FEEDBACK_STATUS_LABELS).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Приоритет"
          value={filterPriority}
          onChange={(e) => {
            setFilterPriority(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="ALL">Все приоритеты</MenuItem>
          {Object.entries(FEEDBACK_PRIORITY_LABELS).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v.label}
            </MenuItem>
          ))}
        </TextField>
      </FilterToolbar>

      {/* Registry Table */}
      <DataTableWrapper
        loading={loading}
        total={totalCount}
        page={page}
        pageSize={rowsPerPage}
        onPageChange={(_, newPage) => setPage(newPage)}
        onPageSizeChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 120 }}>Номер</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 140 }}>Тип</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 150 }}>Модуль</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Тема обращения</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 130 }}>Приоритет</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 150 }}>Статус</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 180 }}>Автор</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 150 }}>Дата подачи</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 80, textAlign: 'center' }}>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={9} sx={{ py: 6 }}>
                  <EmptyState
                    title="Обращения не найдены"
                    description="Попробуйте изменить параметры фильтрации или поисковый запрос."
                  />
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  hover
                  onClick={() => handleOpenTicket(ticket)}
                  sx={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0284c7' }}>
                      {ticket.ticketNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ticket.type} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#475569' }}>
                      {FEEDBACK_MODULE_LABELS[ticket.module] || ticket.module}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                      {ticket.title}
                    </Typography>
                    {ticket.commentsCount && ticket.commentsCount > 0 ? (
                      <Chip
                        label={`${ticket.commentsCount} сообщ.`}
                        size="small"
                        sx={{ height: 18, fontSize: '0.65rem', mt: 0.5, backgroundColor: '#f1f5f9' }}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={ticket.priority}
                      label={FEEDBACK_PRIORITY_LABELS[ticket.priority]?.label || ticket.priority}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ticket.status} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {ticket.createdBy?.displayName || 'Пользователь'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {ticket.createdBy?.ldapLogin}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {formatDateTime(ticket.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Открыть детали обращения">
                      <IconButton size="small" onClick={() => handleOpenTicket(ticket)}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {/* Detail Drawer */}
      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedTicket ? `${selectedTicket.ticketNumber}: ${selectedTicket.title}` : 'Детали обращения'}
        width={680}
      >
        {selectedTicket && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Status & Priority Management Panel */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#0f172a' }}>
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
                    label="Итоговая резолюция / Заключение администратора"
                    placeholder="Укажите комментарий для автора обращения при решении или отклонении..."
                    value={editResolution}
                    onChange={(e) => setEditResolution(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    color="error"
                    size="small"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => {
                      setDeletingTicketId(selectedTicket.id);
                      setDeleteConfirmOpen(true);
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Удалить
                  </Button>

                  <Button
                    variant="contained"
                    size="small"
                    disabled={savingChanges}
                    onClick={handleSaveChanges}
                    sx={{
                      backgroundColor: '#0284c7',
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
            <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    Автор обращения:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedTicket.createdBy?.displayName} ({selectedTicket.createdBy?.ldapLogin})
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    Дата создания:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatDateTime(selectedTicket.createdAt)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
                Описание проблемы / предложения:
              </Typography>
              <Typography variant="body2" sx={{ color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {selectedTicket.description}
              </Typography>

              {/* Attachments */}
              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed #cbd5e1' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', display: 'block', mb: 1 }}>
                    Прикрепленные файлы и скриншоты:
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
                        sx={{ borderRadius: '6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>

            {/* Context Telemetry */}
            <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
                Контекст и телеметрия окружения
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkIcon sx={{ color: '#64748b', fontSize: 18 }} />
                    <Typography variant="caption" sx={{ color: '#334155' }}>
                      URL страницы: <strong>{selectedTicket.pageUrl || 'Не указан'}</strong>
                    </Typography>
                  </Box>
                </Grid>
                {selectedTicket.browserInfo && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Разрешение: {selectedTicket.browserInfo.screenResolution || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Язык: {selectedTicket.browserInfo.language || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem', wordBreak: 'break-all' }}>
                        User Agent: {selectedTicket.browserInfo.userAgent || '—'}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </Paper>

            {/* Conversation / Comments Timeline */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1.5 }}>
                Переписка и внутренние заметки ({selectedTicket.comments?.length || 0})
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 320, overflowY: 'auto', p: 1 }}>
                {(!selectedTicket.comments || selectedTicket.comments.length === 0) && (
                  <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center', py: 2 }}>
                    История сообщений пуста
                  </Typography>
                )}

                {selectedTicket.comments?.map((comment) => (
                  <Paper
                    key={comment.id}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: comment.isInternal ? '#fde68a' : '#e2e8f0',
                      backgroundColor: comment.isInternal ? '#fffbeb' : '#ffffff',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          {comment.user?.displayName || 'Сотрудник'}
                        </Typography>
                        {comment.isInternal && (
                          <Chip
                            icon={<LockOutlinedIcon sx={{ fontSize: '12px !important' }} />}
                            label="Внутренняя заметка"
                            size="small"
                            sx={{ height: 18, fontSize: '0.65rem', backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 700 }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                        {formatDateTime(comment.createdAt)}
                      </Typography>
                    </Box>

                    <Typography variant="body2" sx={{ color: '#334155', whiteSpace: 'pre-wrap' }}>
                      {comment.message}
                    </Typography>
                  </Paper>
                ))}
              </Box>

              {/* Reply Form */}
              <Paper elevation={0} sx={{ mt: 2, p: 1.5, border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  size="small"
                  placeholder="Введите текст ответа автору или внутреннюю заметку..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                      />
                    }
                    label={
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        Внутренняя заметка (видна только администраторам)
                      </Typography>
                    }
                  />

                  <Button
                    variant="contained"
                    size="small"
                    disabled={!replyMessage.trim() || sendingComment}
                    onClick={handleSendComment}
                    startIcon={sendingComment ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                    sx={{
                      backgroundColor: isInternalComment ? '#d97706' : '#0284c7',
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { backgroundColor: isInternalComment ? '#b45309' : '#0369a1' },
                    }}
                  >
                    {isInternalComment ? 'Добавить заметку' : 'Отправить ответ'}
                  </Button>
                </Box>
              </Paper>
            </Box>
          </Box>
        )}
      </DetailDrawer>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteTicket}
        title="Удалить обращение?"
        message="Обращение будет скрыто из реестра. Это действие можно отменить только через прямое обращение к базе данных."
        confirmText="Удалить"
        variant="danger"
      />
    </Box>
  );
}

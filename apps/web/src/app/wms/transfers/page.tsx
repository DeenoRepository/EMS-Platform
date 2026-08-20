'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Tabs,
  Tab,
  Badge,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import PageHeader from '@/components/layout/PageHeader';
import AddIcon from '@mui/icons-material/Add';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SendIcon from '@mui/icons-material/Send';
import BlockIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS, formatDateTime } from '@ems/shared';
import {
  StatCard,
  StatusBadge,
  SearchInput,
  DataTableWrapper,
  EmptyState,
} from '@/components/ui';
import {
  TransferReceiveDialog,
  TransferRejectDialog,
  TransferRequestDialog,
  WmsOperationWizardDialog,
} from '@/components/wms';

interface TransferItemRecord {
  id: string;
  nomenclatureId: string;
  quantity: string | number;
  targetCellId?: string | null;
  targetCell?: { code: string; name?: string } | null;
  nomenclature?: {
    id: string;
    name: string;
    article?: string | null;
    unit: string;
  };
}

interface StockTransferRecord {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  status: 'REQUESTED' | 'IN_TRANSIT' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  requestReason?: string | null;
  rejectionReason?: string | null;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  sourceWarehouse: {
    id: string;
    name: string;
    code: string;
    responsibleUser?: { id: string; displayName: string } | null;
  };
  targetWarehouse: {
    id: string;
    name: string;
    code: string;
    responsibleUser?: { id: string; displayName: string } | null;
  };
  createdBy?: { id: string; displayName: string } | null;
  dispatchedBy?: { id: string; displayName: string } | null;
  receivedBy?: { id: string; displayName: string } | null;
  rejectedBy?: { id: string; displayName: string } | null;
  items: TransferItemRecord[];
}

function WmsTransfersContent() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'inbound' | 'requests' | 'outbound' | 'my_requests' | 'all'>('inbound');
  const [transfers, setTransfers] = useState<StockTransferRecord[]>([]);
  const [counts, setCounts] = useState({ inbound: 0, requests: 0, outbound: 0, total: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [selectedTransferForReceive, setSelectedTransferForReceive] = useState<StockTransferRecord | null>(null);
  const [selectedTransferForReject, setSelectedTransferForReject] = useState<StockTransferRecord | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isDispatchingId, setIsDispatchingId] = useState<string | null>(null);

  const fetchTransfers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        mode: activeTab,
        page: String(page),
        pageSize: String(pageSize),
        search,
      });

      const res = await fetch(`/api/wms/transfers?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setTransfers(json.data.items || []);
          setTotal(json.data.total || 0);
          if (json.data.counts) {
            setCounts(json.data.counts);
          }
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки перемещений', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page, pageSize, search, enqueueSnackbar]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // Dispatch approval handler
  const handleQuickDispatch = async (t: StockTransferRecord) => {
    setIsDispatchingId(t.id);
    try {
      const res = await fetch(`/api/wms/transfers/${t.id}/dispatch`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar(`Запрос ${t.transferNumber} успешно согласован и отгружен`, { variant: 'success' });
        fetchTransfers();
      } else {
        enqueueSnackbar(json.error || 'Ошибка отгрузки', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при отгрузке', { variant: 'error' });
    } finally {
      setIsDispatchingId(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, margin: '0 auto' }}>
      <PageHeader
        title="Межскладские перемещения и заявки ТМЦ"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учет (WMS)', href: '/wms' },
          { label: 'Перемещения ТМЦ' },
        ]}
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<SendIcon />}
              onClick={() => setIsRequestDialogOpen(true)}
              sx={{ borderRadius: '8px', fontWeight: 600, textTransform: 'none' }}
            >
              + Запросить перевод ТМЦ
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsWizardOpen(true)}
              sx={{ borderRadius: '8px', fontWeight: 600, textTransform: 'none' }}
            >
              + Оформить перемещение
            </Button>
          </Stack>
        }
      />

      {/* KPI Cards */}
      <Grid container spacing={1.75} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Требуют приемки"
            value={counts.inbound}
            subtitle="Входящие ТМЦ в пути"
            icon={<MoveToInboxIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
            loading={isLoading}
            onClick={() => setActiveTab('inbound')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Запросы на отгрузку"
            value={counts.requests}
            subtitle="Ожидают согласования"
            icon={<HourglassEmptyIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(217, 119, 6, 0.08)"
            iconColor="#d97706"
            accentColor="#d97706"
            loading={isLoading}
            onClick={() => setActiveTab('requests')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Отправлено (В пути)"
            value={counts.outbound}
            subtitle="Исходящие отгрузки"
            icon={<LocalShippingOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(124, 58, 237, 0.08)"
            iconColor="#7c3aed"
            accentColor="#7c3aed"
            loading={isLoading}
            onClick={() => setActiveTab('outbound')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего перемещений"
            value={counts.total}
            subtitle="Все записи реестра"
            icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="#16a34a"
            accentColor="#16a34a"
            loading={isLoading}
            onClick={() => setActiveTab('all')}
          />
        </Grid>
      </Grid>

      {/* Tabs & Search Toolbar */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 2.5, borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
          <Tabs
            value={activeTab}
            onChange={(_, val) => {
              setActiveTab(val);
              setPage(1);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
                minHeight: 44,
                fontSize: '0.875rem',
              },
            }}
          >
            <Tab
              value="inbound"
              label={
                <Badge badgeContent={counts.inbound} color="error" sx={{ '& .MuiBadge-badge': { right: -12, top: 4 } }}>
                  📥 Входящие на приемку
                </Badge>
              }
            />
            <Tab
              value="requests"
              label={
                <Badge badgeContent={counts.requests} color="warning" sx={{ '& .MuiBadge-badge': { right: -12, top: 4 } }}>
                  📨 Запросы на мой склад
                </Badge>
              }
            />
            <Tab value="outbound" label="📤 Мои отправления" />
            <Tab value="my_requests" label="📑 Мои заявки" />
            <Tab value="all" label="📋 Все перемещения" />
          </Tabs>

          <Box sx={{ width: { xs: '100%', sm: 300 } }}>
            <SearchInput
              placeholder="Поиск по номеру, складу, ТМЦ..."
              value={search}
              onSearch={(v: string) => {
                setSearch(v);
                setPage(1);
              }}
            />
          </Box>
        </Stack>
      </Paper>

      {/* Transfers Data Table */}
      <DataTableWrapper
        title={
          activeTab === 'inbound'
            ? 'Входящие перемещения (Требуют подтверждения приемки)'
            : activeTab === 'requests'
            ? 'Запросы на перемещение с вашего склада'
            : activeTab === 'outbound'
            ? 'Исходящие перемещения в пути'
            : activeTab === 'my_requests'
            ? 'Мои отправленные запросы на перемещение'
            : 'Журнал межскладских перемещений'
        }
        totalCount={total}
        page={page - 1}
        rowsPerPage={pageSize}
        onPageChange={(_, newPage) => setPage(newPage + 1)}
        onRowsPerPageChange={(e) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(1);
        }}
        loading={isLoading}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 140 }}>Номер</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 180 }}>Статус</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Маршрут (Откуда → Куда)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Позиции ТМЦ</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Обоснование / Причина отказа</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 130 }}>Дата</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: 220 }}>
                Действия
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transfers.length === 0 && !isLoading ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center' }}>
                  <EmptyState
                    title="Перемещений не найдено"
                    description={
                      activeTab === 'inbound'
                        ? 'На ваш склад сейчас нет входящих перемещений, ожидающих приемки.'
                        : activeTab === 'requests'
                        ? 'Нет активных запросов на перевод ТМЦ с вашего склада.'
                        : 'В выбранной категории записей нет.'
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              transfers.map((t) => {
                const isTargetStorekeeper = t.targetWarehouse.responsibleUser?.id === user?.userId;
                const isSourceStorekeeper = t.sourceWarehouse.responsibleUser?.id === user?.userId;
                const isAdmin = user?.roles.includes('admin');

                const canReceive = (isTargetStorekeeper || isAdmin) && t.status === 'IN_TRANSIT';
                const canDispatch = (isSourceStorekeeper || isAdmin) && t.status === 'REQUESTED';

                return (
                  <TableRow key={t.id} hover>
                    {/* Номер */}
                    <TableCell sx={{ py: 1.25, fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {t.transferNumber}
                      </Typography>
                    </TableCell>

                    {/* Статус */}
                    <TableCell sx={{ py: 1.25 }}>
                      <StatusBadge status={t.status} />
                    </TableCell>

                    {/* Маршрут */}
                    <TableCell sx={{ py: 1.25 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                            {t.sourceWarehouse.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                            МОЛ: {t.sourceWarehouse.responsibleUser?.displayName || 'Не назначен'}
                          </Typography>
                        </Box>

                        <ArrowForwardIcon sx={{ fontSize: 16, color: '#94a3b8' }} />

                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0284c7' }}>
                            {t.targetWarehouse.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                            МОЛ: {t.targetWarehouse.responsibleUser?.displayName || 'Не назначен'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Позиции ТМЦ */}
                    <TableCell sx={{ py: 1.25 }}>
                      <Stack spacing={0.5}>
                        {t.items.map((it) => (
                          <Typography key={it.id} variant="caption" sx={{ color: '#334155', display: 'block' }}>
                            • <b>{it.nomenclature?.name}</b>: {it.quantity} {it.nomenclature?.unit || 'шт'}
                            {it.targetCell && (
                              <Chip
                                size="small"
                                label={`Ячейка: ${it.targetCell.code}`}
                                sx={{ height: 18, fontSize: '0.65rem', ml: 0.75 }}
                              />
                            )}
                          </Typography>
                        ))}
                      </Stack>
                    </TableCell>

                    {/* Обоснование / Причина */}
                    <TableCell sx={{ py: 1.25 }}>
                      {t.rejectionReason ? (
                        <Box sx={{ p: 0.75, bgcolor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                          <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, display: 'block' }}>
                            Причина отказа:
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#991b1b' }}>
                            {t.rejectionReason}
                          </Typography>
                        </Box>
                      ) : t.requestReason ? (
                        <Typography variant="caption" sx={{ color: '#475569' }}>
                          {t.requestReason}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>

                    {/* Дата */}
                    <TableCell sx={{ py: 1.25, fontSize: '0.75rem', color: '#64748b' }}>
                      {formatDateTime(t.createdAt)}
                    </TableCell>

                    {/* Действия */}
                    <TableCell align="right" sx={{ py: 1.25 }}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {canReceive && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<CheckIcon />}
                              onClick={() => setSelectedTransferForReceive(t)}
                              sx={{ fontWeight: 700, fontSize: '0.75rem', borderRadius: '6px' }}
                            >
                              Принять
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<BlockIcon />}
                              onClick={() => setSelectedTransferForReject(t)}
                              sx={{ fontWeight: 700, fontSize: '0.75rem', borderRadius: '6px' }}
                            >
                              Отклонить
                            </Button>
                          </>
                        )}

                        {canDispatch && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={isDispatchingId === t.id ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}
                              onClick={() => handleQuickDispatch(t)}
                              disabled={isDispatchingId === t.id}
                              sx={{ fontWeight: 700, fontSize: '0.75rem', borderRadius: '6px' }}
                            >
                              Отгрузить
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<BlockIcon />}
                              onClick={() => setSelectedTransferForReject(t)}
                              sx={{ fontWeight: 700, fontSize: '0.75rem', borderRadius: '6px' }}
                            >
                              Отказать
                            </Button>
                          </>
                        )}

                        {!canReceive && !canDispatch && (
                          <Typography variant="caption" color="text.secondary">
                            {t.status === 'COMPLETED' ? '✓ Проведено' : t.status === 'REJECTED' ? '✕ Закрыто' : 'Ожидание МОЛ'}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {/* Modal: Подтверждение приемки ТМЦ */}
      <TransferReceiveDialog
        open={Boolean(selectedTransferForReceive)}
        transfer={selectedTransferForReceive}
        onClose={() => setSelectedTransferForReceive(null)}
        onSuccess={() => {
          fetchTransfers();
          enqueueSnackbar('Приемка ТМЦ успешно подтверждена', { variant: 'success' });
        }}
      />

      {/* Modal: Отклонение перемещения с фиксацией причины */}
      <TransferRejectDialog
        open={Boolean(selectedTransferForReject)}
        transfer={selectedTransferForReject}
        onClose={() => setSelectedTransferForReject(null)}
        onSuccess={() => {
          fetchTransfers();
          enqueueSnackbar('Перемещение успешно отклонено', { variant: 'info' });
        }}
      />

      {/* Modal: Мастер запроса ТМЦ со склада-донора */}
      <TransferRequestDialog
        open={isRequestDialogOpen}
        onClose={() => setIsRequestDialogOpen(false)}
        onSuccess={() => {
          fetchTransfers();
        }}
      />

      {/* Modal: Мастер оформления прямого перемещения */}
      <WmsOperationWizardDialog
        open={isWizardOpen}
        initialType="TRANSFER"
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => {
          fetchTransfers();
        }}
      />
    </Box>
  );
}

export default function WmsTransfersPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <WmsTransfersContent />
    </Suspense>
  );
}

'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Button,
  Stack,
  Alert,
  FormControlLabel,
  Switch,
  Paper,
} from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS, INVENTORY_STATUS_MAP, formatDateTime } from '@ems/shared';
import {
  DataTableWrapper,
  PageLoading,
  CriticalAlertBanner,
} from '@/components/ui';
import {
  InventoryCompleteModal,
  InventoryCountSheetDialog,
  InventoryDetail,
  InventoryItemState,
  InventoryDetailKpiBar,
  InventoryComparisonTable,
} from '@/components/wms';

const FONT_SEMI_BOLD = 600;

function WmsInventoryDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuth();

  const [inventory, setInventory] = useState<InventoryDetail | null>(null);
  const [itemsState, setItemsState] = useState<InventoryItemState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmCompleteOpen, setIsConfirmCompleteOpen] = useState(false);
  const [isCountSheetOpen, setIsCountSheetOpen] = useState(false);
  const [diffOnly, setDiffOnly] = useState(false);

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/wms/inventories/${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setInventory(json.data);
          setItemsState(
            json.data.items.map((i: any) => ({
              id: i.id,
              actualQty: i.actualQty !== null ? Number(i.actualQty) : Number(i.expectedQty),
              expectedQty: Number(i.expectedQty),
              comment: i.comment || '',
            }))
          );
        }
      } else {
        enqueueSnackbar('Акт инвентаризации не найден', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при загрузке акта', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [id, enqueueSnackbar]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleActualQtyChange = useCallback((itemId: string, val: string) => {
    const num = parseFloat(val);
    setItemsState((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, actualQty: isNaN(num) ? 0 : num } : i))
    );
  }, []);

  const handleCommentChange = useCallback((itemId: string, val: string) => {
    setItemsState((prev) => prev.map((i) => (i.id === itemId ? { ...i, comment: val } : i)));
  }, []);

  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/wms/inventories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsState.map((i) => ({
            id: i.id,
            actualQty: i.actualQty,
            comment: i.comment,
          })),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Данные инвентаризации сохранены', { variant: 'success' });
        fetchInventory();
      } else {
        enqueueSnackbar(json.error || 'Ошибка сохранения данных', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при сохранении', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [id, itemsState, enqueueSnackbar, fetchInventory]);

  const handleCompleteInventory = useCallback(
    async (finalComment?: string) => {
      setIsSaving(true);
      try {
        const res = await fetch(`/api/wms/inventories/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'COMPLETED',
            comment: finalComment || inventory?.comment || undefined,
            items: itemsState.map((i) => ({
              id: i.id,
              actualQty: i.actualQty,
              comment: i.comment,
            })),
          }),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          enqueueSnackbar(json.message || 'Инвентаризация успешно завершена', { variant: 'success' });
          setIsConfirmCompleteOpen(false);
          fetchInventory();
        } else {
          enqueueSnackbar(json.error || 'Ошибка завершения инвентаризации', { variant: 'error' });
        }
      } catch {
        enqueueSnackbar('Ошибка сети при завершении инвентаризации', { variant: 'error' });
      } finally {
        setIsSaving(false);
      }
    },
    [id, inventory?.comment, itemsState, enqueueSnackbar, fetchInventory]
  );

  const kpiStats = useMemo(() => {
    if (!inventory) return null;
    const statusInfo = INVENTORY_STATUS_MAP[inventory.status] || { label: inventory.status, color: 'default' };
    const totalItems = itemsState.length;
    const matchCount = itemsState.filter((i) => i.actualQty === i.expectedQty).length;
    const surplusCount = itemsState.filter((i) => i.actualQty > i.expectedQty).length;
    const deficitCount = itemsState.filter((i) => i.actualQty < i.expectedQty).length;

    return {
      statusLabel: statusInfo.label,
      createdByDisplayName: inventory.createdBy.displayName,
      totalItems,
      matchCount,
      surplusCount,
      deficitCount,
    };
  }, [inventory, itemsState]);

  if (isLoading && !inventory) {
    return <PageLoading text="Загрузка акта инвентаризации..." />;
  }

  if (!inventory || !kpiStats) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Акт инвентаризации не найден</Alert>
      </Box>
    );
  }

  const isCompleted = inventory.status === 'COMPLETED';

  return (
    <Box sx={{ pb: 6, width: '100%' }}>
      {/* 1. Header */}
      <PageHeader
        title={`Акт инвентаризации № INV-${inventory.id.slice(-6).toUpperCase()}`}
        subtitle={`Склад: ${inventory.warehouse.name} (${inventory.warehouse.code}) • Дата: ${formatDateTime(
          inventory.createdAt
        )}`}
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учёт', href: '/wms' },
          { label: 'Инвентаризация', href: '/wms/inventory' },
          { label: `Акт INV-${inventory.id.slice(-6).toUpperCase()}` },
        ]}
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/wms/inventory')}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: FONT_SEMI_BOLD }}
            >
              К списку
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FactCheckOutlinedIcon color="primary" />}
              onClick={() => setIsCountSheetOpen(true)}
              sx={{
                fontWeight: FONT_SEMI_BOLD,
                borderRadius: '8px',
                textTransform: 'none',
              }}
            >
              Бланк пересчета
            </Button>
            {!isCompleted && hasPermission(PERMISSIONS.WMS_INVENTORY_MANAGE) && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SaveOutlinedIcon />}
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: FONT_SEMI_BOLD }}
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить факт'}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => setIsConfirmCompleteOpen(true)}
                  disabled={isSaving}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: FONT_SEMI_BOLD }}
                >
                  Завершить инвентаризацию
                </Button>
              </>
            )}
          </Stack>
        }
      />

      {/* 2. Top Summary KPI Cards */}
      <InventoryDetailKpiBar
        stats={kpiStats}
        diffOnly={diffOnly}
        onToggleDiffOnly={() => setDiffOnly((prev) => !prev)}
      />

      {isCompleted && (
        <Box sx={{ mb: 3 }}>
          <CriticalAlertBanner
            alerts={[
              {
                id: 'inv-completed-alert',
                severity: 'INFO',
                title: 'Инвентаризация завершена',
                description: `Акт закрыт ${inventory.closedAt ? formatDateTime(inventory.closedAt) : ''}. Складские остатки скорректированы в соответствии с фактическими данными.`,
              },
            ]}
          />
        </Box>
      )}

      {/* 3. Toolbar: Diff Only Toggle */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 2,
          borderRadius: '10px',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={diffOnly}
              onChange={(e) => setDiffOnly(e.target.checked)}
              color="warning"
            />
          }
          label="Показывать только позиции с расхождениями"
          sx={{
            m: 0,
            '& .MuiFormControlLabel-label': {
              fontSize: '0.8125rem',
              fontWeight: FONT_SEMI_BOLD,
              color: 'text.primary',
            },
          }}
        />
      </Paper>

      {/* 4. Table */}
      <DataTableWrapper total={inventory.items.length} stickyHeader>
        <InventoryComparisonTable
          items={inventory.items}
          itemsState={itemsState}
          isCompleted={isCompleted}
          diffOnly={diffOnly}
          onActualQtyChange={handleActualQtyChange}
          onCommentChange={handleCommentChange}
        />
      </DataTableWrapper>

      {/* 5. Modals */}
      <InventoryCompleteModal
        open={isConfirmCompleteOpen}
        onClose={() => setIsConfirmCompleteOpen(false)}
        onConfirm={handleCompleteInventory}
        warehouseName={inventory.warehouse.name}
        inventoryNumber={`INV-${inventory.id.slice(-6).toUpperCase()}`}
        isSubmitting={isSaving}
        items={inventory.items.map((it) => {
          const st = itemsState.find((s) => s.id === it.id);
          const act = st ? st.actualQty : Number(it.expectedQty);
          return {
            id: it.id,
            expectedQty: Number(it.expectedQty),
            actualQty: act,
            comment: st?.comment,
            nomenclature: it.nomenclature,
          };
        })}
      />

      <InventoryCountSheetDialog
        open={isCountSheetOpen}
        onClose={() => setIsCountSheetOpen(false)}
        inventory={inventory}
      />
    </Box>
  );
}

export default function WmsInventoryDetailPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка ведомости инвентаризации..." />}>
      <WmsInventoryDetailContent />
    </Suspense>
  );
}

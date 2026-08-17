'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  CircularProgress,
  Stack,
} from '@mui/material';
import { useSearchParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import AddIcon from '@mui/icons-material/Add';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import CreateNomenclatureDialog from '@/components/wms/CreateNomenclatureDialog';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS } from '@ems/shared';
import {
  StatusBadge,
  SearchInput,
  FilterToolbar,
  EmptyState,
  DataTableWrapper,
  CriticalAlertBanner,
  BulkActionBar,
  PageLoading,
  FormDialog,
  ExportButton,
  type ExportFormat,
} from '@/components/ui';

interface StockRow {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  nomenclatureId: string;
  name: string;
  article: string;
  unit: string;
  category: string;
  quantity: number;
  minStock: number | string;
  isLowStock: boolean;
  cellId?: string | null;
  cellCode?: string | null;
  cellName?: string | null;
  zoneId?: string | null;
  zoneName?: string | null;
  zoneCode?: string | null;
  compatibleEquipmentCount: number;
  compatibleEquipment: Array<{ id: string; name: string; inventoryNumber: string }>;
  updatedAt: string;
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface ZoneOption {
  id: string;
  name: string;
  code: string;
  cells: Array<{ id: string; code: string; name?: string | null }>;
}

function WmsStockContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuth();

  const [items, setItems] = useState<StockRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(searchParams.get('lowStockOnly') === 'true');

  // Pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modal: Create Nomenclature
  const [isNomenclatureModalOpen, setIsNomenclatureModalOpen] = useState(false);

  // Modal: Assign Storage Location (Cell)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locStockItem, setLocStockItem] = useState<StockRow | null>(null);
  const [warehouseZonesForLoc, setWarehouseZonesForLoc] = useState<ZoneOption[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string>('');
  const [isSavingLoc, setIsSavingLoc] = useState(false);

  // Load dictionaries once on mount
  useEffect(() => {
    async function loadDictionaries() {
      try {
        const [wRes, cRes] = await Promise.all([
          fetch('/api/wms/warehouses'),
          fetch('/api/wms/categories'),
        ]);
        if (wRes.ok) {
          const wData = await wRes.json();
          if (wData.success) setWarehouses(wData.data);
        }
        if (cRes.ok) {
          const cData = await cRes.json();
          if (cData.success) setCategories(cData.data);
        }
      } catch (err) {
        console.error('Ошибка загрузки справочников WMS:', err);
      }
    }
    loadDictionaries();
  }, []);

  // When warehouse changes, fetch its storage zones for detailed filtering
  useEffect(() => {
    if (!selectedWarehouse) {
      setZones([]);
      setSelectedZone('');
      return;
    }
    async function loadZones() {
      try {
        const res = await fetch(`/api/wms/warehouses/${selectedWarehouse}/zones`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) setZones(json.data);
        }
      } catch (err) {
        console.error('Ошибка загрузки зон склада:', err);
      }
    }
    loadZones();
  }, [selectedWarehouse]);

  // Fetch Stock Items
  const fetchStock = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
      });

      if (selectedWarehouse) params.append('warehouseId', selectedWarehouse);
      if (selectedZone) params.append('zoneId', selectedZone);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (search) params.append('search', search);
      if (lowStockOnly) params.append('lowStockOnly', 'true');

      const res = await fetch(`/api/wms/stock?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setItems(json.data.items || []);
          setTotalCount(json.data.total || 0);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки остатков склада', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedWarehouse, selectedZone, selectedCategory, search, lowStockOnly, page, rowsPerPage, enqueueSnackbar]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  // Open location assignment dialog
  const handleOpenLocationModal = async (row: StockRow) => {
    setLocStockItem(row);
    setSelectedCellId(row.cellId || '');
    setIsLocationModalOpen(true);

    try {
      const res = await fetch(`/api/wms/warehouses/${row.warehouseId}/zones`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setWarehouseZonesForLoc(json.data);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки ячеек для склада:', err);
    }
  };

  const handleSaveLocation = async () => {
    if (!locStockItem) return;
    setIsSavingLoc(true);
    try {
      const res = await fetch(`/api/wms/stock/${locStockItem.id}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cellId: selectedCellId || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar(json.message || 'Место хранения обновлено', { variant: 'success' });
        setIsLocationModalOpen(false);
        fetchStock();
      } else {
        enqueueSnackbar(json.error || 'Ошибка назначения ячейки', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при обновлении места хранения', { variant: 'error' });
    } finally {
      setIsSavingLoc(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedWarehouse('');
    setSelectedZone('');
    setSelectedCategory('');
    setSearch('');
    setLowStockOnly(false);
    setPage(0);
  };

  const activeFilterCount =
    (selectedWarehouse ? 1 : 0) +
    (selectedZone ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (search ? 1 : 0) +
    (lowStockOnly ? 1 : 0);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleExport = (format: ExportFormat) => {
    const targetItems = selectedIds.length > 0
      ? items.filter((i) => selectedIds.includes(i.id))
      : items;

    if (targetItems.length === 0) {
      enqueueSnackbar('Нет данных для экспорта', { variant: 'warning' });
      return;
    }

    if (format === 'csv' || format === 'xlsx') {
      const headers = ['Склад', 'Артикул', 'Номенклатура', 'Категория', 'Остаток', 'Ед.Изм.', 'Мин.Остаток', 'Адрес ячейки'];
      const rows = targetItems.map((i) => [
        `"${i.warehouseName}"`,
        `"${i.article}"`,
        `"${i.name}"`,
        `"${i.category}"`,
        i.quantity,
        `"${i.unit}"`,
        i.minStock,
        `"${i.cellCode || 'Не назначена'}"`,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        [headers.join(',')].concat(rows.map((r) => r.join(','))).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `wms_stock_${format}_${Date.now()}.${format === 'xlsx' ? 'csv' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      enqueueSnackbar(`Экспортировано позиций: ${targetItems.length}`, { variant: 'success' });
    }
  };

  const handleBulkIssue = () => {
    enqueueSnackbar(`Сформирован черновик акта списания на ${selectedIds.length} позиций`, { variant: 'info' });
  };

  const lowStockCount = items.filter((i) => i.isLowStock).length;
  const criticalAlerts = useMemo(() => {
    if (lowStockCount > 0) {
      return [
        {
          id: 'low-stock-alert',
          severity: 'WARNING' as const,
          title: 'Обнаружен дефицит складских запасов ТМЦ',
          description: `Текущий остаток ниже минимального неснижаемого порога по ${lowStockCount} позициям. Рекомендуется сформировать заказ поставщику.`,
          count: lowStockCount,
          actionLabel: 'Показать дефицит',
          onAction: () => {
            setLowStockOnly(true);
            setPage(0);
          },
        },
      ];
    }
    return [];
  }, [lowStockCount]);

  return (
    <Box sx={{ pb: selectedIds.length > 0 ? 8 : 4 }}>
      <PageHeader
        title="Остатки складов и номенклатура (ТМЦ)"
        subtitle="Реестр наличия запасных частей, адреса ячеистого хранения и привязка к оборудованию"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учёт', href: '/wms' },
          { label: 'Остатки' },
        ]}
        actions={
          <Stack direction="row" spacing={1.5}>
            {hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE) && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIsNomenclatureModalOpen(true)}
                aria-label="Создать новую номенклатуру"
                sx={{ px: 2.25, py: 0.75, fontWeight: 600 }}
              >
                Новая номенклатура
              </Button>
            )}
          </Stack>
        }
      />

      {/* Critical Stock Alerts */}
      <CriticalAlertBanner alerts={criticalAlerts} />

      <FilterToolbar
        activeFilterCount={activeFilterCount}
        onResetFilters={handleResetFilters}
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={lowStockOnly}
                  color="warning"
                  size="small"
                  onChange={(e) => {
                    setLowStockOnly(e.target.checked);
                    setPage(0);
                  }}
                />
              }
              label={
                <Typography variant="body2" fontWeight={600} color={lowStockOnly ? 'warning.dark' : 'text.primary'}>
                  Только дефицит
                </Typography>
              }
              sx={{ m: 0 }}
            />
            <ExportButton
              onExport={handleExport}
              formats={['xlsx', 'csv']}
              disabled={items.length === 0}
            />
          </Box>
        }
      >
        <Box sx={{ minWidth: { xs: '100%', sm: 260 } }}>
          <SearchInput
            value={search}
            placeholder="Поиск по названию или артикулу..."
            onSearch={(val) => {
              setSearch(val);
              setPage(0);
            }}
          />
        </Box>

        <TextField
          select
          size="small"
          label="Склад"
          value={selectedWarehouse}
          onChange={(e) => {
            setSelectedWarehouse(e.target.value);
            setSelectedZone('');
            setPage(0);
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Все склады</MenuItem>
          {warehouses.map((w) => (
            <MenuItem key={w.id} value={w.id}>
              {w.name} ({w.code})
            </MenuItem>
          ))}
        </TextField>

        {selectedWarehouse && zones.length > 0 && (
          <TextField
            select
            size="small"
            label="Зона склада"
            value={selectedZone}
            onChange={(e) => {
              setSelectedZone(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Все зоны</MenuItem>
            {zones.map((z) => (
              <MenuItem key={z.id} value={z.id}>
                {z.name} ({z.code})
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          select
          size="small"
          label="Категория"
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Все категории</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </FilterToolbar>

      {items.length === 0 && !isLoading ? (
        <EmptyState
          paper
          icon={<Inventory2OutlinedIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
          title="Позиции ТМЦ не найдены"
          description={
            activeFilterCount > 0
              ? 'По заданным критериям фильтрации позиции не найдены. Попробуйте сбросить фильтры.'
              : 'Номенклатурные позиции еще не оприходованы на склады.'
          }
          actionText={activeFilterCount > 0 ? 'Сбросить фильтры' : undefined}
          onAction={activeFilterCount > 0 ? handleResetFilters : undefined}
        />
      ) : (
        <DataTableWrapper
          loading={isLoading}
          page={page}
          pageSize={rowsPerPage}
          total={totalCount}
          onPageChange={(_, newPage) => setPage(newPage)}
          onPageSizeChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          stickyHeader
        >
          <Table size="small" aria-label="Реестр остатков складов и ТМЦ">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ width: 48 }}>
                  <Checkbox
                    size="small"
                    indeterminate={selectedIds.length > 0 && selectedIds.length < items.length}
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(items.map((i) => i.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </TableCell>
                <TableCell sx={{ width: 140 }}>Склад</TableCell>
                <TableCell sx={{ width: 160 }}>Место (Ячейка)</TableCell>
                <TableCell sx={{ width: 120 }}>Артикул</TableCell>
                <TableCell>Номенклатура (ТМЦ)</TableCell>
                <TableCell sx={{ width: 140 }}>Категория</TableCell>
                <TableCell align="right" sx={{ width: 140 }}>
                  Остаток на складе
                </TableCell>
                <TableCell align="center" sx={{ width: 110 }}>
                  Мин. остаток
                </TableCell>
                <TableCell align="center" sx={{ width: 120 }}>
                  Статус
                </TableCell>
                <TableCell>Совместимое оборудование</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row) => {
                const isChecked = selectedIds.includes(row.id);
                return (
                  <TableRow
                    key={row.id}
                    hover
                    selected={isChecked}
                    sx={{
                      bgcolor: row.isLowStock ? 'rgba(237, 108, 2, 0.04)' : undefined,
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedIds((prev) =>
                            prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={row.warehouseCode} size="small" variant="outlined" sx={{ fontWeight: 600, borderRadius: '4px' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                        {row.warehouseName}
                      </Typography>
                    </TableCell>

                  <TableCell>
                    {row.cellCode ? (
                      <Tooltip title="Нажмите, чтобы изменить ячейку хранения">
                        <Chip
                          icon={<PlaceOutlinedIcon sx={{ fontSize: '13px !important' }} />}
                          label={`${row.zoneCode || row.zoneName} • ${row.cellCode}`}
                          size="small"
                          variant="outlined"
                          clickable={hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE)}
                          onClick={() => hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE) && handleOpenLocationModal(row)}
                          sx={{ fontWeight: 600, borderRadius: '4px' }}
                        />
                      </Tooltip>
                    ) : (
                      hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE) ? (
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<PlaceOutlinedIcon sx={{ fontSize: 13 }} />}
                          onClick={() => handleOpenLocationModal(row)}
                          sx={{ fontSize: '0.75rem', py: 0.2 }}
                        >
                          + Ячейка
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Не указано
                        </Typography>
                      )
                    )}
                  </TableCell>

                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.75rem' }}>{row.article}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>{row.category}</TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color={row.isLowStock ? 'error.main' : 'text.primary'}
                      sx={{ fontFeatureSettings: '"tnum"' }}
                    >
                      {row.quantity} {row.unit}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ fontFeatureSettings: '"tnum"' }}>
                      {row.minStock} {row.minStock !== '—' ? row.unit : ''}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <StatusBadge
                      status={row.isLowStock ? 'LOW_STOCK' : 'NORMAL_STOCK'}
                      label={row.isLowStock ? 'Дефицит' : 'В норме'}
                      variant={row.isLowStock ? 'subtle' : 'dot'}
                    />
                  </TableCell>
                  <TableCell>
                    {row.compatibleEquipment && row.compatibleEquipment.length > 0 ? (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                        {row.compatibleEquipment.slice(0, 3).map((eq) => (
                          <Tooltip key={eq.id} title={`Инв. № ${eq.inventoryNumber}`}>
                            <Chip
                              icon={<PrecisionManufacturingIcon sx={{ fontSize: '13px !important' }} />}
                              label={eq.name}
                              size="small"
                              clickable
                              onClick={() => router.push(`/eps/${eq.id}`)}
                              sx={{ fontSize: '0.7rem', height: 20, borderRadius: '4px' }}
                            />
                          </Tooltip>
                        ))}
                        {row.compatibleEquipment.length > 3 && (
                          <Chip
                            label={`+${row.compatibleEquipment.length - 3}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 20, borderRadius: '4px' }}
                          />
                        )}
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Универсальное
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            </TableBody>
          </Table>
        </DataTableWrapper>
      )}

      {/* Диалог назначения места хранения (ячейки) */}
      <FormDialog
        open={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        title="Место хранения ТМЦ"
        subtitle={locStockItem ? `${locStockItem.name} (${locStockItem.warehouseName})` : undefined}
        icon={<PlaceOutlinedIcon color="primary" />}
        maxWidth="xs"
        loading={isSavingLoc}
        submitLabel={isSavingLoc ? 'Сохранение...' : 'Сохранить'}
        onSubmit={handleSaveLocation}
        submitDisabled={isSavingLoc || warehouseZonesForLoc.length === 0}
      >
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Номенклатура:
            </Typography>
            <Typography variant="subtitle2" fontWeight={700}>
              {locStockItem?.name} ({locStockItem?.article || 'б/а'})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Склад: {locStockItem?.warehouseName} ({locStockItem?.warehouseCode})
            </Typography>
          </Box>

          <Divider />

          {warehouseZonesForLoc.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                На складе <b>{locStockItem?.warehouseName}</b> еще не созданы зоны и ячейки.
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setIsLocationModalOpen(false);
                  router.push('/wms/warehouses');
                }}
                sx={{ mt: 1.5 }}
              >
                Перейти к настройке зон
              </Button>
            </Box>
          ) : (
            <TextField
              select
              fullWidth
              label="Выберите ячейку хранения"
              value={selectedCellId}
              onChange={(e) => setSelectedCellId(e.target.value)}
              helperText="Закрепляет основную ячейку размещения на складе"
            >
              <MenuItem value="">
                <em>— Без адреса (очистить ячейку) —</em>
              </MenuItem>
              {warehouseZonesForLoc.map((zone) => [
                <MenuItem key={`header-${zone.id}`} disabled sx={{ fontWeight: 700, bgcolor: 'grey.100' }}>
                  {zone.name} ({zone.code})
                </MenuItem>,
                ...zone.cells.map((cell) => (
                  <MenuItem key={cell.id} value={cell.id} sx={{ pl: 4 }}>
                    {cell.code} {cell.name ? `— ${cell.name}` : ''}
                  </MenuItem>
                )),
              ])}
            </TextField>
          )}
        </Stack>
      </FormDialog>

      {/* Диалог создания новой номенклатуры */}
      <CreateNomenclatureDialog
        open={isNomenclatureModalOpen}
        onClose={() => setIsNomenclatureModalOpen(false)}
        onCreated={() => fetchStock()}
        categories={categories}
      />

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={totalCount}
        onClearSelection={() => setSelectedIds([])}
        actions={[
          {
            label: 'Экспорт в CSV',
            icon: <FileDownloadOutlinedIcon fontSize="small" />,
            onClick: () => handleExport('csv'),
            color: 'primary',
          },
          {
            label: 'Сформировать списание',
            icon: <SendOutlinedIcon fontSize="small" />,
            onClick: handleBulkIssue,
            color: 'warning',
          },
        ]}
      />
    </Box>
  );
}

export default function WmsStockPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка остатков ТМЦ на складах..." />}>
      <WmsStockContent />
    </Suspense>
  );
}

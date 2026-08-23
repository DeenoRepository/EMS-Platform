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
  TableSortLabel,
  Paper,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Stack,
} from '@mui/material';
import { useSearchParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import AddIcon from '@mui/icons-material/Add';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import CreateNomenclatureDialog from '@/components/wms/CreateNomenclatureDialog';
import { StockDetailDrawer, PrintBarcodeModal, WarehouseSelect, WmsOperationWizardDialog, type PrintableLabelItem, type OperationType } from '@/components/wms';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PrintIcon from '@mui/icons-material/Print';
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
  type TableColumnOption,
} from '@/components/ui';


interface StockRow {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  warehouseResponsibleUserId?: string | null;
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

const STOCK_COLUMNS: TableColumnOption[] = [
  { id: 'warehouse', label: 'Склад хранения', defaultVisible: true },
  { id: 'zone', label: 'Адресная ячейка хранения', defaultVisible: true },
  { id: 'sku', label: 'Номенклатурный артикул', defaultVisible: true },
  { id: 'name', label: 'Наименование ТМЦ', defaultVisible: true, required: true },
  { id: 'category', label: 'Товарная группа / Категория', defaultVisible: true },
  { id: 'quantity', label: 'Фактический остаток', defaultVisible: true },
  { id: 'minQuantity', label: 'Неснижаемый нормативный остаток', defaultVisible: true },
  { id: 'status', label: 'Статус обеспеченности', defaultVisible: true },
  { id: 'equipment', label: 'Совместимое оборудование', defaultVisible: true },
];

export default function WmsStockPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка остатков ТМЦ..." />}>
      <WmsStockContent />
    </Suspense>
  );
}

function WmsStockContent() {
  const { enqueueSnackbar } = useSnackbar();
  const { user, hasPermission } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Data States
  const [items, setItems] = useState<StockRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Columns visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    STOCK_COLUMNS.map((c) => c.id)
  );

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

  // Slide-over Drawer: Stock Item Detail
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<StockRow | null>(null);

  // Modal: Print Barcode / Label
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printItems, setPrintItems] = useState<PrintableLabelItem[]>([]);

  // Modal: Operation Wizard
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<OperationType>('RECEIPT');

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

  // Проверка права на редактирование ячеек ТМЦ конкретного склада
  const canEditStockLocation = useCallback(
    (row?: StockRow | null) => {
      if (!row) return false;
      if (!hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE)) return false;
      if (
        user?.roles?.includes('admin') ||
        hasPermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
        hasPermission(PERMISSIONS.WMS_WAREHOUSES_MANAGE)
      ) {
        return true;
      }
      return Boolean(user?.userId && row.warehouseResponsibleUserId === user.userId);
    },
    [user, hasPermission]
  );

  // Open location assignment dialog
  const handleOpenLocationModal = async (row: StockRow) => {
    if (!canEditStockLocation(row)) {
      enqueueSnackbar(
        `Вы не являетесь ответственным лицом за склад "${row.warehouseName}". Установка и изменение ячеек чужих складов запрещены.`,
        { variant: 'warning' }
      );
      return;
    }

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
    if (!canEditStockLocation(locStockItem)) {
      enqueueSnackbar(
        `Вы не являетесь ответственным лицом за склад "${locStockItem.warehouseName}". Изменение ячеек чужих складов запрещено.`,
        { variant: 'error' }
      );
      return;
    }

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

  const handleOpenDrawer = (item: StockRow) => {
    setSelectedDrawerItem(item);
    setIsDrawerOpen(true);
  };

  const handleOpenPrintSingle = (item: StockRow) => {
    setPrintItems([
      {
        id: item.id,
        name: item.name,
        article: item.article,
        unit: item.unit,
        warehouseCode: item.warehouseCode,
        cellCode: item.cellCode,
        quantity: item.quantity,
      },
    ]);
    setIsPrintModalOpen(true);
  };

  const handleOpenPrintBulk = () => {
    const targetItems = items.filter((i) => selectedIds.includes(i.id));
    if (targetItems.length === 0) {
      enqueueSnackbar('Выберите позиции для печати этикеток', { variant: 'warning' });
      return;
    }
    setPrintItems(
      targetItems.map((i) => ({
        id: i.id,
        name: i.name,
        article: i.article,
        unit: i.unit,
        warehouseCode: i.warehouseCode,
        cellCode: i.cellCode,
        quantity: i.quantity,
      }))
    );
    setIsPrintModalOpen(true);
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

  const handleRequestSort = (property: string) => {
    const isAsc = sortField === property && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(property);
  };

  const sortedItems = useMemo(() => {
    if (!sortField) return items;
    return [...items].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      switch (sortField) {
        case 'warehouse':
          aVal = a.warehouseName || '';
          bVal = b.warehouseName || '';
          break;
        case 'zone':
          aVal = `${a.zoneCode || ''} ${a.cellCode || ''}`;
          bVal = `${b.zoneCode || ''} ${b.cellCode || ''}`;
          break;
        case 'sku':
          aVal = a.article || '';
          bVal = b.article || '';
          break;
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'category':
          aVal = a.category || '';
          bVal = b.category || '';
          break;
        case 'quantity':
          aVal = Number(a.quantity) || 0;
          bVal = Number(b.quantity) || 0;
          break;
        case 'minQuantity':
          aVal = Number(a.minStock) || 0;
          bVal = Number(b.minStock) || 0;
          break;
        case 'status':
          aVal = a.isLowStock ? 0 : 1;
          bVal = b.isLowStock ? 0 : 1;
          break;
        default:
          aVal = (a as unknown as Record<string, unknown>)[sortField] ?? '';
          bVal = (b as unknown as Record<string, unknown>)[sortField] ?? '';
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal), 'ru')
        : String(bVal).localeCompare(String(aVal), 'ru');
    });
  }, [items, sortField, sortDirection]);

  return (
    <Box sx={{ pb: selectedIds.length > 0 ? 8 : 4 }}>
      <PageHeader
        title="Номенклатурный справочник и остатки ТМЦ"
        subtitle="Складские запасы запасных частей, инструмента, ГСМ и материалов с адресным хранением"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учёт ТМЦ', href: '/wms' },
          { label: 'Номенклатура и остатки' },
        ]}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">

            {hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE) && (
              <Button
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                onClick={() => {
                  setWizardType('RECEIPT');
                  setIsWizardOpen(true);
                }}
                sx={{
                  height: 36,
                  px: 2,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  textTransform: 'none',
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                Мастер операций
              </Button>
            )}
          </Stack>
        }
      />

      {/* Critical Stock Alerts */}
      <CriticalAlertBanner alerts={criticalAlerts} />

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
        columns={STOCK_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        empty={items.length === 0 && !isLoading}
        emptyState={
          <EmptyState
            icon={<Inventory2OutlinedIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
            title="Позиции ТМЦ не найдены"
            description={
              activeFilterCount > 0
                ? 'По заданным критериям фильтрации позиции не найдены. Попробуйте сбросить фильтры.'
                : 'Номенклатурные позиции еще не оприходованы на склады.'
            }
            actionText={activeFilterCount > 0 ? 'Сбросить фильтры' : undefined}
            onAction={activeFilterCount > 0 ? handleResetFilters : undefined}
          />
        }
        toolbar={
          <FilterToolbar
            variant="embedded"
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
            actions={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                <WarehouseSelect
                  value={selectedWarehouse}
                  onChange={(val) => {
                    setSelectedWarehouse(val);
                    setSelectedZone('');
                    setPage(0);
                  }}
                  warehouses={warehouses}
                  isAdmin={hasPermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE) || user?.roles?.includes('admin')}
                  currentUserId={user?.userId}
                />

                {selectedWarehouse && zones.length > 0 && (
                  <TextField
                    select
                    size="small"
                    value={selectedZone}
                    onChange={(e) => {
                      setSelectedZone(e.target.value);
                      setPage(0);
                    }}
                    SelectProps={{
                      displayEmpty: true,
                    }}
                    sx={{
                      minWidth: 140,
                      backgroundColor: 'background.paper',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        height: 36,
                        '& fieldset': { borderColor: 'divider' },
                        '&:hover fieldset': { borderColor: 'grey.400' },
                      },
                    }}
                  >
                    <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все зоны</MenuItem>
                    {zones.map((z) => (
                      <MenuItem key={z.id} value={z.id} sx={{ fontSize: '0.8125rem' }}>
                        {z.name} ({z.code})
                      </MenuItem>
                    ))}
                  </TextField>
                )}

                <TextField
                  select
                  size="small"
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(0);
                  }}
                  SelectProps={{
                    displayEmpty: true,
                  }}
                  sx={{
                    minWidth: 160,
                    backgroundColor: 'background.paper',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      height: 36,
                      '& fieldset': { borderColor: 'divider' },
                      '&:hover fieldset': { borderColor: 'grey.400' },
                    },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все категории</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id} sx={{ fontSize: '0.8125rem' }}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>

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
                    <Typography variant="body2" fontWeight={600} color={lowStockOnly ? 'warning.dark' : 'text.primary'} sx={{ fontSize: '0.8125rem' }}>
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
            <Box sx={{ minWidth: { xs: '100%', sm: 260, md: 320 }, flexGrow: 1 }}>
              <SearchInput
                value={search}
                placeholder="Поиск по названию или артикулу..."
                onSearch={(val) => {
                  setSearch(val);
                  setPage(0);
                }}
              />
            </Box>
          </FilterToolbar>
        }
      >
        <Table size="small" aria-label="Реестр остатков складов и ТМЦ">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.paper' }}>
              <TableCell padding="checkbox" sx={{ width: 44, pl: 2 }}>
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

              {visibleColumns.includes('warehouse') && (
                <TableCell sx={{ width: 140, fontWeight: 700, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'warehouse'}
                    direction={sortField === 'warehouse' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('warehouse')}
                  >
                    СКЛАД
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('zone') && (
                <TableCell sx={{ width: 160, fontWeight: 700, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'zone'}
                    direction={sortField === 'zone' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('zone')}
                  >
                    МЕСТО (ЯЧЕЙКА)
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('sku') && (
                <TableCell sx={{ width: 120, fontWeight: 700, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'sku'}
                    direction={sortField === 'sku' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('sku')}
                  >
                    АРТИКУЛ
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('name') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'name'}
                    direction={sortField === 'name' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    НОМЕНКЛАТУРА (ТМЦ)
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('category') && (
                <TableCell sx={{ width: 140, fontWeight: 700, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'category'}
                    direction={sortField === 'category' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('category')}
                  >
                    КАТЕГОРИЯ
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('quantity') && (
                <TableCell align="right" sx={{ width: 140, fontWeight: 700, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'quantity'}
                    direction={sortField === 'quantity' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('quantity')}
                  >
                    ОСТАТОК НА СКЛАДЕ
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('minQuantity') && (
                <TableCell align="center" sx={{ width: 110, fontWeight: 700, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'minQuantity'}
                    direction={sortField === 'minQuantity' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('minQuantity')}
                  >
                    МИН. ОСТАТОК
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('status') && (
                <TableCell align="center" sx={{ width: 120, fontWeight: 700, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'status'}
                    direction={sortField === 'status' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('status')}
                  >
                    СТАТУС
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('equipment') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '0.05em' }}>
                  СОВМЕСТИМОЕ ОБОРУДОВАНИЕ
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedItems.map((row) => {
              const isChecked = selectedIds.includes(row.id);
              return (
                <TableRow
                  key={row.id}
                  hover
                  selected={isChecked}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: row.isLowStock ? 'rgba(237, 108, 2, 0.04)' : undefined,
                  }}
                >
                  <TableCell padding="checkbox" sx={{ pl: 2 }}>
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

                  {visibleColumns.includes('warehouse') && (
                    <TableCell>
                      <Chip
                        label={row.warehouseCode}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          borderRadius: '4px',
                          fontSize: '0.6875rem',
                          backgroundColor: 'background.paper',
                          color: 'text.secondary',
                          border: '1px solid #e2e8f0',
                          height: 20,
                        }}
                      />
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.disabled', fontSize: '0.75rem' }}>
                        {row.warehouseName}
                      </Typography>
                    </TableCell>
                  )}

                  {visibleColumns.includes('zone') && (
                    <TableCell>
                      {(() => {
                        const canEdit = canEditStockLocation(row);
                        if (row.cellCode) {
                          return (
                            <Tooltip
                              title={
                                canEdit
                                  ? 'Нажмите, чтобы изменить ячейку хранения'
                                  : 'Чужой склад: смена ячейки разрешена только назначенному МОЛ склада или администратору'
                              }
                            >
                              <span>
                                <Chip
                                  icon={<PlaceOutlinedIcon sx={{ fontSize: '13px !important' }} />}
                                  label={`${row.zoneCode || row.zoneName} • ${row.cellCode}`}
                                  size="small"
                                  clickable={canEdit}
                                  onClick={(e) => {
                                    if (canEdit) {
                                      e.stopPropagation();
                                      handleOpenLocationModal(row);
                                    }
                                  }}
                                  sx={{
                                    fontWeight: 600,
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    backgroundColor: canEdit ? '#f0f9ff' : 'background.default',
                                    color: canEdit ? 'primary.main' : 'text.disabled',
                                    border: canEdit ? '1px solid #bae6fd' : '1px solid #e2e8f0',
                                    cursor: canEdit ? 'pointer' : 'default',
                                    opacity: canEdit ? 1 : 0.85,
                                  }}
                                />
                              </span>
                            </Tooltip>
                          );
                        }

                        if (canEdit) {
                          return (
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<PlaceOutlinedIcon sx={{ fontSize: 13, color: 'primary.main' }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenLocationModal(row);
                              }}
                              sx={{ fontSize: '0.75rem', py: 0.2, fontWeight: 600, color: 'primary.main' }}
                            >
                              + Ячейка
                            </Button>
                          );
                        }

                        return (
                          <Tooltip title="Чужой склад: назначение ячейки разрешено только назначенному МОЛ склада или администратору">
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', cursor: 'default' }}>
                              —
                            </Typography>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                  )}

                  {visibleColumns.includes('sku') && (
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 500, fontSize: '0.8125rem', color: 'text.secondary' }}>
                      {row.article || '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('name') && (
                    <TableCell
                      onClick={() => handleOpenDrawer(row)}
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        color: 'primary.main',
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      {row.name}
                    </TableCell>
                  )}


                  {visibleColumns.includes('category') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      {row.category}
                    </TableCell>
                  )}

                  {visibleColumns.includes('quantity') && (
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                          fontFeatureSettings: '"tnum"',
                          fontSize: '0.8125rem',
                          color: row.isLowStock ? 'error.main' : 'text.primary',
                        }}
                      >
                        {row.quantity} {row.unit}
                      </Typography>
                    </TableCell>
                  )}

                  {visibleColumns.includes('minQuantity') && (
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"', fontSize: '0.8125rem', color: 'text.disabled' }}>
                        {row.minStock} {row.minStock !== '—' ? row.unit : ''}
                      </Typography>
                    </TableCell>
                  )}

                  {visibleColumns.includes('status') && (
                    <TableCell align="center">
                      <StatusBadge
                        status={row.isLowStock ? 'LOW_STOCK' : 'NORMAL_STOCK'}
                        label={row.isLowStock ? 'Дефицит' : 'В норме'}
                      />
                    </TableCell>
                  )}

                  {visibleColumns.includes('equipment') && (
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
                                sx={{
                                  fontSize: '0.6875rem',
                                  height: 22,
                                  borderRadius: '4px',
                                  backgroundColor: 'background.paper',
                                  border: '1px solid #e2e8f0',
                                  color: 'text.secondary',
                                  fontWeight: 500,
                                }}
                              />
                            </Tooltip>
                          ))}
                          {row.compatibleEquipment.length > 3 && (
                            <Chip
                              label={`+${row.compatibleEquipment.length - 3}`}
                              size="small"
                              sx={{
                                fontSize: '0.6875rem',
                                height: 22,
                                borderRadius: '4px',
                                backgroundColor: 'grey.100',
                                color: 'text.disabled',
                                fontWeight: 600,
                              }}
                            />
                          )}
                        </Stack>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>—</Typography>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableWrapper>

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
        submitDisabled={isSavingLoc || !canEditStockLocation(locStockItem) || warehouseZonesForLoc.length === 0}
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

          {!canEditStockLocation(locStockItem) && (
            <Box sx={{ p: 1.5, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 1.5 }}>
              <Typography variant="body2" color="error.main" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                Изменение ячеек запрещено: вы не являетесь ответственным лицом за склад «{locStockItem?.warehouseName}».
              </Typography>
            </Box>
          )}

          {warehouseZonesForLoc.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                На складе <b>{locStockItem?.warehouseName}</b> еще не созданы зоны и ячейки.
              </Typography>
              {canEditStockLocation(locStockItem) && (
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
              )}
            </Box>
          ) : (
            <TextField
              select
              fullWidth
              label="Выберите ячейку хранения"
              value={selectedCellId}
              disabled={!canEditStockLocation(locStockItem)}
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
            label: 'Печать этикеток',
            icon: <PrintIcon fontSize="small" />,
            onClick: handleOpenPrintBulk,
            color: 'primary',
          },
          {
            label: 'Экспорт в CSV',
            icon: <FileDownloadOutlinedIcon fontSize="small" />,
            onClick: () => handleExport('csv'),
            color: 'primary',
          },
          {
            label: 'Сформировать списание',
            icon: <PrintIcon fontSize="small" />,
            onClick: handleBulkIssue,
            color: 'warning',
          },
        ]}
      />

      {/* Slide-over Drawer для детального просмотра ТМЦ */}
      <StockDetailDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        stockItem={selectedDrawerItem}
        onChangeLocation={(item) => handleOpenLocationModal(item)}
        onPrintLabel={(item) => handleOpenPrintSingle(item)}
      />

      {/* Модальное окно печати термоэтикеток и штрихкодов */}
      <PrintBarcodeModal
        open={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        items={printItems}
      />

      {/* Мастер складских операций */}
      <WmsOperationWizardDialog
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        initialType={wizardType}
        onSuccess={() => fetchStock()}
      />
    </Box>
  );
}


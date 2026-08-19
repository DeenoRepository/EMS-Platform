'use client';

import React, { useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Chip,
  IconButton,
  Stack,
  Autocomplete,
  Divider,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Radio,
  RadioGroup,
  FormControlLabel,
  Collapse,
  InputAdornment,
} from '@mui/material';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import OutboxIcon from '@mui/icons-material/Outbox';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PersonIcon from '@mui/icons-material/Person';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BusinessIcon from '@mui/icons-material/Business';
import TuneIcon from '@mui/icons-material/Tune';
import PlaceIcon from '@mui/icons-material/Place';
import CreateNomenclatureDialog from '@/components/wms/CreateNomenclatureDialog';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS, formatDateTime } from '@ems/shared';
import {
  StatCard,
  FilterToolbar,
  DataTableWrapper,
  EmptyState,
  StatusBadge,
  PageLoading,
  FormDialog,
  type TableColumnOption,
} from '@/components/ui';

const OPERATIONS_COLUMNS: TableColumnOption[] = [
  { id: 'date', label: 'Дата / Время', defaultVisible: true },
  { id: 'type', label: 'Тип операции', defaultVisible: true },
  { id: 'warehouse', label: 'Склад', defaultVisible: true },
  { id: 'items', label: 'Позиции и количество', defaultVisible: true, required: true },
  { id: 'recipient', label: 'Получатель / Назначение / Причина', defaultVisible: true },
  { id: 'comment', label: 'Примечание / Комментарий', defaultVisible: true },
  { id: 'executor', label: 'Исполнитель', defaultVisible: true },
];

export type OperationMode = 'RECEIPT' | 'ISSUE_EMPLOYEE' | 'ISSUE_WRITE_OFF' | 'TRANSFER';

const WRITE_OFF_REASONS = [
  { value: 'NON_LIQUID', label: 'Неликвид / Моральное устаревание' },
  { value: 'SCRAP', label: 'Производственный брак / Дефект' },
  { value: 'EXPIRED', label: 'Истечение срока годности / хранения' },
  { value: 'LOSS', label: 'Бой / Порча / Утрата' },
  { value: 'OTHER', label: 'Хозяйственные нужды / Прочее списание' },
];

interface StockOperation {
  id: string;
  type: string;
  date: string;
  counterparty?: string | null;
  document?: string | null;
  comment?: string | null;
  warehouse: { id: string; name: string; code: string };
  createdBy: { displayName: string; ldapLogin: string };
  items: Array<{
    id: string;
    quantity: number;
    nomenclature: { id: string; name: string; article?: string | null; unit: string };
    equipment?: { id: string; name: string; inventoryNumber: string } | null;
  }>;
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  responsibleUserId?: string | null;
  responsibleUser?: { id: string; displayName: string; ldapLogin: string } | null;
  zones?: Array<{
    id: string;
    name: string;
    code: string;
    cells: Array<{ id: string; code: string; name?: string | null }>;
  }>;
}

interface NomenclatureOption {
  id: string;
  name: string;
  article?: string | null;
  unit: string;
  totalStock?: number;
  category?: { id: string; name: string } | null;
}

interface EquipmentOption {
  id: string;
  name: string;
  inventoryNumber?: string | null;
}

interface UserOption {
  id: string;
  displayName: string;
  ldapLogin: string;
  email?: string | null;
  roles?: string[];
}

interface FormRow {
  nomenclature: NomenclatureOption | null;
  quantity: number | string;
  equipment: EquipmentOption | null;
  cellId?: string;
  price?: number | string;
  batchNumber?: string;
  showExtended?: boolean;
}

function WmsOperationsContent() {
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { user, hasPermission } = useAuth();

  const [operations, setOperations] = useState<StockOperation[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [nomenclatures, setNomenclatures] = useState<NomenclatureOption[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);
  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Warehouse stock map: nomenclatureId -> quantity in selected warehouse
  const [warehouseStockMap, setWarehouseStockMap] = useState<Record<string, number>>({});
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  // Filters
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>(searchParams.get('action') || '');
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Create Operation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [opMode, setOpMode] = useState<OperationMode>('RECEIPT');
  const [opWarehouseId, setOpWarehouseId] = useState('');
  const [opTargetWarehouseId, setOpTargetWarehouseId] = useState('');
  const [opCounterparty, setOpCounterparty] = useState('');
  const [opComment, setOpComment] = useState('');

  // Mode Specific Form States
  const [selectedEmployee, setSelectedEmployee] = useState<UserOption | null>(null);
  const [writeOffType, setWriteOffType] = useState<'EQUIPMENT' | 'REASON'>('EQUIPMENT');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentOption | null>(null);
  const [selectedWriteOffReason, setSelectedWriteOffReason] = useState<string>('NON_LIQUID');

  const [formRows, setFormRows] = useState<FormRow[]>([
    { nomenclature: null, quantity: 1, equipment: null, cellId: '', price: '', batchNumber: '', showExtended: false },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fast Create Nomenclature inside Operation Modal
  const [isQuickNomOpen, setIsQuickNomOpen] = useState(false);
  const [quickNomRowIndex, setQuickNomRowIndex] = useState<number | null>(null);

  const isAdmin = Boolean(
    user?.roles?.includes('admin') ||
    hasPermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
    hasPermission(PERMISSIONS.WMS_WAREHOUSES_MANAGE)
  );

  // Warehouses available to the user as Source / Receipt warehouse (based on material responsibility)
  const availableSourceWarehouses = useMemo(() => {
    if (isAdmin) return warehouses;
    return warehouses.filter((w) => w.responsibleUserId === user?.userId);
  }, [warehouses, isAdmin, user?.userId]);

  // Target warehouses for transfer (any warehouse other than the source)
  const availableTargetWarehouses = useMemo(() => {
    return warehouses.filter((w) => w.id !== opWarehouseId);
  }, [warehouses, opWarehouseId]);

  // Available storage cells for the selected active warehouse
  const selectedWarehouseObj = useMemo(() => {
    return warehouses.find((w) => w.id === opWarehouseId);
  }, [warehouses, opWarehouseId]);

  const warehouseCells = useMemo(() => {
    if (!selectedWarehouseObj || !selectedWarehouseObj.zones) return [];
    const cells: { id: string; label: string; zoneCode: string }[] = [];
    selectedWarehouseObj.zones.forEach((z) => {
      (z.cells || []).forEach((c) => {
        cells.push({
          id: c.id,
          label: `${z.code}: ${c.code}${c.name ? ` (${c.name})` : ''}`,
          zoneCode: z.code,
        });
      });
    });
    return cells;
  }, [selectedWarehouseObj]);

  // Load initial dictionaries ONCE on mount
  useEffect(() => {
    async function loadDictionaries() {
      try {
        const [wRes, nRes, eRes, uRes] = await Promise.all([
          fetch('/api/wms/warehouses'),
          fetch('/api/wms/nomenclature?limit=500'),
          fetch('/api/eps/equipment?pageSize=200'),
          fetch('/api/users'),
        ]);

        if (wRes.ok) {
          const wJson = await wRes.json();
          if (wJson.success) {
            setWarehouses(wJson.data);
          }
        }

        if (nRes.ok) {
          const nJson = await nRes.json();
          if (nJson.success) setNomenclatures(nJson.data);
        }

        if (eRes.ok) {
          const eJson = await eRes.json();
          if (eJson.success && eJson.data.items) {
            setEquipmentList(
              eJson.data.items.map((eq: any) => ({
                id: eq.id,
                name: eq.name,
                inventoryNumber: eq.inventoryNumber,
              }))
            );
          }
        }

        if (uRes.ok) {
          const uJson = await uRes.json();
          if (uJson.success && uJson.data) {
            setUsersList(uJson.data);
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки справочников:', err);
      }
    }
    loadDictionaries();
  }, []);

  // Set default warehouse when source warehouses become available
  useEffect(() => {
    if (availableSourceWarehouses.length > 0 && (!opWarehouseId || !availableSourceWarehouses.some((w) => w.id === opWarehouseId))) {
      setOpWarehouseId(availableSourceWarehouses[0].id);
    }
  }, [availableSourceWarehouses, opWarehouseId]);

  // Fetch stock quantities for the active operation warehouse (for ISSUE / TRANSFER validation)
  useEffect(() => {
    if (!opWarehouseId || !isCreateModalOpen) return;

    async function loadWarehouseStock() {
      setIsLoadingStock(true);
      try {
        const res = await fetch(`/api/wms/stock?warehouseId=${opWarehouseId}&pageSize=500`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data.items) {
            const stockMap: Record<string, number> = {};
            json.data.items.forEach((item: any) => {
              stockMap[item.nomenclatureId] = Number(item.quantity);
            });
            setWarehouseStockMap(stockMap);
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки остатков склада для операции:', err);
      } finally {
        setIsLoadingStock(false);
      }
    }
    loadWarehouseStock();
  }, [opWarehouseId, isCreateModalOpen]);

  // Open modal if query parameter passed
  useEffect(() => {
    const action = searchParams.get('action') || searchParams.get('create');
    if (action) {
      if (action === 'RECEIPT') {
        handleOpenCreate('RECEIPT');
      } else if (action === 'ISSUE' || action === 'ISSUE_EMPLOYEE') {
        handleOpenCreate('ISSUE_EMPLOYEE');
      } else if (action === 'ISSUE_WRITE_OFF' || action === 'WRITE_OFF') {
        handleOpenCreate('ISSUE_WRITE_OFF');
      } else if (action === 'TRANSFER') {
        handleOpenCreate('TRANSFER');
      }
    }
  }, [searchParams]);

  const fetchOperations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedWarehouse) params.set('warehouseId', selectedWarehouse);
      if (selectedType) params.set('type', selectedType);
      params.set('page', String(page + 1));
      params.set('pageSize', String(rowsPerPage));

      const res = await fetch(`/api/wms/operations?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setOperations(json.data.items);
          setTotalCount(json.data.total);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки журнала операций:', err);
      enqueueSnackbar('Ошибка загрузки журнала операций', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedWarehouse, selectedType, page, rowsPerPage, enqueueSnackbar]);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  const handleOpenCreate = (mode: OperationMode) => {
    setOpMode(mode);
    setFormRows([{ nomenclature: null, quantity: 1, equipment: null, cellId: '', price: '', batchNumber: '', showExtended: mode === 'RECEIPT' }]);
    setOpCounterparty('');
    setOpComment('');
    setSelectedEmployee(null);
    setSelectedEquipment(null);
    setWriteOffType('EQUIPMENT');
    setSelectedWriteOffReason('NON_LIQUID');

    if (availableSourceWarehouses.length > 0) {
      setOpWarehouseId(availableSourceWarehouses[0].id);
    } else {
      setOpWarehouseId('');
    }
    setIsCreateModalOpen(true);
  };

  const handleAddRow = () => {
    setFormRows((prev) => [
      ...prev,
      { nomenclature: null, quantity: 1, equipment: null, cellId: '', price: '', batchNumber: '', showExtended: opMode === 'RECEIPT' },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    setFormRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx: number, field: keyof FormRow, val: any) => {
    setFormRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  // Calculate total sum of the receipt for user convenience
  const calculatedReceiptSum = useMemo(() => {
    if (opMode !== 'RECEIPT') return 0;
    return formRows.reduce((acc, row) => {
      const qty = Number(row.quantity) || 0;
      const pr = Number(row.price) || 0;
      return acc + qty * pr;
    }, 0);
  }, [formRows, opMode]);

  const handleSubmit = async () => {
    if (!opWarehouseId) {
      enqueueSnackbar('Выберите склад, за который вы ответственны', { variant: 'warning' });
      return;
    }

    if (opMode === 'TRANSFER' && (!opTargetWarehouseId || opTargetWarehouseId === opWarehouseId)) {
      enqueueSnackbar('Выберите склад-получатель из списка (отличный от склада-отправителя)', { variant: 'warning' });
      return;
    }

    if (opMode === 'ISSUE_EMPLOYEE' && !selectedEmployee) {
      enqueueSnackbar('Выберите сотрудника, которому выдаются ТМЦ', { variant: 'warning' });
      return;
    }

    if (opMode === 'ISSUE_WRITE_OFF' && writeOffType === 'EQUIPMENT' && !selectedEquipment) {
      enqueueSnackbar('Выберите оборудование, на которое списываются ТМЦ', { variant: 'warning' });
      return;
    }

    // Validate rows
    const validItems = [];
    for (let i = 0; i < formRows.length; i++) {
      const row = formRows[i];
      if (!row.nomenclature) {
        enqueueSnackbar(`В позиции #${i + 1} не выбрана номенклатура`, { variant: 'warning' });
        return;
      }
      const qty = Number(row.quantity);
      if (isNaN(qty) || qty <= 0) {
        enqueueSnackbar(`В позиции #${i + 1} указано некорректное количество`, { variant: 'warning' });
        return;
      }

      // Check available quantity for ISSUE & TRANSFER
      if (opMode !== 'RECEIPT') {
        const available = warehouseStockMap[row.nomenclature.id] || 0;
        if (qty > available) {
          enqueueSnackbar(
            `В позиции #${i + 1} (${row.nomenclature.name}): запрошено ${qty} ${row.nomenclature.unit}, но на складе доступно ${available} ${row.nomenclature.unit}!`,
            { variant: 'error' }
          );
          return;
        }
      }

      validItems.push({
        nomenclatureId: row.nomenclature.id,
        quantity: qty,
        cellId: row.cellId || undefined,
        price: row.price ? Number(row.price) : undefined,
        batchNumber: row.batchNumber ? String(row.batchNumber).trim() : undefined,
        equipmentId: opMode === 'ISSUE_WRITE_OFF' && writeOffType === 'EQUIPMENT' && selectedEquipment
          ? selectedEquipment.id
          : (row.equipment ? row.equipment.id : undefined),
      });
    }

    if (validItems.length === 0) {
      enqueueSnackbar('Добавьте хотя бы одну позицию ТМЦ', { variant: 'warning' });
      return;
    }

    // Build payload according to operation submode
    let backendType: 'RECEIPT' | 'ISSUE' | 'TRANSFER' = 'RECEIPT';
    let counterpartyPayload = opCounterparty.trim() || undefined;

    if (opMode === 'RECEIPT') {
      backendType = 'RECEIPT';
      counterpartyPayload = opCounterparty.trim() || undefined;
    } else if (opMode === 'TRANSFER') {
      backendType = 'TRANSFER';
    } else if (opMode === 'ISSUE_EMPLOYEE') {
      backendType = 'ISSUE';
      counterpartyPayload = `Сотрудник: ${selectedEmployee?.displayName} (${selectedEmployee?.ldapLogin})`;
    } else if (opMode === 'ISSUE_WRITE_OFF') {
      backendType = 'ISSUE';
      if (writeOffType === 'EQUIPMENT') {
        counterpartyPayload = selectedEquipment
          ? `Оборудование: ${selectedEquipment.name} (${selectedEquipment.inventoryNumber || 'б/н'})`
          : 'Списание на оборудование';
      } else {
        const reasonObj = WRITE_OFF_REASONS.find((r) => r.value === selectedWriteOffReason);
        counterpartyPayload = `Списание: ${reasonObj?.label || 'Неликвид'}`;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wms/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: backendType,
          warehouseId: opWarehouseId,
          targetWarehouseId: opMode === 'TRANSFER' ? opTargetWarehouseId : undefined,
          counterparty: counterpartyPayload,
          comment: opComment.trim() || undefined,
          items: validItems,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Складская операция успешно проведена', { variant: 'success' });
        setIsCreateModalOpen(false);
        fetchOperations();
      } else {
        enqueueSnackbar(json.error || 'Ошибка проведения операции', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('Ошибка сети при проведении операции', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNomenclatureCreated = (newItem: { id: string; name: string; article?: string | null; unit: string }) => {
    setNomenclatures((prev) => [newItem, ...prev]);
    if (quickNomRowIndex !== null && quickNomRowIndex < formRows.length) {
      handleRowChange(quickNomRowIndex, 'nomenclature', newItem);
    }
    setQuickNomRowIndex(null);
  };

  const handleKpiFilter = (type: string) => {
    if (selectedType === type) {
      setSelectedType('');
    } else {
      setSelectedType(type);
    }
    setPage(0);
  };

  const handleResetFilters = () => {
    setSelectedWarehouse('');
    setSelectedType('');
    setPage(0);
  };

  const activeFilterCount = (selectedWarehouse ? 1 : 0) + (selectedType ? 1 : 0);

  // Sorting & Column Visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    OPERATIONS_COLUMNS.map((c) => c.id)
  );
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleRequestSort = (property: string) => {
    const isAsc = sortField === property && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(property);
  };

  const sortedOperations = useMemo(() => {
    if (!sortField) return operations;
    return [...operations].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      switch (sortField) {
        case 'date':
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
          break;
        case 'type':
          aVal = a.type || '';
          bVal = b.type || '';
          break;
        case 'warehouse':
          aVal = a.warehouse.name || '';
          bVal = b.warehouse.name || '';
          break;
        case 'executor':
          aVal = a.createdBy?.displayName || '';
          bVal = b.createdBy?.displayName || '';
          break;
        case 'comment':
          aVal = a.comment || '';
          bVal = b.comment || '';
          break;
        default:
          aVal = (a as any)[sortField] || '';
          bVal = (b as any)[sortField] || '';
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal), 'ru')
        : String(bVal).localeCompare(String(aVal), 'ru');
    });
  }, [operations, sortField, sortDirection]);

  const renderRecipientBadge = (op: StockOperation) => {
    const hasEquipment = op.items.some((i) => i.equipment);
    const cp = op.counterparty || '';

    if (hasEquipment) {
      return (
        <Stack spacing={0.5}>
          {op.items
            .filter((i) => i.equipment)
            .map((i) => (
              <Chip
                key={i.id}
                icon={<PrecisionManufacturingIcon sx={{ fontSize: '14px !important' }} />}
                label={`${i.equipment?.name} (${i.equipment?.inventoryNumber})`}
                size="small"
                sx={{
                  fontSize: '0.75rem',
                  backgroundColor: '#f0fdf4',
                  color: '#16a34a',
                  border: '1px solid #bbf7d0',
                  fontWeight: 500,
                  borderRadius: '4px',
                }}
              />
            ))}
        </Stack>
      );
    }

    if (cp.startsWith('Сотрудник:')) {
      return (
        <Chip
          icon={<PersonIcon sx={{ fontSize: '14px !important' }} />}
          label={cp.replace('Сотрудник:', '').trim()}
          size="small"
          sx={{
            fontSize: '0.75rem',
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            fontWeight: 500,
            borderRadius: '4px',
          }}
        />
      );
    }

    if (cp.startsWith('Списание:')) {
      return (
        <Chip
          icon={<DeleteSweepIcon sx={{ fontSize: '14px !important' }} />}
          label={cp.replace('Списание:', '').trim()}
          size="small"
          sx={{
            fontSize: '0.75rem',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            fontWeight: 500,
            borderRadius: '4px',
          }}
        />
      );
    }

    if (op.type === 'RECEIPT' && cp) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <BusinessIcon sx={{ fontSize: 16, color: '#64748b' }} />
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#334155' }}>
            {cp}
          </Typography>
        </Box>
      );
    }

    if (op.type === 'TRANSFER' && op.comment?.includes('Перемещение на склад')) {
      return (
        <Chip
          icon={<SwapHorizIcon sx={{ fontSize: '14px !important' }} />}
          label={op.comment.replace('Перемещение на склад', 'Получатель:').trim()}
          size="small"
          sx={{
            fontSize: '0.75rem',
            backgroundColor: '#f5f3ff',
            color: '#7c3aed',
            border: '1px solid #ddd6fe',
            fontWeight: 500,
            borderRadius: '4px',
          }}
        />
      );
    }

    return (
      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
        {cp || '—'}
      </Typography>
    );
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Складские операции и журнал перемещений"
        subtitle="Регистрация прихода ТМЦ от поставщиков, выдачи сотрудникам, списания на оборудование и перемещений"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учёт', href: '/wms' },
          { label: 'Операции' },
        ]}
        actions={
          hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE) && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenCreate('RECEIPT')}
                aria-label="Оформить складскую операцию"
                sx={{ px: 2.25, py: 0.75, fontWeight: 600 }}
              >
                Новая операция
              </Button>
            </Stack>
          )
        }
      />

      {/* KPI Metric Cards */}
      <Grid container spacing={1.75} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего операций"
            value={totalCount}
            subtitle="В журнале движения ТМЦ"
            icon={<SwapHorizIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
            active={selectedType === ''}
            onClick={() => handleKpiFilter('')}
            loading={isLoading && totalCount === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Поступления (Приход)"
            value={operations.filter((o) => o.type === 'RECEIPT').length}
            subtitle="От поставщиков"
            icon={<MoveToInboxIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="#16a34a"
            accentColor="#16a34a"
            active={selectedType === 'RECEIPT'}
            onClick={() => handleKpiFilter('RECEIPT')}
            loading={isLoading && totalCount === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Выдача и Списание"
            value={operations.filter((o) => o.type === 'ISSUE').length}
            subtitle="Сотрудникам и на оборудование"
            icon={<OutboxIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(217, 119, 6, 0.08)"
            iconColor="#d97706"
            accentColor="#d97706"
            active={selectedType === 'ISSUE'}
            onClick={() => handleKpiFilter('ISSUE')}
            loading={isLoading && totalCount === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Перемещения"
            value={operations.filter((o) => o.type === 'TRANSFER').length}
            subtitle="Межскладские трансферы"
            icon={<SwapHorizIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(124, 58, 237, 0.08)"
            iconColor="#7c3aed"
            accentColor="#7c3aed"
            active={selectedType === 'TRANSFER'}
            onClick={() => handleKpiFilter('TRANSFER')}
            loading={isLoading && totalCount === 0}
          />
        </Grid>
      </Grid>

      {/* Main Operations Registry Table */}
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
        toolbar={
          <FilterToolbar
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
            columns={OPERATIONS_COLUMNS}
            visibleColumns={visibleColumns}
            onColumnVisibilityChange={setVisibleColumns}
            filters={[
              {
                id: 'warehouse',
                label: 'Склад',
                value: selectedWarehouse,
                onChange: (v) => {
                  setSelectedWarehouse(v);
                  setPage(0);
                },
                options: [
                  { label: 'Все склады', value: '' },
                  ...warehouses.map((w) => ({
                    label: `${w.name} (${w.code})`,
                    value: w.id,
                  })),
                ],
              },
              {
                id: 'type',
                label: 'Тип операции',
                value: selectedType,
                onChange: (v) => {
                  setSelectedType(v);
                  setPage(0);
                },
                options: [
                  { label: 'Все типы', value: '' },
                  { label: 'Приход', value: 'RECEIPT' },
                  { label: 'Расход / Выдача / Списание', value: 'ISSUE' },
                  { label: 'Перемещение', value: 'TRANSFER' },
                ],
              },
            ]}
          />
        }
      >
        <Table size="small" stickyHeader aria-label="Журнал складских операций">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              {visibleColumns.includes('date') && (
                <TableCell sx={{ width: 150, fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'date'}
                    direction={sortField === 'date' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('date')}
                  >
                    ДАТА / ВРЕМЯ
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('type') && (
                <TableCell sx={{ width: 140, fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'type'}
                    direction={sortField === 'type' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('type')}
                  >
                    ТИП ОПЕРАЦИИ
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('warehouse') && (
                <TableCell sx={{ width: 180, fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'warehouse'}
                    direction={sortField === 'warehouse' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('warehouse')}
                  >
                    СКЛАД
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('items') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  СПЕЦИФИКАЦИЯ ТМЦ
                </TableCell>
              )}

              {visibleColumns.includes('recipient') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  ПОЛУЧАТЕЛЬ / НАЗНАЧЕНИЕ
                </TableCell>
              )}

              {visibleColumns.includes('comment') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'comment'}
                    direction={sortField === 'comment' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('comment')}
                  >
                    ПРИМЕЧАНИЕ / КОММЕНТАРИЙ
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('executor') && (
                <TableCell sx={{ width: 150, fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'executor'}
                    direction={sortField === 'executor' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('executor')}
                  >
                    ИСПОЛНИТЕЛЬ
                  </TableSortLabel>
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedOperations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} sx={{ py: 6 }}>
                  <EmptyState
                    icon={<SwapHorizIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
                    title="Операций не найдено"
                    description="В журнале пока нет записей о движении ТМЦ, соответствующих выбранным фильтрам."
                    actionText={hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE) ? "Оформить приход" : undefined}
                    onAction={hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE) ? () => handleOpenCreate('RECEIPT') : undefined}
                    minHeight={200}
                  />
                </TableCell>
              </TableRow>
            ) : (
              sortedOperations.map((op) => (
                <TableRow key={op.id} hover>
                  {visibleColumns.includes('date') && (
                    <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.8125rem', color: '#475569' }}>
                      {formatDateTime(op.date)}
                    </TableCell>
                  )}

                  {visibleColumns.includes('type') && (
                    <TableCell>
                      <StatusBadge status={op.type} />
                    </TableCell>
                  )}

                  {visibleColumns.includes('warehouse') && (
                    <TableCell>
                      <Chip
                        label={op.warehouse.code}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          borderRadius: '4px',
                          fontSize: '0.6875rem',
                          backgroundColor: '#ffffff',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                          height: 20,
                        }}
                      />
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: '#64748b', fontSize: '0.75rem' }}>
                        {op.warehouse.name}
                      </Typography>
                    </TableCell>
                  )}

                  {visibleColumns.includes('items') && (
                    <TableCell>
                      <Stack spacing={0.5}>
                        {op.items.map((it) => (
                          <Typography key={it.id} variant="body2" sx={{ fontSize: '0.8125rem', color: '#0f172a' }}>
                            <b>{it.nomenclature.name}</b>: {it.quantity} {it.nomenclature.unit}
                          </Typography>
                        ))}
                      </Stack>
                    </TableCell>
                  )}

                  {visibleColumns.includes('recipient') && (
                    <TableCell>
                      {renderRecipientBadge(op)}
                    </TableCell>
                  )}

                  {visibleColumns.includes('comment') && (
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#475569' }}>
                        {op.comment || '—'}
                      </Typography>
                    </TableCell>
                  )}

                  {visibleColumns.includes('executor') && (
                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                      <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem', color: '#334155' }}>
                        {op.createdBy?.displayName}
                      </Typography>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {/* Модальное окно оформления складской операции */}
      <FormDialog
        open={isCreateModalOpen}
        onClose={() => !isSubmitting && setIsCreateModalOpen(false)}
        title="Оформление складской операции"
        maxWidth="md"
        loading={isSubmitting}
        submitLabel={isSubmitting ? 'Проведение...' : 'Провести операцию'}
        onSubmit={handleSubmit}
        submitDisabled={isSubmitting || availableSourceWarehouses.length === 0}
      >
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {/* Селектор типа операции */}
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1, display: 'block' }}>
              Выберите тип операции:
            </Typography>
            <ToggleButtonGroup
              value={opMode}
              exclusive
              onChange={(_, newMode) => {
                if (newMode) setOpMode(newMode);
              }}
              fullWidth
              size="small"
              sx={{ bgcolor: '#f8fafc' }}
            >
              <ToggleButton value="RECEIPT" sx={{ fontWeight: 600, py: 1, gap: 1 }}>
                <MoveToInboxIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                Приход на склад
              </ToggleButton>
              <ToggleButton value="ISSUE_EMPLOYEE" sx={{ fontWeight: 600, py: 1, gap: 1 }}>
                <PersonIcon sx={{ fontSize: 18, color: '#1d4ed8' }} />
                Выдача сотруднику
              </ToggleButton>
              <ToggleButton value="ISSUE_WRITE_OFF" sx={{ fontWeight: 600, py: 1, gap: 1 }}>
                <DeleteSweepIcon sx={{ fontSize: 18, color: '#d97706' }} />
                Списание ТМЦ
              </ToggleButton>
              <ToggleButton value="TRANSFER" sx={{ fontWeight: 600, py: 1, gap: 1 }}>
                <SwapHorizIcon sx={{ fontSize: 18, color: '#7c3aed' }} />
                Перемещение
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Предупреждение об отсутствии ответственного склада */}
          {availableSourceWarehouses.length === 0 && (
            <Alert severity="warning" icon={<WarningAmberIcon />}>
              Вы не назначены материально ответственным лицом ни за один склад. Проведение операций ограничено. Обратитесь к администратору для назначения ответственного.
            </Alert>
          )}

          {/* Склад и основные реквизиты */}
          <Grid container spacing={2}>
            {/* Склад-источник / склад прихода (только склад ответственного лица) */}
            <Grid item xs={12} sm={opMode === 'TRANSFER' ? 6 : 12}>
              <TextField
                select
                fullWidth
                required
                label={
                  opMode === 'RECEIPT'
                    ? 'Склад поступления (за который вы ответственны)'
                    : opMode === 'TRANSFER'
                    ? 'Склад-отправитель (за который вы ответственны)'
                    : 'Склад отпуска (за который вы ответственны)'
                }
                value={opWarehouseId}
                onChange={(e) => setOpWarehouseId(e.target.value)}
                disabled={availableSourceWarehouses.length <= 1}
                helperText={
                  availableSourceWarehouses.length === 0
                    ? 'Нет доступных складов с вашей материальной ответственностью'
                    : !isAdmin
                    ? 'Отображаются только склады, где вы назначены материально ответственным'
                    : 'Режим администратора: доступны все склады'
                }
              >
                {availableSourceWarehouses.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span>{w.name} ({w.code})</span>
                      <Chip label="Мой склад" size="small" color="primary" sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 700 }} />
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Склад-получатель для перемещения (выбираемый из списка всех складов) */}
            {opMode === 'TRANSFER' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Склад-получатель (из списка складов)"
                  value={opTargetWarehouseId}
                  onChange={(e) => setOpTargetWarehouseId(e.target.value)}
                >
                  {availableTargetWarehouses.map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            {/* Выдача сотруднику — Обязательный выбор сотрудника */}
            {opMode === 'ISSUE_EMPLOYEE' && (
              <Grid item xs={12}>
                <Autocomplete
                  options={usersList}
                  getOptionLabel={(u) => `${u.displayName} (${u.ldapLogin})${u.email ? ` — ${u.email}` : ''}`}
                  value={selectedEmployee}
                  onChange={(_, newVal) => setSelectedEmployee(newVal)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      required
                      label="Сотрудник-получатель (в подотчет)"
                      placeholder="Начните вводить ФИО или логин сотрудника..."
                      helperText="Выдача ТМЦ оформляется строго на материально ответственного сотрудника"
                    />
                  )}
                />
              </Grid>
            )}

            {/* Списание ТМЦ — Выбор направления (На оборудование или На неликвид/брак/иное) */}
            {opMode === 'ISSUE_WRITE_OFF' && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                    Направление списания ТМЦ:
                  </Typography>
                  <RadioGroup
                    row
                    value={writeOffType}
                    onChange={(e) => setWriteOffType(e.target.value as 'EQUIPMENT' | 'REASON')}
                  >
                    <FormControlLabel
                      value="EQUIPMENT"
                      control={<Radio size="small" />}
                      label="На единицу оборудования (установка узлов/запчастей)"
                    />
                    <FormControlLabel
                      value="REASON"
                      control={<Radio size="small" />}
                      label="На неликвид, брак или утилизацию"
                    />
                  </RadioGroup>

                  {writeOffType === 'EQUIPMENT' ? (
                    <Box sx={{ mt: 1.5 }}>
                      <Autocomplete
                        options={equipmentList}
                        getOptionLabel={(eq) => `${eq.name} (${eq.inventoryNumber || 'б/н'})`}
                        value={selectedEquipment}
                        onChange={(_, newVal) => setSelectedEquipment(newVal)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            required
                            size="small"
                            label="Оборудование для списания ТМЦ"
                            placeholder="Выберите станок или установку..."
                          />
                        )}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ mt: 1.5 }}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        required
                        label="Вид и основание списания"
                        value={selectedWriteOffReason}
                        onChange={(e) => setSelectedWriteOffReason(e.target.value)}
                      >
                        {WRITE_OFF_REASONS.map((r) => (
                          <MenuItem key={r.value} value={r.value}>
                            {r.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  )}
                </Paper>
              </Grid>
            )}

            {/* Поставщик для прихода */}
            {opMode === 'RECEIPT' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Контрагент / Поставщик (необязательно)"
                  placeholder="ООО СнабКомплект..."
                  value={opCounterparty}
                  onChange={(e) => setOpCounterparty(e.target.value)}
                />
              </Grid>
            )}
          </Grid>

          <Divider />

          {/* Строки спецификации ТМЦ (Расширенная спецификация для Прихода) */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  Спецификация позиций ТМЦ
                </Typography>
                {opMode === 'RECEIPT' && calculatedReceiptSum > 0 && (
                  <Typography variant="caption" color="primary.main" fontWeight={600}>
                    Предварительная сумма прихода: {calculatedReceiptSum.toLocaleString('ru-RU')} ₽
                  </Typography>
                )}
              </Box>
              <Button size="small" startIcon={<AddIcon />} onClick={handleAddRow}>
                Добавить позицию
              </Button>
            </Box>

            <Stack spacing={2}>
              {formRows.map((row, idx) => {
                const currentStock = row.nomenclature ? warehouseStockMap[row.nomenclature.id] ?? 0 : null;
                const isExceeded = opMode !== 'RECEIPT' && currentStock !== null && Number(row.quantity) > currentStock;

                return (
                  <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff' }}>
                    {/* Главный ряд: Номенклатура + Количество + Действия */}
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={opMode === 'RECEIPT' ? 6.5 : opMode === 'ISSUE_WRITE_OFF' && writeOffType === 'EQUIPMENT' ? 7 : 8}>
                        <Autocomplete
                          options={nomenclatures}
                          getOptionLabel={(opt) => `${opt.name}${opt.article ? ` (${opt.article})` : ''}`}
                          value={row.nomenclature}
                          onChange={(_, newVal) => handleRowChange(idx, 'nomenclature', newVal)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              size="small"
                              required
                              label={`Позиция #${idx + 1}`}
                              placeholder="Выберите номенклатуру..."
                            />
                          )}
                        />
                        {row.nomenclature && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                            <Typography variant="caption" color="text.secondary">
                              Ед. изм.: <b>{row.nomenclature.unit}</b>
                            </Typography>
                            {row.nomenclature.category && (
                              <Chip
                                label={row.nomenclature.category.name}
                                size="small"
                                sx={{ height: 18, fontSize: '0.625rem', bgcolor: '#f1f5f9' }}
                              />
                            )}
                            {opMode !== 'RECEIPT' && (
                              <StatusBadge
                                status={isExceeded ? 'DEFICIT' : 'IN_STOCK'}
                                label={`На складе: ${currentStock} ${row.nomenclature.unit}`}
                                size="small"
                                variant="subtle"
                              />
                            )}
                          </Box>
                        )}
                      </Grid>

                      <Grid item xs={12} sm={opMode === 'RECEIPT' ? 2.5 : 3}>
                        <TextField
                          size="small"
                          type="number"
                          required
                          fullWidth
                          label="Количество"
                          value={row.quantity}
                          onChange={(e) => handleRowChange(idx, 'quantity', e.target.value)}
                          error={isExceeded}
                          helperText={isExceeded ? 'Превышает остаток' : undefined}
                          inputProps={{ min: 0.001, step: 1 }}
                        />
                      </Grid>

                      {opMode === 'RECEIPT' && (
                        <Grid item xs={12} sm={2}>
                          <Button
                            size="small"
                            variant={row.showExtended ? 'contained' : 'outlined'}
                            color="inherit"
                            fullWidth
                            startIcon={<TuneIcon sx={{ fontSize: 16 }} />}
                            onClick={() => handleRowChange(idx, 'showExtended', !row.showExtended)}
                            sx={{
                              height: 38,
                              fontSize: '0.75rem',
                              borderColor: '#cbd5e1',
                              bgcolor: row.showExtended ? '#f1f5f9' : 'transparent',
                            }}
                          >
                            Детали
                          </Button>
                        </Grid>
                      )}

                      <Grid item xs={12} sm={1} sx={{ textAlign: 'right' }}>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={formRows.length === 1}
                          onClick={() => handleRemoveRow(idx)}
                          aria-label={`Удалить позицию #${idx + 1}`}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Grid>
                    </Grid>

                    {/* Расширенная спецификация для Прихода ТМЦ (Адресное хранение, Оборудование, Цена, Партия) */}
                    {opMode === 'RECEIPT' && (
                      <Collapse in={row.showExtended ?? true} timeout="auto">
                        <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed #e2e8f0' }}>
                          <Grid container spacing={1.5}>
                            {/* Ячейка адресного хранения */}
                            <Grid item xs={12} sm={4}>
                              <TextField
                                select
                                size="small"
                                fullWidth
                                label="Ячейка / Место хранения"
                                value={row.cellId || ''}
                                onChange={(e) => handleRowChange(idx, 'cellId', e.target.value)}
                                helperText={warehouseCells.length === 0 ? 'На складе нет созданных ячеек' : 'Адресное хранение'}
                              >
                                <MenuItem value="">
                                  <em>— Не указывать ячейку —</em>
                                </MenuItem>
                                {warehouseCells.map((c) => (
                                  <MenuItem key={c.id} value={c.id}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <PlaceIcon sx={{ fontSize: 14, color: '#64748b' }} />
                                      <span>{c.label}</span>
                                    </Box>
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>

                            {/* Привязка к оборудованию EPS (совместимость) */}
                            <Grid item xs={12} sm={4}>
                              <Autocomplete
                                options={equipmentList}
                                getOptionLabel={(eq) => `${eq.name} (${eq.inventoryNumber || 'б/н'})`}
                                value={row.equipment}
                                onChange={(_, newVal) => handleRowChange(idx, 'equipment', newVal)}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    size="small"
                                    label="Совместимое оборудование (EPS)"
                                    placeholder="Связать с узлом..."
                                  />
                                )}
                              />
                            </Grid>

                            {/* Цена за единицу */}
                            <Grid item xs={12} sm={2}>
                              <TextField
                                size="small"
                                fullWidth
                                type="number"
                                label="Цена за ед."
                                placeholder="0.00"
                                value={row.price || ''}
                                onChange={(e) => handleRowChange(idx, 'price', e.target.value)}
                                InputProps={{
                                  endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                                }}
                                inputProps={{ min: 0, step: 0.01 }}
                              />
                            </Grid>

                            {/* Номер партии / Заводской номер */}
                            <Grid item xs={12} sm={2}>
                              <TextField
                                size="small"
                                fullWidth
                                label="Номер партии / Серия"
                                placeholder="Партия # / Сер. №"
                                value={row.batchNumber || ''}
                                onChange={(e) => handleRowChange(idx, 'batchNumber', e.target.value)}
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      </Collapse>
                    )}
                  </Paper>
                );
              })}
            </Stack>

            <Button
              size="small"
              variant="text"
              sx={{ mt: 1.5 }}
              onClick={() => {
                setQuickNomRowIndex(formRows.length - 1);
                setIsQuickNomOpen(true);
              }}
            >
              + Создать новую номенклатуру, если её нет в справочнике
            </Button>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Комментарий к операции (необязательно)"
            placeholder="Примечание, обоснование или особенности..."
            value={opComment}
            onChange={(e) => setOpComment(e.target.value)}
          />
        </Stack>
      </FormDialog>

      {/* Быстрое создание номенклатуры */}
      <CreateNomenclatureDialog
        open={isQuickNomOpen}
        onClose={() => setIsQuickNomOpen(false)}
        onCreated={handleNomenclatureCreated}
      />
    </Box>
  );
}

export default function WmsOperationsPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка журнала складских операций..." />}>
      <WmsOperationsContent />
    </Suspense>
  );
}

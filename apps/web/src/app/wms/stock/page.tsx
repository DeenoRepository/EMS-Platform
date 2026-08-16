'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
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
  Skeleton,
  Stack,
  InputAdornment,
} from '@mui/material';
import { useSearchParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS } from '@ems/shared';

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
  const [newNomName, setNewNomName] = useState('');
  const [newNomArticle, setNewNomArticle] = useState('');
  const [newNomUnit, setNewNomUnit] = useState('шт');
  const [newNomCategory, setNewNomCategory] = useState('');
  const [newNomMinStock, setNewNomMinStock] = useState('');
  const [newNomDescription, setNewNomDescription] = useState('');
  const [isSubmittingNom, setIsSubmittingNom] = useState(false);

  // Modal: Assign Storage Location (Cell)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locStockItem, setLocStockItem] = useState<StockRow | null>(null);
  const [warehouseZonesForLoc, setWarehouseZonesForLoc] = useState<ZoneOption[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string>('');
  const [isSavingLoc, setIsSavingLoc] = useState(false);

  // Load dictionaries
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
        console.error('Ошибка загрузки справочников:', err);
      }
    }
    loadDictionaries();
  }, []);

  // When warehouse changes, fetch its zones for filtering
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
          if (json.success) {
            setZones(json.data);
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки зон:', err);
      }
    }
    loadZones();
  }, [selectedWarehouse]);

  const fetchStock = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedWarehouse) params.set('warehouseId', selectedWarehouse);
      if (selectedZone) params.set('zoneId', selectedZone);
      if (selectedCategory) params.set('categoryId', selectedCategory);
      if (search) params.set('search', search);
      if (lowStockOnly) params.set('lowStockOnly', 'true');
      params.set('page', String(page + 1));
      params.set('pageSize', String(rowsPerPage));

      const res = await fetch(`/api/wms/stock?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setItems(json.data.items);
          setTotalCount(json.data.total);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки остатков:', err);
      enqueueSnackbar('Ошибка загрузки складских остатков', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedWarehouse, selectedZone, selectedCategory, search, lowStockOnly, page, rowsPerPage, enqueueSnackbar]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const handleCreateNomenclature = async () => {
    if (!newNomName.trim()) {
      enqueueSnackbar('Укажите наименование ТМЦ', { variant: 'warning' });
      return;
    }

    setIsSubmittingNom(true);
    try {
      const res = await fetch('/api/wms/nomenclature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newNomName,
          article: newNomArticle || undefined,
          unit: newNomUnit,
          categoryId: newNomCategory || undefined,
          minStock: newNomMinStock ? Number(newNomMinStock) : undefined,
          description: newNomDescription || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Номенклатура успешно создана', { variant: 'success' });
        setIsNomenclatureModalOpen(false);
        setNewNomName('');
        setNewNomArticle('');
        setNewNomMinStock('');
        setNewNomDescription('');
        fetchStock();
      } else {
        enqueueSnackbar(json.error || 'Ошибка создания номенклатуры', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('Ошибка сети при создании номенклатуры', { variant: 'error' });
    } finally {
      setIsSubmittingNom(false);
    }
  };

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
    } catch (err) {
      enqueueSnackbar('Ошибка сети при обновлении места хранения', { variant: 'error' });
    } finally {
      setIsSavingLoc(false);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
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
              >
                Новая номенклатура
              </Button>
            )}
          </Stack>
        }
      />

      {/* Фильтры */}
      <Card sx={{ mb: 3, p: 2.5, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Поиск по названию или артикулу..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              select
              fullWidth
              size="small"
              label="Склад"
              value={selectedWarehouse}
              onChange={(e) => {
                setSelectedWarehouse(e.target.value);
                setSelectedZone('');
                setPage(0);
              }}
            >
              <MenuItem value="">Все склады</MenuItem>
              {warehouses.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {selectedWarehouse && zones.length > 0 && (
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Зона склада"
                value={selectedZone}
                onChange={(e) => {
                  setSelectedZone(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">Все зоны</MenuItem>
                {zones.map((z) => (
                  <MenuItem key={z.id} value={z.id}>
                    {z.name} ({z.code})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}

          <Grid item xs={12} sm={6} md={selectedWarehouse && zones.length > 0 ? 2.5 : 3.5}>
            <TextField
              select
              fullWidth
              size="small"
              label="Категория"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">Все категории</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={selectedWarehouse && zones.length > 0 ? 2 : 3}>
            <FormControlLabel
              control={
                <Switch
                  checked={lowStockOnly}
                  color="warning"
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
            />
          </Grid>
        </Grid>
      </Card>

      {/* Таблица остатков */}
      <Card sx={{ borderRadius: 2 }}>
        <TableContainer>
          <Table size="small" aria-label="Реестр остатков складов и ТМЦ">
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Склад</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Место хранения (Ячейка)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Артикул</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Номенклатура (ТМЦ)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Категория</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Остаток на складе
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  Мин. остаток
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  Статус
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Совместимое оборудование</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                    <TableCell><Skeleton variant="rounded" width={110} height={22} /></TableCell>
                    <TableCell><Skeleton variant="text" width={90} /></TableCell>
                    <TableCell><Skeleton variant="text" width={220} /></TableCell>
                    <TableCell><Skeleton variant="text" width={110} /></TableCell>
                    <TableCell align="right"><Skeleton variant="text" width={60} sx={{ ml: 'auto' }} /></TableCell>
                    <TableCell align="center"><Skeleton variant="text" width={40} sx={{ mx: 'auto' }} /></TableCell>
                    <TableCell align="center"><Skeleton variant="rounded" width={70} height={20} sx={{ mx: 'auto' }} /></TableCell>
                    <TableCell><Skeleton variant="rounded" width={140} height={20} /></TableCell>
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    Позиции не найдены
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{
                      bgcolor: row.isLowStock ? 'rgba(237, 108, 2, 0.04)' : undefined,
                    }}
                  >
                    <TableCell>
                      <Chip label={row.warehouseCode} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                        {row.warehouseName}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {row.cellCode ? (
                        <Tooltip title="Нажмите, чтобы изменить ячейку хранения">
                          <Chip
                            icon={<PlaceOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                            label={`${row.zoneCode || row.zoneName} • ${row.cellCode}`}
                            size="small"
                            color="info"
                            variant="outlined"
                            clickable={hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE)}
                            onClick={() => hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE) && handleOpenLocationModal(row)}
                            sx={{ fontWeight: 600 }}
                          />
                        </Tooltip>
                      ) : (
                        hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE) ? (
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<PlaceOutlinedIcon sx={{ fontSize: 14 }} />}
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

                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.article}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                    <TableCell>{row.category}</TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color={row.isLowStock ? 'warning.dark' : 'text.primary'}
                      >
                        {row.quantity} {row.unit}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {row.minStock} {row.minStock !== '—' ? row.unit : ''}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {row.isLowStock ? (
                        <Chip
                          icon={<WarningAmberIcon />}
                          label="Дефицит"
                          size="small"
                          color="warning"
                          sx={{ fontWeight: 700 }}
                        />
                      ) : (
                        <Chip
                          icon={<CheckCircleOutlineIcon />}
                          label="В норме"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {row.compatibleEquipment && row.compatibleEquipment.length > 0 ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                          {row.compatibleEquipment.slice(0, 3).map((eq) => (
                            <Tooltip key={eq.id} title={`Инв. № ${eq.inventoryNumber}`}>
                              <Chip
                                icon={<PrecisionManufacturingIcon sx={{ fontSize: '14px !important' }} />}
                                label={eq.name}
                                size="small"
                                clickable
                                onClick={() => router.push(`/eps/${eq.id}`)}
                                sx={{ fontSize: '0.75rem' }}
                              />
                            </Tooltip>
                          ))}
                          {row.compatibleEquipment.length > 3 && (
                            <Chip
                              label={`+${row.compatibleEquipment.length - 3}`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
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
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Строк на странице:"
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Card>

      {/* Диалог назначения места хранения (ячейки) */}
      <Dialog
        open={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlaceOutlinedIcon color="primary" />
          Место хранения ТМЦ
        </DialogTitle>
        <DialogContent dividers>
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
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsLocationModalOpen(false)} disabled={isSavingLoc}>
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveLocation}
            disabled={isSavingLoc || warehouseZonesForLoc.length === 0}
          >
            {isSavingLoc ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог создания новой номенклатуры */}
      <Dialog
        open={isNomenclatureModalOpen}
        onClose={() => setIsNomenclatureModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Создание позиции номенклатуры (ТМЦ)</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              required
              label="Наименование номенклатуры"
              placeholder="например, Подшипник радиальный шариковый 6204 2RS"
              value={newNomName}
              onChange={(e) => setNewNomName(e.target.value)}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Артикул / Заводской код"
                  placeholder="BRG-6204-2RS"
                  value={newNomArticle}
                  onChange={(e) => setNewNomArticle(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Единица измерения"
                  value={newNomUnit}
                  onChange={(e) => setNewNomUnit(e.target.value)}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Категория"
                  value={newNomCategory}
                  onChange={(e) => setNewNomCategory(e.target.value)}
                >
                  <MenuItem value="">Без категории</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Минимальный остаток"
                  placeholder="для контроля дефицита"
                  value={newNomMinStock}
                  onChange={(e) => setNewNomMinStock(e.target.value)}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Описание / Применение"
              placeholder="Дополнительные характеристики, применимость к узлам..."
              value={newNomDescription}
              onChange={(e) => setNewNomDescription(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsNomenclatureModalOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleCreateNomenclature}
            disabled={isSubmittingNom}
          >
            {isSubmittingNom ? 'Сохранение...' : 'Создать номенклатуру'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function WmsStockPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <CircularProgress />
        </Box>
      }
    >
      <WmsStockContent />
    </Suspense>
  );
}

'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Card,
  Grid,
  Typography,
  TextField,
  MenuItem,
  Button,
  Chip,
  Pagination,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Autocomplete,
  Paper,
  Divider,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FolderZipOutlinedIcon from '@mui/icons-material/FolderZipOutlined';
import SchemaOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PageHeader from '@/components/layout/PageHeader';
import { useRouter, useSearchParams } from 'next/navigation';
import { DOCUMENT_TYPE_MAP, formatDate, formatBytes, PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';

import {
  StatCard,
  SearchInput,
  FilterToolbar,
  EmptyState,
  DataTableWrapper,
  ConfirmDialog,
  PageLoading,
  FormDialog,
  StatusBadge,
  type TableColumnOption,
  FileUploadDropzone,
} from '@/components/ui';

interface DocumentItem {
  id: string;
  equipmentId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  docType: string;
  version: number;
  description: string | null;
  createdAt: string;
  equipment: {
    id: string;
    name: string;
    inventoryNumber: string | null;
    manufacturer: string | null;
    model: string | null;
    location: string | null;
    status: string;
  };
  uploadedBy: {
    id: string;
    displayName: string;
    ldapLogin: string;
  };
}

interface EquipmentOption {
  id: string;
  name: string;
  inventoryNumber: string | null;
}

function DocumentsListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [items, setItems] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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
        case 'name':
          aVal = a.originalName || a.fileName || '';
          bVal = b.originalName || b.fileName || '';
          break;
        case 'equipment':
          aVal = a.equipment?.name || a.equipment?.inventoryNumber || '';
          bVal = b.equipment?.name || b.equipment?.inventoryNumber || '';
          break;
        case 'docType':
          aVal = a.docType || '';
          bVal = b.docType || '';
          break;
        case 'description':
          aVal = a.description || '';
          bVal = b.description || '';
          break;
        case 'size':
          aVal = Number(a.fileSize || 0);
          bVal = Number(b.fileSize || 0);
          break;
        case 'uploadedBy':
          aVal = a.uploadedBy?.displayName || a.uploadedBy?.ldapLogin || '';
          bVal = b.uploadedBy?.displayName || b.uploadedBy?.ldapLogin || '';
          break;
        case 'date':
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
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
  }, [items, sortField, sortDirection]);

  // Filters
  const [search, setSearch] = useState(searchParams?.get('search') || '');
  const [docTypeFilter, setDocTypeFilter] = useState(searchParams?.get('docType') || '');
  const [equipmentFilter, setEquipmentFilter] = useState(searchParams?.get('equipmentId') || '');

  // Equipment options for filter & upload
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);

  // Statistics
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalSizeBytes: 0,
    byTypeCounts: {} as Record<string, number>,
  });

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedEquipmentForUpload, setSelectedEquipmentForUpload] = useState<EquipmentOption | null>(null);
  const [uploadDocType, setUploadDocType] = useState('SCHEMA');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Confirm Delete Dialog State
  const [deleteDialogDoc, setDeleteDialogDoc] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load equipment list for picker
  useEffect(() => {
    async function loadEquipment() {
      try {
        const res = await fetch('/api/eps/equipment?pageSize=100');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.items) {
            setEquipmentList(
              json.data.items.map((eq: any) => ({
                id: eq.id,
                name: eq.name,
                inventoryNumber: eq.inventoryNumber,
              }))
            );
          }
        }
      } catch {
        // ignore
      }
    }
    loadEquipment();
  }, []);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.append('search', search);
      if (docTypeFilter) params.append('docType', docTypeFilter);
      if (equipmentFilter) params.append('equipmentId', equipmentFilter);

      const res = await fetch(`/api/eps/documents?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setItems(json.data.items || []);
          setTotal(json.data.total || 0);
          if (json.data.stats) {
            setStats(json.data.stats);
          }
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки электронного архива документов', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, docTypeFilter, equipmentFilter, enqueueSnackbar]);

  const canAccessDocs =
    user?.roles?.includes('admin') ||
    hasPermission(PERMISSIONS.EPS_DOCUMENTS_VIEW) ||
    hasPermission(PERMISSIONS.EPS_DOCUMENTS_UPLOAD);

  useEffect(() => {
    if (canAccessDocs) {
      fetchDocuments();
    }
  }, [canAccessDocs, fetchDocuments]);

  const handleKpiFilter = (docType: string) => {
    if (docTypeFilter === docType) {
      setDocTypeFilter('');
    } else {
      setDocTypeFilter(docType);
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setDocTypeFilter('');
    setEquipmentFilter('');
    setPage(1);
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialogDoc) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/eps/documents/${deleteDialogDoc.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        enqueueSnackbar(`Документ «${deleteDialogDoc.name}» успешно удален`, { variant: 'info' });
        setDeleteDialogDoc(null);
        fetchDocuments();
      } else {
        enqueueSnackbar(json.error || 'Ошибка удаления', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при удалении', { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      enqueueSnackbar('Выберите файл для загрузки', { variant: 'warning' });
      return;
    }
    if (!selectedEquipmentForUpload) {
      enqueueSnackbar('Выберите оборудование, к которому относится документ', { variant: 'warning' });
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('equipmentId', selectedEquipmentForUpload.id);
      fd.append('docType', uploadDocType);
      fd.append('description', uploadDescription);

      const res = await fetch('/api/eps/documents', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        enqueueSnackbar('Документ успешно загружен и прикреплен', { variant: 'success' });
        setUploadModalOpen(false);
        setSelectedFile(null);
        setSelectedEquipmentForUpload(null);
        setUploadDescription('');
        setUploadDocType('SCHEMA');
        fetchDocuments();
      } else {
        enqueueSnackbar(json.error || 'Ошибка загрузки документа', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при загрузке документа', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    (docTypeFilter ? 1 : 0) +
    (equipmentFilter ? 1 : 0);

  const canUpload = hasPermission(PERMISSIONS.EPS_DOCUMENTS_UPLOAD);
  const canEdit = hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT);
  interface DocumentColumnDef {
    id: string;
    label: string;
    defaultVisible: boolean;
  }

  const DOCUMENT_COLUMNS: DocumentColumnDef[] = [
    { id: 'name', label: 'Наименование файла', defaultVisible: true },
    { id: 'equipment', label: 'Технологическая единица оборудования', defaultVisible: true },
    { id: 'docType', label: 'Вид документа (ЕСКД / ТР ТС)', defaultVisible: true },
    { id: 'description', label: 'Аннотация / Описание документа', defaultVisible: true },
    { id: 'size', label: 'Объем файла', defaultVisible: true },
    { id: 'uploadedBy', label: 'Автор загрузки (ФИО)', defaultVisible: true },
    { id: 'date', label: 'Дата регистрации', defaultVisible: true },
    { id: 'actions', label: 'Операции', defaultVisible: true },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    DOCUMENT_COLUMNS.map((c) => c.id)
  );

  if (!canAccessDocs) {
    return (
      <Box sx={{ pb: 4 }}>
        <PageHeader
          title="Электронный архив технической документации"
          subtitle="Конструкторская и эксплуатационная документация (ЕСКД): паспорта, чертежи, схемы, руководства по эксплуатации (РЭ) и акты"
          breadcrumbs={[
            { label: 'Главная', href: '/' },
            { label: 'Реестр оборудования', href: '/eps' },
            { label: 'Электронный архив документации' },
          ]}
        />
        <EmptyState
          title="Доступ ограничен"
          description="У вашей учетной записи нет полномочий для доступа к технической документации (требуется право eps.documents.view или eps.documents.upload)."
          icon={<DescriptionOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Электронный архив технической документации"
        subtitle="Конструкторская и эксплуатационная документация (ЕСКД): паспорта, чертежи, схемы, руководства по эксплуатации (РЭ) и акты"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Реестр оборудования', href: '/eps' },
          { label: 'Электронный архив документации' },
        ]}
        actions={
          canUpload && (
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={() => setUploadModalOpen(true)}
              sx={{
                height: 38,
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
                px: 2.25,
                boxSizing: 'border-box',
                backgroundColor: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              }}
            >
              Загрузить документ
            </Button>
          )
        }
      />

      {/* KPI Metric Cards */}
      <Grid container spacing={1.75} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Всего документов"
            value={stats.totalDocuments}
            subtitle="Файлов в архиве"
            icon={<DescriptionOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
            active={docTypeFilter === ''}
            onClick={() => handleKpiFilter('')}
            loading={loading && stats.totalDocuments === 0}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Общий объём"
            value={formatBytes(stats.totalSizeBytes)}
            subtitle="Занято на сервере"
            icon={<FolderZipOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(100, 116, 139, 0.08)"
            iconColor="#64748b"
            accentColor="#64748b"
            loading={loading && stats.totalDocuments === 0}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Схемы и чертежи"
            value={stats.byTypeCounts.SCHEMA || 0}
            subtitle="Принципиальные схемы"
            icon={<SchemaOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
            active={docTypeFilter === 'SCHEMA'}
            onClick={() => handleKpiFilter('SCHEMA')}
            loading={loading && stats.totalDocuments === 0}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Инструкции"
            value={stats.byTypeCounts.MANUAL || 0}
            subtitle="Руководства и регламенты"
            icon={<MenuBookOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="#16a34a"
            accentColor="#16a34a"
            active={docTypeFilter === 'MANUAL'}
            onClick={() => handleKpiFilter('MANUAL')}
            loading={loading && stats.totalDocuments === 0}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Сертификаты и акты"
            value={(stats.byTypeCounts.CERTIFICATE || 0) + (stats.byTypeCounts.ACT || 0)}
            subtitle="Юридические документы"
            icon={<VerifiedOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(139, 92, 246, 0.08)"
            iconColor="#8b5cf6"
            accentColor="#8b5cf6"
            active={docTypeFilter === 'CERTIFICATE'}
            onClick={() => handleKpiFilter('CERTIFICATE')}
            loading={loading && stats.totalDocuments === 0}
          />
        </Grid>
      </Grid>

      {/* Main Table */}
      <DataTableWrapper
        loading={loading}
        page={page - 1}
        pageSize={pageSize}
        total={total}
        onPageChange={(_, newPage) => setPage(newPage + 1)}
        onPageSizeChange={(e) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(1);
        }}
        storageKey="eps_documents_table"
        columns={DOCUMENT_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        stickyHeader
        empty={items.length === 0 && !loading}
        emptyState={
          <EmptyState
            icon={<DescriptionOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
            title="Документы не найдены"
            description={
              activeFilterCount > 0
                ? 'По заданным параметрам документы не найдены. Попробуйте сбросить фильтры.'
                : 'В электронном архиве пока нет загруженных документов.'
            }
            actionText={activeFilterCount > 0 ? 'Сбросить фильтры' : (canUpload ? 'Загрузить документ' : undefined)}
            onAction={activeFilterCount > 0 ? handleResetFilters : (canUpload ? () => setUploadModalOpen(true) : undefined)}
          />
        }
        toolbar={
          <FilterToolbar
            variant="embedded"
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
            actions={
              <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  select
                  size="small"
                  value={docTypeFilter}
                  onChange={(e) => {
                    setDocTypeFilter(e.target.value);
                    setPage(1);
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
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все типы</MenuItem>
                  {Object.entries(DOCUMENT_TYPE_MAP).map(([key, label]) => (
                    <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  value={equipmentFilter}
                  onChange={(e) => {
                    setEquipmentFilter(e.target.value);
                    setPage(1);
                  }}
                  SelectProps={{
                    displayEmpty: true,
                  }}
                  sx={{
                    minWidth: 200,
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
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все оборудование</MenuItem>
                  {equipmentList.map((eq) => (
                    <MenuItem key={eq.id} value={eq.id} sx={{ fontSize: '0.8125rem' }}>
                      {eq.inventoryNumber ? `[${eq.inventoryNumber}] ` : ''}{eq.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            }
          >
            <Box sx={{ minWidth: { xs: '100%', sm: 260, md: 320 }, flexGrow: 1 }}>
              <SearchInput
                value={search}
                placeholder="Поиск по названию файла, описанию, инв. №..."
                onSearch={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
              />
            </Box>
          </FilterToolbar>
        }
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.paper' }}>
              {visibleColumns.includes('name') && (
                <TableCell sx={{ minWidth: 200 }}>
                  <TableSortLabel
                    active={sortField === 'name'}
                    direction={sortField === 'name' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    Имя файла
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('equipment') && (
                <TableCell sx={{ minWidth: 180 }}>
                  <TableSortLabel
                    active={sortField === 'equipment'}
                    direction={sortField === 'equipment' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('equipment')}
                  >
                    Оборудование
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('docType') && (
                <TableCell sx={{ minWidth: 160 }}>
                  <TableSortLabel
                    active={sortField === 'docType'}
                    direction={sortField === 'docType' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('docType')}
                  >
                    Тип документа
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('description') && (
                <TableCell sx={{ minWidth: 160 }}>
                  <TableSortLabel
                    active={sortField === 'description'}
                    direction={sortField === 'description' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('description')}
                  >
                    Описание
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('size') && (
                <TableCell sx={{ minWidth: 110 }}>
                  <TableSortLabel
                    active={sortField === 'size'}
                    direction={sortField === 'size' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('size')}
                  >
                    Размер
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('uploadedBy') && (
                <TableCell sx={{ minWidth: 140 }}>
                  <TableSortLabel
                    active={sortField === 'uploadedBy'}
                    direction={sortField === 'uploadedBy' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('uploadedBy')}
                  >
                    Загрузил
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('date') && (
                <TableCell sx={{ minWidth: 120 }}>
                  <TableSortLabel
                    active={sortField === 'date'}
                    direction={sortField === 'date' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('date')}
                  >
                    Дата
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('actions') && (
                <TableCell align="right" sx={{ minWidth: 100 }}>
                  Действия
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedItems.map((doc) => (
              <TableRow key={doc.id} hover>
                {visibleColumns.includes('name') && (
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionOutlinedIcon color="primary" sx={{ fontSize: 18 }} />
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.8125rem' }}>
                          {doc.originalName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Версия {doc.version}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                )}

                {visibleColumns.includes('equipment') && (
                  <TableCell>
                    {doc.equipment ? (
                      <Box
                        onClick={() => router.push(`/eps/${doc.equipment.id}`)}
                        sx={{
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 0.35,
                          '&:hover .equipment-name': { color: 'primary.main', textDecoration: 'underline' },
                        }}
                      >
                        <Typography
                          className="equipment-name"
                          variant="body2"
                          fontWeight={600}
                          sx={{ fontSize: '0.8125rem', color: 'text.primary', lineHeight: 1.35 }}
                        >
                          {doc.equipment.name}
                        </Typography>
                        <Paper
                          variant="outlined"
                          sx={{
                            px: 0.75,
                            py: 0.1,
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            bgcolor: 'background.default',
                            fontSize: '0.6875rem',
                            borderRadius: '4px',
                            color: 'text.secondary',
                            borderColor: 'grey.400',
                            lineHeight: 1.3,
                          }}
                        >
                          {doc.equipment.inventoryNumber || 'Б/Н'}
                        </Paper>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Общий документ
                      </Typography>
                    )}
                  </TableCell>
                )}

                {visibleColumns.includes('docType') && (
                  <TableCell>
                    <StatusBadge
                      status={doc.docType}
                      label={DOCUMENT_TYPE_MAP[doc.docType] || doc.docType}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                )}

                {visibleColumns.includes('description') && (
                  <TableCell sx={{ fontSize: '0.8125rem', color: doc.description ? 'inherit' : 'text.secondary' }}>
                    {doc.description || '—'}
                  </TableCell>
                )}

                {visibleColumns.includes('size') && (
                  <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                    {formatBytes(doc.fileSize)}
                  </TableCell>
                )}

                {visibleColumns.includes('uploadedBy') && (
                  <TableCell sx={{ fontSize: '0.8125rem' }}>
                    {doc.uploadedBy?.displayName || 'Система'}
                  </TableCell>
                )}

                {visibleColumns.includes('date') && (
                  <TableCell sx={{ fontSize: '0.8125rem' }}>
                    {formatDate(doc.createdAt)}
                  </TableCell>
                )}

                {visibleColumns.includes('actions') && (
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title="Скачать / Просмотреть">
                        <IconButton
                          size="small"
                          color="primary"
                          component="a"
                          href={`/api/files/${doc.filePath}`}
                          target="_blank"
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {canEdit && (
                        <Tooltip title="Удалить документ">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialogDoc({ id: doc.id, name: doc.originalName })}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteDialogDoc)}
        title="Удаление документа"
        message={`Вы действительно хотите удалить документ «${deleteDialogDoc?.name}» из архива? Это действие необратимо.`}
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteDialogDoc(null)}
      />

      {/* Upload Document Modal Dialog */}
      <FormDialog
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Загрузка документа в архив EPS"
        icon={<UploadFileIcon color="primary" />}
        maxWidth="sm"
        loading={uploading}
        submitLabel={uploading ? 'Загрузка...' : 'Загрузить в архив'}
        onSubmit={handleUploadSubmit}
        submitDisabled={!selectedFile || !selectedEquipmentForUpload || uploading}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {/* Equipment Picker */}
          <Autocomplete
            options={equipmentList}
            getOptionLabel={(option) => `${option.inventoryNumber ? `[${option.inventoryNumber}] ` : ''}${option.name}`}
            value={selectedEquipmentForUpload}
            onChange={(_, val) => setSelectedEquipmentForUpload(val)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Оборудование"
                placeholder="Выберите единицу оборудования"
                size="small"
                fullWidth
                required
              />
            )}
          />

          {/* Document Type */}
          <TextField
            select
            size="small"
            label="Тип документа"
            value={uploadDocType}
            onChange={(e) => setUploadDocType(e.target.value)}
            fullWidth
            required
          >
            {Object.entries(DOCUMENT_TYPE_MAP).map(([k, label]) => (
              <MenuItem key={k} value={k}>
                {label}
              </MenuItem>
            ))}
          </TextField>

          {/* File Picker */}
          <FileUploadDropzone
            files={selectedFile ? [selectedFile] : []}
            onChange={(files) => setSelectedFile(files[0] || null)}
            compact
            title="Перетащите файл документа или выберите"
            description="PDF, Word, Excel, чертежи и схемы (до 15 МБ)"
          />

          {/* Description */}
          <TextField
            label="Описание / Примечание к документу"
            value={uploadDescription}
            onChange={(e) => setUploadDescription(e.target.value)}
            multiline
            rows={3}
            size="small"
            fullWidth
            placeholder="Укажите номер чертежа, редакцию, дату утверждения или краткое содержание..."
          />
        </Box>
      </FormDialog>
    </Box>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка архива документов оборудования..." />}>
      <DocumentsListContent />
    </Suspense>
  );
}

'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
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
  InputAdornment,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
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
  const { hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [items, setItems] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto' }}>
      <PageHeader
        title="EPS — Электронный архив документации"
        subtitle="Централизованный реестр схем, чертежей, инструкций по эксплуатации, паспортов и актов оборудования"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'Документы' },
        ]}
        actions={
          canUpload && (
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={() => setUploadModalOpen(true)}
              sx={{ px: 2.25, py: 0.75, fontWeight: 600 }}
            >
              Загрузить документ
            </Button>
          )
        }
      />

      {/* Top KPI StatCards Bar */}
      <Grid container spacing={1.75} sx={{ mb: 2.5 }}>
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

      {/* Filter and Search Bar */}
      <FilterToolbar
        activeFilterCount={activeFilterCount}
        onResetFilters={handleResetFilters}
      >
        <Box sx={{ minWidth: { xs: '100%', sm: 280 } }}>
          <SearchInput
            value={search}
            placeholder="Поиск по названию файла, описанию, инв. №..."
            onSearch={(val) => {
              setSearch(val);
              setPage(1);
            }}
          />
        </Box>

        <TextField
          select
          size="small"
          label="Тип документа"
          value={docTypeFilter}
          onChange={(e) => {
            setDocTypeFilter(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Все типы</MenuItem>
          {Object.entries(DOCUMENT_TYPE_MAP).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Оборудование"
          value={equipmentFilter}
          onChange={(e) => {
            setEquipmentFilter(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">Все единицы оборудования</MenuItem>
          {equipmentList.map((eq) => (
            <MenuItem key={eq.id} value={eq.id}>
              {eq.inventoryNumber ? `[${eq.inventoryNumber}] ` : ''}{eq.name}
            </MenuItem>
          ))}
        </TextField>
      </FilterToolbar>

      {/* Main Table */}
      {items.length === 0 && !loading ? (
        <EmptyState
          paper
          icon={<DescriptionOutlinedIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
          title="Документы не найдены"
          description={
            activeFilterCount > 0
              ? 'По заданным параметрам документы не найдены. Попробуйте сбросить фильтры.'
              : 'В электронном архиве пока нет загруженных документов.'
          }
          actionText={activeFilterCount > 0 ? 'Сбросить фильтры' : (canUpload ? 'Загрузить документ' : undefined)}
          onAction={activeFilterCount > 0 ? handleResetFilters : (canUpload ? () => setUploadModalOpen(true) : undefined)}
        />
      ) : (
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
          stickyHeader
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Имя файла</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Оборудование</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 170 }}>Тип документа</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Описание / Примечание</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 100 }}>Размер</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>Загрузил</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }}>Дата</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, width: 100 }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((doc) => (
                <TableRow key={doc.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionOutlinedIcon color="primary" sx={{ fontSize: 18 }} />
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                          {doc.originalName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Версия {doc.version}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Box
                      onClick={() => router.push(`/eps/${doc.equipment.id}`)}
                      sx={{
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                      }}
                    >
                      <Chip
                        label={doc.equipment.inventoryNumber || 'Б/Н'}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontFamily: 'monospace', height: 20, borderRadius: '4px' }}
                      />
                      <Typography variant="body2" fontWeight={500}>
                        {doc.equipment.name}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={DOCUMENT_TYPE_MAP[doc.docType] || doc.docType}
                      size="small"
                      variant="outlined"
                      color="primary"
                      sx={{ fontWeight: 600, borderRadius: '4px' }}
                    />
                  </TableCell>

                  <TableCell sx={{ fontSize: '0.8125rem', color: doc.description ? 'inherit' : 'text.secondary' }}>
                    {doc.description || '—'}
                  </TableCell>

                  <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                    {formatBytes(doc.fileSize)}
                  </TableCell>

                  <TableCell sx={{ fontSize: '0.8125rem' }}>
                    {doc.uploadedBy?.displayName || 'Система'}
                  </TableCell>

                  <TableCell sx={{ fontSize: '0.8125rem' }}>
                    {formatDate(doc.createdAt)}
                  </TableCell>

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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableWrapper>
      )}

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
      <Dialog open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Загрузка документа в архив EPS</DialogTitle>
        <DialogContent dividers>
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
                  label="Оборудование *"
                  placeholder="Выберите единицу оборудования"
                  size="small"
                  fullWidth
                />
              )}
            />

            {/* Document Type */}
            <TextField
              select
              size="small"
              label="Тип документа *"
              value={uploadDocType}
              onChange={(e) => setUploadDocType(e.target.value)}
              fullWidth
            >
              {Object.entries(DOCUMENT_TYPE_MAP).map(([k, label]) => (
                <MenuItem key={k} value={k}>
                  {label}
                </MenuItem>
              ))}
            </TextField>

            {/* File Picker */}
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<UploadFileIcon />}
              sx={{ py: 1.75, borderStyle: 'dashed' }}
            >
              {selectedFile ? selectedFile.name : 'Нажмите для выбора файла (PDF, DOCX, XLSX, Схемы)'}
              <input
                type="file"
                hidden
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </Button>

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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadModalOpen(false)} color="inherit">
            Отмена
          </Button>
          <Button
            onClick={handleUploadSubmit}
            variant="contained"
            disabled={!selectedFile || !selectedEquipmentForUpload || uploading}
          >
            {uploading ? <CircularProgress size={20} /> : 'Загрузить в архив'}
          </Button>
        </DialogActions>
      </Dialog>
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

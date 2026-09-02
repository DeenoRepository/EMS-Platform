'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FolderZipOutlinedIcon from '@mui/icons-material/FolderZipOutlined';
import SchemaOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import PageHeader from '@/components/layout/PageHeader';
import { useRouter, useSearchParams } from 'next/navigation';
import { DOCUMENT_TYPE_MAP, PERMISSIONS } from '@ems/shared';
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
  type TableColumnOption,
} from '@/components/ui';

import {
  DocumentUploadDialog,
  type EquipmentOption,
} from '@/components/eps/documents/DocumentUploadDialog';
import {
  DocumentArchiveTableView,
  type DocumentItem,
} from '@/components/eps/documents/DocumentArchiveTableView';

const DOCUMENT_COLUMNS: TableColumnOption[] = [
  { id: 'name', label: 'Имя файла', defaultVisible: true },
  { id: 'equipment', label: 'Оборудование', defaultVisible: true },
  { id: 'docType', label: 'Тип документа', defaultVisible: true },
  { id: 'description', label: 'Описание', defaultVisible: true },
  { id: 'size', label: 'Размер', defaultVisible: true },
  { id: 'uploadedBy', label: 'Загрузил', defaultVisible: true },
  { id: 'date', label: 'Дата добавления', defaultVisible: true },
  { id: 'actions', label: 'Действия', defaultVisible: true },
];

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
      let aVal: string | number = '';
      let bVal: string | number = '';
      switch (sortField) {
        case 'name':
          aVal = a.originalName.toLowerCase();
          bVal = b.originalName.toLowerCase();
          break;
        case 'equipment':
          aVal = (a.equipment?.name || '').toLowerCase();
          bVal = (b.equipment?.name || '').toLowerCase();
          break;
        case 'docType':
          aVal = a.docType;
          bVal = b.docType;
          break;
        case 'description':
          aVal = (a.description || '').toLowerCase();
          bVal = (b.description || '').toLowerCase();
          break;
        case 'size':
          aVal = a.fileSize;
          bVal = b.fileSize;
          break;
        case 'uploadedBy':
          aVal = (a.uploadedBy?.displayName || '').toLowerCase();
          bVal = (b.uploadedBy?.displayName || '').toLowerCase();
          break;
        case 'date':
        default:
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal, 'ru') : bVal.localeCompare(aVal, 'ru');
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [items, sortField, sortDirection]);

  // Filters
  const [search, setSearch] = useState(searchParams?.get('search') || '');
  const [docTypeFilter, setDocTypeFilter] = useState(searchParams?.get('docType') || '');
  const [equipmentFilter, setEquipmentFilter] = useState(searchParams?.get('equipmentId') || '');

  // Statistics
  const [stats, setStats] = useState({
    totalCount: 0,
    totalSize: 0,
    byType: {} as Record<string, number>,
  });

  // Upload Dialog State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState('SCHEMA');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentOption[]>([]);
  const [selectedEquipmentForUpload, setSelectedEquipmentForUpload] = useState<EquipmentOption | null>(null);

  // Delete State
  const [deleteDialogDoc, setDeleteDialogDoc] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'equipment',
    'docType',
    'description',
    'size',
    'uploadedBy',
    'date',
    'actions',
  ]);

  const loadEquipment = useCallback(async () => {
    try {
      const res = await fetch('/api/eps/equipment?limit=500');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const opts: EquipmentOption[] = (json.data?.items || []).map((eq: { id: string; name: string; inventoryNumber: string | null }) => ({
            id: eq.id,
            name: eq.name,
            inventoryNumber: eq.inventoryNumber,
          }));
          setEquipmentOptions(opts);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (search) params.set('search', search);
      if (docTypeFilter) params.set('docType', docTypeFilter);
      if (equipmentFilter) params.set('equipmentId', equipmentFilter);

      const res = await fetch(`/api/eps/documents?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const data = json.data || {};
          setItems(data.items || []);
          setTotal(data.total || 0);
          if (data.stats) {
            setStats({
              totalCount: data.stats.totalDocuments || 0,
              totalSize: data.stats.totalSizeBytes || 0,
              byType: data.stats.byTypeCounts || {},
            });
          }
        }
      } else {
        enqueueSnackbar('Ошибка загрузки документов', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при загрузке документов', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, docTypeFilter, equipmentFilter, enqueueSnackbar]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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

  const handleConfirmDelete = async () => {
    if (!deleteDialogDoc) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/eps/documents/${deleteDialogDoc.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        enqueueSnackbar('Документ удален из архива', { variant: 'success' });
        setDeleteDialogDoc(null);
        fetchDocuments();
      } else {
        enqueueSnackbar(json.error || 'Ошибка удаления документа', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при удалении', { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    (docTypeFilter ? 1 : 0) +
    (equipmentFilter ? 1 : 0);

  const canUpload = hasPermission(PERMISSIONS.EPS_DOCUMENTS_UPLOAD);
  const canEdit = hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT);

  return (
    <Box sx={{ width: '100%', pb: 3 }}>
      <PageHeader
        title="Электронный архив документации"
        subtitle="Централизованный реестр схем, паспортов заводов, сертификатов и руководств по эксплуатации"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'Архив документации' },
        ]}
        actions={
          canUpload && (
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={() => setUploadModalOpen(true)}
              sx={{
                height: 40,
                borderRadius: '8px',
                fontWeight: 600,
                px: 2.5,
                textTransform: 'none',
                boxShadow: 1,
              }}
            >
              Загрузить документ
            </Button>
          )
        }
      />

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Всего документов"
            value={stats.totalCount || total}
            subtitle="файлов в архиве"
            icon={<DescriptionOutlinedIcon />}
            iconColor="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Схемы и чертежи"
            value={stats.byType?.SCHEMA || 0}
            subtitle="схем и чертежей"
            icon={<SchemaOutlinedIcon />}
            iconColor="info.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Руководства и РЭ"
            value={stats.byType?.MANUAL || 0}
            subtitle="инструкций по эксплуатации"
            icon={<MenuBookOutlinedIcon />}
            iconColor="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Сертификаты и поверка"
            value={stats.byType?.CERTIFICATE || 0}
            subtitle="свидетельств и поверок"
            icon={<VerifiedOutlinedIcon />}
            iconColor="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Прочие документы"
            value={stats.byType?.OTHER || 0}
            subtitle="актов и протоколов"
            icon={<FolderZipOutlinedIcon />}
            iconColor="secondary.main"
          />
        </Grid>
      </Grid>

      {/* Table Section */}
      <DataTableWrapper
        title="Реестр технической документации"
        total={total}
        page={page - 1}
        pageSize={pageSize}
        onPageChange={(_event: unknown, newPage: number) => setPage(newPage + 1)}
        onPageSizeChange={(e: React.ChangeEvent<HTMLInputElement>) => setPageSize(parseInt(e.target.value, 10))}
        columns={DOCUMENT_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        toolbar={
          <FilterToolbar
            activeFilterCount={activeFilterCount}
            onResetFilters={() => {
              setSearch('');
              setDocTypeFilter('');
              setEquipmentFilter('');
              setPage(1);
            }}
          >
            <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 260 } }}>
              <SearchInput
                value={search}
                onSearch={(val: string) => {
                  setSearch(val);
                  setPage(1);
                }}
                placeholder="Поиск по имени файла или описанию..."
              />
            </Box>

            <Box sx={{ minWidth: 200 }}>
              <TextField
                select
                size="small"
                fullWidth
                value={docTypeFilter}
                onChange={(e) => {
                  setDocTypeFilter(e.target.value);
                  setPage(1);
                }}
                label="Тип документа"
              >
                <MenuItem value="">Все типы документов</MenuItem>
                {Object.entries(DOCUMENT_TYPE_MAP).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ minWidth: 240 }}>
              <TextField
                select
                size="small"
                fullWidth
                value={equipmentFilter}
                onChange={(e) => {
                  setEquipmentFilter(e.target.value);
                  setPage(1);
                }}
                label="Привязка к оборудованию"
              >
                <MenuItem value="">Любое оборудование</MenuItem>
                {equipmentOptions.map((eq) => (
                  <MenuItem key={eq.id} value={eq.id}>
                    [{eq.inventoryNumber || 'Б/Н'}] {eq.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </FilterToolbar>
        }
      >
        {items.length === 0 && !loading ? (
          <EmptyState
            title="Документы не найдены"
            description={
              activeFilterCount > 0
                ? 'Попробуйте изменить параметры поиска или сбросить фильтры'
                : 'В архиве пока нет загруженных документов'
            }
            actionText={canUpload ? 'Загрузить документ' : undefined}
            onAction={canUpload ? () => setUploadModalOpen(true) : undefined}
          />
        ) : (
          <DocumentArchiveTableView
            items={sortedItems}
            visibleColumns={visibleColumns}
            sortField={sortField}
            sortDirection={sortDirection}
            onRequestSort={handleRequestSort}
            canEdit={canEdit}
            onNavigateToEquipment={(eqId) => router.push(`/eps/${eqId}`)}
            onDeleteDocument={(doc) => setDeleteDialogDoc(doc)}
          />
        )}
      </DataTableWrapper>

      {/* Upload Modal Dialog */}
      <DocumentUploadDialog
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        selectedFile={selectedFile}
        onSelectedFileChange={setSelectedFile}
        selectedEquipment={selectedEquipmentForUpload}
        onSelectedEquipmentChange={setSelectedEquipmentForUpload}
        docType={uploadDocType}
        onDocTypeChange={setUploadDocType}
        description={uploadDescription}
        onDescriptionChange={setUploadDescription}
        equipmentOptions={equipmentOptions}
        uploading={uploading}
        onSubmit={handleUploadSubmit}
      />

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
    </Box>
  );
}

export default function DocumentsListPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка архива документации..." />}>
      <DocumentsListContent />
    </Suspense>
  );
}

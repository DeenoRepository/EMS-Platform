'use client';

import React, { useState, Suspense, useCallback } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { useRouter } from 'next/navigation';
import { DOCUMENT_TYPE_MAP, formatDate, formatBytes, PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/layout/PageHeader';
import {
  SearchInput,
  FilterToolbar,
  EmptyState,
  DataTableWrapper,
  ConfirmDialog,
  PageLoading,
  FormDialog,
  StatusBadge,
} from '@/components/ui';
import {
  DocumentItem,
  DOCUMENT_COLUMNS,
  useDocumentRegistry,
  DocumentKpiBar,
  DocumentRegistryTable,
} from '@/components/eps/documents';

function DocumentArchiveContent() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const canAccessDocs =
    Boolean(user?.roles?.includes('admin')) ||
    hasPermission(PERMISSIONS.EPS_DOCUMENTS_VIEW) ||
    hasPermission(PERMISSIONS.EPS_DOCUMENTS_UPLOAD);
  const canUpload = hasPermission(PERMISSIONS.EPS_DOCUMENTS_UPLOAD);
  const canDelete = Boolean(user?.roles?.includes('admin')) || hasPermission(PERMISSIONS.EPS_EQUIPMENT_DELETE);

  const {
    items,
    total,
    page,
    pageSize,
    loading,
    search,
    docTypeFilter,
    equipmentFilter,
    stats,
    setPage,
    setPageSize,
    setSearch,
    setDocTypeFilter,
    setEquipmentFilter,
    fetchDocuments,
    handleKpiFilter,
    handleResetFilters,
  } = useDocumentRegistry(canAccessDocs);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    DOCUMENT_COLUMNS.map((c) => c.id)
  );
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  // Delete State
  const [deleteDoc, setDeleteDoc] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDoc) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/eps/documents/${deleteDoc.id}`, { method: 'DELETE' });
      if (res.ok) {
        enqueueSnackbar(`Документ «${deleteDoc.originalName}» успешно удален`, { variant: 'info' });
        setDeleteDoc(null);
        fetchDocuments();
      } else {
        const json = await res.json();
        enqueueSnackbar(json.error || 'Ошибка удаления документа', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при удалении документа', { variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteDoc, enqueueSnackbar, fetchDocuments]);

  if (!canAccessDocs) {
    return (
      <Box sx={{ pb: 4 }}>
        <PageHeader
          title="Электронный архив технической документации"
          subtitle="Паспорта, электрические схемы, руководства по эксплуатации и сертификаты"
          breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Документооборот' }]}
        />
        <EmptyState
          title="Доступ ограничен"
          description="У вашей учетной записи нет прав для просмотра электронного архива документов."
          icon={<DescriptionOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
        />
      </Box>
    );
  }

  const activeFilterCount = (search ? 1 : 0) + (docTypeFilter ? 1 : 0) + (equipmentFilter ? 1 : 0);

  return (
    <Box sx={{ pb: 3 }}>
      {/* 1. Header */}
      <PageHeader
        title="Электронный архив технической документации"
        subtitle="Централизованный реестр паспортов оборудования, электрических схем, руководств и сертификатов"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Документооборот' }]}
        actions={
          canUpload ? (
            <Button
              variant="contained"
              size="small"
              startIcon={<UploadFileIcon />}
              onClick={() => router.push('/eps')}
              sx={{
                height: 38,
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.8125rem',
                textTransform: 'none',
                px: 2,
              }}
            >
              Загрузить в паспорт
            </Button>
          ) : undefined
        }
      />

      {/* 2. Top Overview KPI Cards */}
      <DocumentKpiBar
        stats={stats}
        docTypeFilter={docTypeFilter}
        loading={loading}
        onKpiFilter={handleKpiFilter}
      />

      {/* 3. Table and Grid Toolbar */}
      <DataTableWrapper
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(_, newPage) => setPage(newPage)}
        onPageSizeChange={(e) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(1);
        }}
        columns={DOCUMENT_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        loading={loading}
        stickyHeader
        toolbar={
          <FilterToolbar
            variant="embedded"
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
            actions={
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  select
                  size="small"
                  value={docTypeFilter}
                  onChange={(e) => {
                    setDocTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  SelectProps={{ displayEmpty: true }}
                  sx={{
                    minWidth: 180,
                    bgcolor: 'background.paper',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8125rem', height: 36 },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все типы документов</MenuItem>
                  {Object.entries(DOCUMENT_TYPE_MAP).map(([key, label]) => (
                    <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            }
          >
            <Box sx={{ minWidth: { xs: '100%', sm: 260, md: 320 }, flexGrow: 1 }}>
              <SearchInput
                value={search}
                placeholder="Поиск по наименованию файла, описанию..."
                onSearch={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
              />
            </Box>
          </FilterToolbar>
        }
        gridContent={
          <Grid container spacing={2}>
            {items.map((doc) => {
              const targetPath = doc.filePath ? (doc.filePath.startsWith('/') ? doc.filePath.slice(1) : doc.filePath) : doc.fileName;
              const fileUrl = `/api/files/${targetPath.split('/').map(encodeURIComponent).join('/')}`;
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: '10px',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 2,
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2, flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ maxWidth: 170 }}>
                          {doc.originalName}
                        </Typography>
                        <StatusBadge status={doc.docType} />
                      </Box>

                      {doc.equipment && (
                        <Box sx={{ mb: 1.5 }}>
                          <Chip
                            icon={<PrecisionManufacturingIcon sx={{ fontSize: 13 }} />}
                            label={doc.equipment.name}
                            size="small"
                            clickable
                            onClick={() => router.push(`/eps/${doc.equipment.id}`)}
                            sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600 }}
                          />
                        </Box>
                      )}

                      <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto', display: 'block' }}>
                        Размер: {formatBytes(doc.fileSize)} • {formatDate(doc.createdAt)}
                      </Typography>

                      <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => setPreviewDocUrl(fileUrl)}
                          title="Предпросмотр"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          component="a"
                          href={fileUrl}
                          download={doc.originalName}
                          title="Скачать"
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                        {canDelete && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDoc(doc)}
                            title="Удалить"
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        }
      >
        <DocumentRegistryTable
          items={items}
          visibleColumns={visibleColumns}
          canDelete={canDelete}
          loading={loading}
          onPreview={(url) => setPreviewDocUrl(url)}
          onDelete={(doc) => setDeleteDoc(doc)}
          onNavigateToEquipment={(eqId) => router.push(`/eps/${eqId}`)}
          onResetFilters={handleResetFilters}
          hasFilters={Boolean(search || docTypeFilter || equipmentFilter)}
        />
      </DataTableWrapper>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteDoc)}
        title="Удаление документа из архива"
        message={`Вы действительно хотите удалить документ «${deleteDoc?.originalName}»? Файл будет безвозвратно удален с сервера.`}
        variant="danger"
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteDoc(null)}
      />

      {/* Lightbox / Preview */}
      <FormDialog
        open={Boolean(previewDocUrl)}
        onClose={() => setPreviewDocUrl(null)}
        title="Просмотр документа"
        maxWidth="lg"
        fullWidth
        hideActions
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', bgcolor: 'black', borderRadius: 1, overflow: 'hidden', minHeight: 480 }}>
          {previewDocUrl && (
            previewDocUrl.toLowerCase().includes('.pdf') ? (
              <Box
                component="iframe"
                src={previewDocUrl}
                title="Просмотр документа"
                sx={{ width: '100%', height: '80vh', border: 'none' }}
              />
            ) : (
              <Box
                component="img"
                src={previewDocUrl}
                alt="Preview"
                sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
              />
            )
          )}
        </Box>
      </FormDialog>
    </Box>
  );
}

export default function DocumentArchivePage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка электронного архива документов..." />}>
      <DocumentArchiveContent />
    </Suspense>
  );
}

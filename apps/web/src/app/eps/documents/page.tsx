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
import { DOCUMENT_TYPE_MAP, formatDate, formatDateTime, formatBytes, PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';

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
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
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
    byTypeCounts: {
      SCHEMA: 0,
      MANUAL: 0,
      CERTIFICATE: 0,
      PASSPORT: 0,
      ACT: 0,
      OTHER: 0,
    } as Record<string, number>,
  });

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedEquipmentForUpload, setSelectedEquipmentForUpload] = useState<EquipmentOption | null>(null);
  const [uploadDocType, setUploadDocType] = useState('SCHEMA');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  // Load equipment list for selectors
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
        pageSize: '25',
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
          setTotalPages(json.data.totalPages || 1);
          if (json.data.stats) {
            setStats(json.data.stats);
          }
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки реестра документов', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, search, docTypeFilter, equipmentFilter, enqueueSnackbar]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDocuments();
  };

  const handleKpiFilter = (type: string) => {
    if (docTypeFilter === type) {
      setDocTypeFilter('');
    } else {
      setDocTypeFilter(type);
    }
    setPage(1);
  };

  const handleDeleteDocument = async (id: string, name: string) => {
    if (!confirm(`Вы действительно хотите удалить документ "${name}"?`)) return;

    try {
      const res = await fetch(`/api/eps/documents/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        enqueueSnackbar('Документ успешно удален', { variant: 'info' });
        fetchDocuments();
      } else {
        enqueueSnackbar(json.error || 'Ошибка удаления', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при удалении', { variant: 'error' });
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
              sx={{ px: 2.5, py: 1, fontWeight: 600 }}
            >
              Загрузить документ
            </Button>
          )
        }
      />

      {/* KPI Metric Cards */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            onClick={() => handleKpiFilter('')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: docTypeFilter === '' ? '2px solid #0284c7' : '1px solid #e2e8f0',
              backgroundColor: docTypeFilter === '' ? 'rgba(2, 132, 199, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="primary.main" fontWeight={700} fontSize="0.6875rem">
                ВСЕГО ДОКУМЕНТОВ
              </Typography>
              <DescriptionOutlinedIcon color="primary" sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: '#0f172a', fontSize: '1.25rem' }}>
              {stats.totalDocuments}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            sx={{
              p: 1.25,
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} fontSize="0.6875rem">
                ОБЩИЙ ОБЪЁМ
              </Typography>
              <FolderZipOutlinedIcon color="action" sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: '#0f172a', fontSize: '1.25rem' }}>
              {formatBytes(stats.totalSizeBytes)}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            onClick={() => handleKpiFilter('SCHEMA')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: docTypeFilter === 'SCHEMA' ? '2px solid #0284c7' : '1px solid #e2e8f0',
              backgroundColor: docTypeFilter === 'SCHEMA' ? 'rgba(2, 132, 199, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="info.main" fontWeight={700} fontSize="0.6875rem">
                СХЕМЫ И ЧЕРТЕЖИ
              </Typography>
              <SchemaOutlinedIcon color="info" sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: 'info.main', fontSize: '1.25rem' }}>
              {stats.byTypeCounts.SCHEMA || 0}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            onClick={() => handleKpiFilter('MANUAL')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: docTypeFilter === 'MANUAL' ? '2px solid #16a34a' : '1px solid #e2e8f0',
              backgroundColor: docTypeFilter === 'MANUAL' ? 'rgba(22, 163, 74, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="success.main" fontWeight={700} fontSize="0.6875rem">
                ИНСТРУКЦИИ
              </Typography>
              <MenuBookOutlinedIcon color="success" sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: 'success.main', fontSize: '1.25rem' }}>
              {stats.byTypeCounts.MANUAL || 0}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            onClick={() => handleKpiFilter('CERTIFICATE')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: docTypeFilter === 'CERTIFICATE' ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
              backgroundColor: docTypeFilter === 'CERTIFICATE' ? 'rgba(139, 92, 246, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="#8b5cf6" fontWeight={700} fontSize="0.6875rem">
                СЕРТИФИКАТЫ И АКТЫ
              </Typography>
              <VerifiedOutlinedIcon sx={{ color: '#8b5cf6', fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: '#8b5cf6', fontSize: '1.25rem' }}>
              {(stats.byTypeCounts.CERTIFICATE || 0) + (stats.byTypeCounts.ACT || 0)}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Card sx={{ p: 1.25, mb: 2 }}>
        <Box
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{
            display: 'flex',
            gap: 1.5,
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', flexGrow: 1 }}>
            <TextField
              size="small"
              placeholder="Поиск по названию файла, описанию, инв. №..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 280, flexGrow: { xs: 1, md: 0 } }}
            />

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

            <Button type="submit" variant="outlined" size="small" sx={{ px: 2 }}>
              Применить
            </Button>
            {(search || docTypeFilter || equipmentFilter) && (
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setSearch('');
                  setDocTypeFilter('');
                  setEquipmentFilter('');
                  setPage(1);
                }}
                color="inherit"
              >
                Сбросить
              </Button>
            )}
          </Box>
        </Box>
      </Card>

      {/* Main Table */}
      {loading ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Card>
      ) : items.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <DescriptionOutlinedIcon sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Документы не найдены
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Попробуйте изменить параметры поиска или прикрепите новый документ к оборудованию
          </Typography>
          {canUpload && (
            <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => setUploadModalOpen(true)}>
              Загрузить документ
            </Button>
          )}
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table size="medium">
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
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
                        <DescriptionOutlinedIcon color="primary" sx={{ fontSize: 20 }} />
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>
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
                          sx={{ fontWeight: 700, fontFamily: 'monospace', height: 22 }}
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
                        sx={{ fontWeight: 600 }}
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
                              onClick={() => handleDeleteDocument(doc.id, doc.originalName)}
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
          </TableContainer>

          {/* Pagination */}
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Всего документов в архиве: {total}
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, val) => setPage(val)}
              color="primary"
              size="medium"
            />
          </Box>
        </Card>
      )}

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
    <Suspense
      fallback={
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      }
    >
      <DocumentsListContent />
    </Suspense>
  );
}

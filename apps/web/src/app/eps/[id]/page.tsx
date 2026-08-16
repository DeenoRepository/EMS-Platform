'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Tabs,
  Tab,
  Grid,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Divider,
  Paper,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StarIcon from '@mui/icons-material/Star';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BuildIcon from '@mui/icons-material/Build';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import HistoryIcon from '@mui/icons-material/History';
import PageHeader from '@/components/layout/PageHeader';
import { useParams, useRouter } from 'next/navigation';
import {
  EQUIPMENT_STATUS_MAP,
  DOCUMENT_TYPE_MAP,
  MAINTENANCE_STATUS_MAP,
  formatDate,
  formatDateTime,
  formatBytes,
  PERMISSIONS,
  AUDIT_ACTION_MAP,
} from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';

interface EquipmentDetails {
  id: string;
  name: string;
  inventoryNumber: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  status: string;
  commissionDate: string | null;
  customFields: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { displayName: string; ldapLogin: string };
  tags: { tag: { id: string; name: string; color: string | null } }[];
  photos: { id: string; fileName: string; originalName: string; filePath: string; isPrimary: boolean; createdAt: string }[];
  documents: {
    id: string;
    fileName: string;
    originalName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    docType: string;
    version: number;
    description: string | null;
    createdAt: string;
    uploadedBy: { displayName: string };
  }[];
  spareParts: {
    nomenclature: {
      id: string;
      name: string;
      article: string | null;
      unit: string;
      stockItems: { quantity: string; warehouse: { name: string } }[];
    };
  }[];
  maintenancePlans: {
    id: string;
    name: string;
    frequency: string;
    schedules: { id: string; title: string; scheduledDate: string; status: string }[];
  }[];
  jiraIssues?: {
    id: string;
    issueKey: string;
    summary: string;
    status: string;
    priority: string;
    createdDate: string;
    resolvedDate: string | null;
  }[];
}

export default function EquipmentPassportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [equipment, setEquipment] = useState<EquipmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('SCHEMA');
  const [docDescription, setDocDescription] = useState('');
  const [isPrimaryPhoto, setIsPrimaryPhoto] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/eps/equipment/${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setEquipment(json.data);
          setEditForm({
            name: json.data.name,
            inventoryNumber: json.data.inventoryNumber || '',
            serialNumber: json.data.serialNumber || '',
            manufacturer: json.data.manufacturer || '',
            model: json.data.model || '',
            location: json.data.location || '',
            status: json.data.status,
            commissionDate: json.data.commissionDate ? json.data.commissionDate.split('T')[0] : '',
          });
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки паспорта оборудования', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, enqueueSnackbar]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const fetchAudit = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch(`/api/eps/equipment/${id}/audit`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setAuditLogs(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    if (newValue === 6) {
      // Audit tab
      fetchAudit();
    }
  };

  // Status Quick Update
  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/eps/equipment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Статус оборудования обновлен', { variant: 'success' });
        fetchEquipment();
      }
    } catch {
      enqueueSnackbar('Ошибка обновления статуса', { variant: 'error' });
    }
  };

  // Edit Submit
  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`/api/eps/equipment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Паспорт оборудования сохранен', { variant: 'success' });
        setEditModalOpen(false);
        fetchEquipment();
      } else {
        enqueueSnackbar(data.error || 'Ошибка сохранения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка отправки данных', { variant: 'error' });
    }
  };

  // Delete Equipment
  const handleDeleteEquipment = async () => {
    if (!confirm('Вы действительно хотите удалить эту единицу оборудования из системы?')) return;

    try {
      const res = await fetch(`/api/eps/equipment/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Оборудование удалено', { variant: 'info' });
        router.push('/eps');
      } else {
        enqueueSnackbar(data.error || 'Ошибка удаления', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    }
  };

  // Upload Photo
  const handleUploadPhoto = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('isPrimary', String(isPrimaryPhoto));

      const res = await fetch(`/api/eps/equipment/${id}/photos`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Фотография успешно добавлена', { variant: 'success' });
        setPhotoModalOpen(false);
        setSelectedFile(null);
        fetchEquipment();
      } else {
        enqueueSnackbar(data.error || 'Ошибка загрузки фото', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при загрузке фото', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  // Upload Document
  const handleUploadDocument = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('docType', docType);
      fd.append('description', docDescription);

      const res = await fetch(`/api/eps/equipment/${id}/documents`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Документ успешно прикреплен', { variant: 'success' });
        setDocModalOpen(false);
        setSelectedFile(null);
        setDocDescription('');
        fetchEquipment();
      } else {
        enqueueSnackbar(data.error || 'Ошибка загрузки документа', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при загрузке документа', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  // Delete Photo
  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Удалить эту фотографию?')) return;
    try {
      await fetch(`/api/eps/equipment/${id}/photos?photoId=${photoId}`, { method: 'DELETE' });
      enqueueSnackbar('Фотография удалена', { variant: 'info' });
      fetchEquipment();
    } catch {
      enqueueSnackbar('Ошибка удаления', { variant: 'error' });
    }
  };

  // Delete Document
  const handleDeleteDoc = async (documentId: string) => {
    if (!confirm('Удалить этот документ?')) return;
    try {
      await fetch(`/api/eps/equipment/${id}/documents?documentId=${documentId}`, { method: 'DELETE' });
      enqueueSnackbar('Документ удален', { variant: 'info' });
      fetchEquipment();
    } catch {
      enqueueSnackbar('Ошибка удаления', { variant: 'error' });
    }
  };

  if (loading || !equipment) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const statusInfo = EQUIPMENT_STATUS_MAP[equipment.status] || { label: equipment.status, color: 'default' };
  const canEdit = hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT);
  const canDelete = hasPermission(PERMISSIONS.EPS_EQUIPMENT_DELETE);

  return (
    <Box>
      <PageHeader
        title={equipment.name}
        subtitle={`${equipment.manufacturer || ''} ${equipment.model || ''} • Инв. №: ${equipment.inventoryNumber || 'Б/Н'}`}
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: equipment.name },
        ]}
        actions={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/eps')}
            >
              К списку
            </Button>
            {canEdit && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setEditModalOpen(true)}
              >
                Редактировать
              </Button>
            )}
            {canDelete && (
              <IconButton color="error" onClick={handleDeleteEquipment} title="Удалить оборудование">
                <DeleteOutlineIcon />
              </IconButton>
            )}
          </Box>
        }
      />

      {/* Overview Quick Stats Bar */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Текущий статус
              </Typography>
              <Chip
                label={statusInfo.label}
                color={statusInfo.color as any}
                sx={{ fontWeight: 600, mt: 0.5 }}
              />
            </Box>

            {canEdit && (
              <TextField
                select
                size="small"
                label="Сменить статус"
                value={equipment.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                {Object.entries(EQUIPMENT_STATUS_MAP).map(([key, info]) => (
                  <MenuItem key={key} value={key}>
                    {info.label}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Местоположение
              </Typography>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 0.5 }}>
                {equipment.location || '—'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Заводской номер
              </Typography>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 0.5 }}>
                {equipment.serialNumber || '—'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {equipment.tags.map(({ tag }) => (
              <Chip
                key={tag.id}
                label={tag.name}
                size="small"
                variant="outlined"
                sx={{
                  backgroundColor: tag.color ? `${tag.color}15` : undefined,
                  color: tag.color || 'inherit',
                  borderColor: tag.color || undefined,
                }}
              />
            ))}
          </Box>
        </Box>
      </Card>

      {/* Tabs Bar */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Паспорт (Общие сведения)" />
          <Tab label={`Фотогалерея (${equipment.photos.length})`} />
          <Tab label={`Документация (${equipment.documents.length})`} />
          <Tab label={`Запчасти WMS (${equipment.spareParts.length})`} />
          <Tab label={`ТО и Ремонт MRO (${equipment.maintenancePlans.length})`} />
          <Tab label={`Заявки Jira (${equipment.jiraIssues?.length || 0})`} />
          <Tab label="История изменений (Аудит)" />
        </Tabs>
      </Card>

      {/* TAB 0: Паспорт (Общие сведения) */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Технические характеристики
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, width: '40%', color: 'text.secondary' }}>
                          Наименование
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{equipment.name}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Инвентарный номер</TableCell>
                        <TableCell>{equipment.inventoryNumber || '—'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Заводской / Серийный №</TableCell>
                        <TableCell>{equipment.serialNumber || '—'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Производитель</TableCell>
                        <TableCell>{equipment.manufacturer || '—'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Модель / Модификация</TableCell>
                        <TableCell>{equipment.model || '—'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Дата ввода в эксплуатацию</TableCell>
                        <TableCell>{formatDate(equipment.commissionDate)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Место установки</TableCell>
                        <TableCell>{equipment.location || '—'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Паспорт создал</TableCell>
                        <TableCell>{equipment.createdBy?.displayName} ({formatDate(equipment.createdAt)})</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Custom Fields Section */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Кастомные параметры
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {equipment.customFields && Object.keys(equipment.customFields).length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        {Object.entries(equipment.customFields).map(([k, v]) => (
                          <TableRow key={k}>
                            <TableCell sx={{ fontWeight: 500, color: 'text.secondary', width: '50%' }}>
                              {k.replace(/_/g, ' ')}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>
                              {typeof v === 'boolean' ? (v ? 'Да' : 'Нет') : String(v)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Дополнительные кастомные поля не заполнены.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: Фотогалерея */}
      {activeTab === 1 && (
        <Card sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              Фотографии оборудования ({equipment.photos.length})
            </Typography>
            {canEdit && (
              <Button
                variant="contained"
                startIcon={<AddPhotoAlternateIcon />}
                onClick={() => setPhotoModalOpen(true)}
              >
                Добавить фото
              </Button>
            )}
          </Box>

          {equipment.photos.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
              <AddPhotoAlternateIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography variant="body2">Фотографии отсутствуют</Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {equipment.photos.map((photo) => (
                <Grid item xs={12} sm={6} md={4} key={photo.id}>
                  <Card sx={{ position: 'relative', overflow: 'hidden' }}>
                    <Box
                      component="img"
                      src={`/api/files/${photo.filePath}`}
                      alt={photo.originalName}
                      sx={{
                        width: '100%',
                        height: 220,
                        objectFit: 'cover',
                        display: 'block',
                        cursor: 'pointer',
                      }}
                      onClick={() => setPreviewDocUrl(`/api/files/${photo.filePath}`)}
                    />
                    <Box
                      sx={{
                        p: 1.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <Box>
                        <Typography variant="caption" fontWeight={600} noWrap sx={{ display: 'block', maxWidth: 160 }}>
                          {photo.originalName}
                        </Typography>
                        {photo.isPrimary && (
                          <Chip
                            icon={<StarIcon fontSize="small" />}
                            label="Главное фото"
                            size="small"
                            color="primary"
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                      {canEdit && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeletePhoto(photo.id)}
                          title="Удалить фото"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Card>
      )}

      {/* TAB 2: Документация */}
      {activeTab === 2 && (
        <Card sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              Документация и чертежи ({equipment.documents.length})
            </Typography>
            {hasPermission(PERMISSIONS.EPS_DOCUMENTS_UPLOAD) && (
              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                onClick={() => setDocModalOpen(true)}
              >
                Прикрепить документ
              </Button>
            )}
          </Box>

          {equipment.documents.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
              <UploadFileIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography variant="body2">Документы не загружены</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Имя файла</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Тип документа</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Описание</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Размер</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Загрузил</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Дата</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {equipment.documents.map((doc) => (
                    <TableRow key={doc.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {doc.originalName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Версия {doc.version}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={DOCUMENT_TYPE_MAP[doc.docType] || doc.docType}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{doc.description || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{formatBytes(doc.fileSize)}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{doc.uploadedBy?.displayName}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{formatDate(doc.createdAt)}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="primary"
                          component="a"
                          href={`/api/files/${doc.filePath}`}
                          target="_blank"
                          title="Просмотреть / Скачать"
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                        {canEdit && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteDoc(doc.id)}
                            title="Удалить"
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      )}

      {/* TAB 3: Запчасти (WMS) */}
      {activeTab === 3 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Совместимые запасные части и расходные материалы (WMS)
          </Typography>
          <Typography variant="caption" color="text.secondary" paragraph>
            Номенклатурные позиции склада, применяемые при ремонте и ТО этой единицы
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {equipment.spareParts.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
              <Inventory2Icon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography variant="body2">Нет привязанных запчастей из WMS</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Артикул</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Наименование номенклатуры</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Ед. изм.</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Остатки на складах</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {equipment.spareParts.map(({ nomenclature: nom }) => (
                    <TableRow key={nom.id} hover>
                      <TableCell>
                        <Chip label={nom.article || 'Б/А'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{nom.name}</TableCell>
                      <TableCell>{nom.unit}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {nom.stockItems.map((si, idx) => (
                            <Chip
                              key={idx}
                              label={`${si.warehouse.name}: ${si.quantity} ${nom.unit}`}
                              size="small"
                              color={Number(si.quantity) > 0 ? 'success' : 'default'}
                            />
                          ))}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      )}

      {/* TAB 4: ТО и Ремонт (MRO) */}
      {activeTab === 4 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Планы технического обслуживания и график ППР (MRO)
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {equipment.maintenancePlans.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
              <BuildIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography variant="body2">Планы ТО для данного оборудования не назначены</Typography>
            </Box>
          ) : (
            equipment.maintenancePlans.map((plan) => (
              <Box key={plan.id} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                  {plan.name} ({plan.frequency})
                </Typography>
                <TableContainer sx={{ mt: 1 }}>
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Задача</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Дата по графику</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Статус</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {plan.schedules.map((sch) => {
                        const mStatus = MAINTENANCE_STATUS_MAP[sch.status] || { label: sch.status, color: 'default' };
                        return (
                          <TableRow key={sch.id}>
                            <TableCell sx={{ fontWeight: 500 }}>{sch.title}</TableCell>
                            <TableCell>{formatDate(sch.scheduledDate)}</TableCell>
                            <TableCell>
                              <Chip label={mStatus.label} size="small" color={mStatus.color as any} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))
          )}
        </Card>
      )}

      {/* TAB 5: Заявки (SRM / Jira) */}
      {activeTab === 5 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Связанные заявки на ремонт из Jira (SRM)
          </Typography>
          <Typography variant="caption" color="text.secondary" paragraph>
            Заявки, сопоставленные с данным оборудованием по инвентарному номеру
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {(!equipment.jiraIssues || equipment.jiraIssues.length === 0) ? (
            <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
              <ConfirmationNumberIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography variant="body2">Связанных заявок в Jira не найдено</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Ключ заявки</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Тема</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Приоритет</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Статус</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Создана</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Решена</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {equipment.jiraIssues.map((issue) => (
                    <TableRow key={issue.id} hover>
                      <TableCell>
                        <Chip label={issue.issueKey} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{issue.summary}</TableCell>
                      <TableCell>{issue.priority}</TableCell>
                      <TableCell>
                        <Chip label={issue.status} size="small" />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{formatDateTime(issue.createdDate)}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{formatDateTime(issue.resolvedDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      )}

      {/* TAB 6: История изменений (Аудит) */}
      {activeTab === 6 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            История изменений паспорта оборудования
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {loadingAudit ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : auditLogs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Записей изменений не найдено.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Дата и время</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Пользователь</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Действие</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Изменения</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => {
                    const actionInfo = AUDIT_ACTION_MAP[log.action] || { label: log.action, color: 'default' };
                    return (
                      <TableRow key={log.id}>
                        <TableCell sx={{ fontSize: '0.8125rem' }}>{formatDateTime(log.createdAt)}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{log.user?.displayName || 'Система'}</TableCell>
                        <TableCell>
                          <Chip label={actionInfo.label} size="small" color={actionInfo.color as any} />
                        </TableCell>
                        <TableCell>
                          <Box
                            component="pre"
                            sx={{
                              p: 1,
                              backgroundColor: '#f8fafc',
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              m: 0,
                              maxHeight: 120,
                              overflow: 'auto',
                            }}
                          >
                            {JSON.stringify(log.changes, null, 2)}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      )}

      {/* Edit Equipment Dialog */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Редактирование паспорта оборудования</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Наименование оборудования"
              fullWidth
              size="small"
              value={editForm.name || ''}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <TextField
              label="Инвентарный номер"
              fullWidth
              size="small"
              value={editForm.inventoryNumber || ''}
              onChange={(e) => setEditForm({ ...editForm, inventoryNumber: e.target.value })}
            />
            <TextField
              label="Заводской / Серийный номер"
              fullWidth
              size="small"
              value={editForm.serialNumber || ''}
              onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
            />
            <TextField
              label="Производитель"
              fullWidth
              size="small"
              value={editForm.manufacturer || ''}
              onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })}
            />
            <TextField
              label="Модель"
              fullWidth
              size="small"
              value={editForm.model || ''}
              onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
            />
            <TextField
              label="Место установки (Локация)"
              fullWidth
              size="small"
              value={editForm.location || ''}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
            />
            <TextField
              label="Дата ввода в эксплуатацию"
              type="date"
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
              value={editForm.commissionDate || ''}
              onChange={(e) => setEditForm({ ...editForm, commissionDate: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)} color="inherit">
            Отмена
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Photo Dialog */}
      <Dialog open={photoModalOpen} onClose={() => setPhotoModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Загрузка фотографии оборудования</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Button variant="outlined" component="label" fullWidth sx={{ py: 1.5 }}>
              {selectedFile ? selectedFile.name : 'Выбрать фото с диска'}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </Button>
            <TextField
              select
              size="small"
              label="Сделать главным фото"
              value={isPrimaryPhoto ? 'true' : 'false'}
              onChange={(e) => setIsPrimaryPhoto(e.target.value === 'true')}
            >
              <MenuItem value="false">Нет</MenuItem>
              <MenuItem value="true">Да, сделать главным</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhotoModalOpen(false)} color="inherit">
            Отмена
          </Button>
          <Button onClick={handleUploadPhoto} variant="contained" disabled={!selectedFile || uploading}>
            {uploading ? <CircularProgress size={20} /> : 'Загрузить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={docModalOpen} onClose={() => setDocModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Прикрепление документа</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Button variant="outlined" component="label" fullWidth sx={{ py: 1.5 }}>
              {selectedFile ? selectedFile.name : 'Выбрать файл (PDF, DOCX, XLSX, Схемы)'}
              <input
                type="file"
                hidden
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </Button>

            <TextField
              select
              size="small"
              label="Тип документа"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              {Object.entries(DOCUMENT_TYPE_MAP).map(([k, label]) => (
                <MenuItem key={k} value={k}>
                  {label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              label="Примечание / Описание"
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocModalOpen(false)} color="inherit">
            Отмена
          </Button>
          <Button onClick={handleUploadDocument} variant="contained" disabled={!selectedFile || uploading}>
            {uploading ? <CircularProgress size={20} /> : 'Прикрепить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Lightbox Preview Modal */}
      <Dialog open={Boolean(previewDocUrl)} onClose={() => setPreviewDocUrl(null)} maxWidth="md">
        <DialogContent sx={{ p: 0, backgroundColor: 'black', display: 'flex', justifyContent: 'center' }}>
          {previewDocUrl && (
            <Box
              component="img"
              src={previewDocUrl}
              alt="Preview"
              sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

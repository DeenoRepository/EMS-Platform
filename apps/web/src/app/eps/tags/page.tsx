'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PageHeader from '@/components/layout/PageHeader';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import {
  EmptyState,
  DataTableWrapper,
} from '@/components/ui';

interface TagItem {
  id: string;
  name: string;
  color: string;
  equipmentCount: number;
}

const PRESET_COLORS = ['#0284c7', '#0f766e', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#475569'];

export default function TagsManagementPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Tag Dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#0284c7');
  const [saving, setSaving] = useState(false);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/eps/tags');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setTags(json.data);
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки тегов', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleCreateTag = async () => {
    if (!tagName.trim()) {
      enqueueSnackbar('Укажите название тега', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/eps/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName.trim(), color: tagColor }),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Тег успешно создан', { variant: 'success' });
        setOpenDialog(false);
        setTagName('');
        fetchTags();
      } else {
        enqueueSnackbar(data.error || 'Ошибка создания тега', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto' }}>
      <PageHeader
        title="Теги и классификаторы оборудования"
        subtitle="Группировка оборудования по технологическим признакам и цеховой принадлежности"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'Теги' },
        ]}
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/eps')}
            >
              Назад к реестру
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
            >
              Создать тег
            </Button>
          </Box>
        }
      />

      {tags.length === 0 && !loading ? (
        <EmptyState
          paper
          icon={<LocalOfferOutlinedIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
          title="Теги оборудования еще не созданы"
          description="Теги позволяют классифицировать оборудование по цехам, критичности или функциональным группам."
          actionText="Создать первый тег"
          onAction={() => setOpenDialog(true)}
        />
      ) : (
        <DataTableWrapper
          loading={loading}
          total={tags.length}
          stickyHeader
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Тег / Бейдж</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Цвет метки</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Количество оборудования</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, width: 220 }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tags.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <Chip
                      label={t.name}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        backgroundColor: `${t.color}15`,
                        color: t.color,
                        borderColor: t.color,
                        borderRadius: '4px',
                      }}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: t.color,
                          boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {t.color}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {t.equipmentCount} ед.
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => router.push(`/eps?tagId=${t.id}`)}
                    >
                      Показать оборудование
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableWrapper>
      )}

      {/* Create Tag Modal */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Создание тега оборудования</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              label="Название тега"
              placeholder="например: Взрывозащищенное"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              fullWidth
              size="small"
              required
            />

            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Выберите цвет бейджа:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setTagColor(color)}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: color,
                      cursor: 'pointer',
                      border: tagColor === color ? '3px solid #0f172a' : '2px solid transparent',
                      transition: 'transform 0.1s ease',
                      '&:hover': { transform: 'scale(1.15)' },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="inherit">
            Отмена
          </Button>
          <Button onClick={handleCreateTag} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

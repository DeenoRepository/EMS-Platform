'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
} from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from 'notistack';

export interface EquipmentPurgeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentCount?: number;
}

export function EquipmentPurgeDialog({
  open,
  onClose,
  onSuccess,
  currentCount,
}: EquipmentPurgeDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  const [confirmInput, setConfirmInput] = useState('');
  const [loadingStats, setLoadingStats] = useState(false);
  const [purging, setPurging] = useState(false);
  const [stats, setStats] = useState<{
    equipmentCount: number;
    documentsCount: number;
    photosCount: number;
  }>({
    equipmentCount: currentCount || 0,
    documentsCount: 0,
    photosCount: 0,
  });

  useEffect(() => {
    if (open) {
      setConfirmInput('');
      setLoadingStats(true);
      fetch('/api/eps/equipment/purge')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setStats(json.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingStats(false));
    }
  }, [open]);

  const isConfirmed = confirmInput.trim().toUpperCase() === 'УДАЛИТЬ';

  const handlePurge = async () => {
    if (!isConfirmed) return;
    setPurging(true);
    try {
      const res = await fetch('/api/eps/equipment/purge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: confirmInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar(data.message || 'Все позиции оборудования успешно удалены', {
          variant: 'success',
        });
        onClose();
        onSuccess();
      } else {
        enqueueSnackbar(data.error || 'Ошибка при удалении позиций', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка при выполнении операции', { variant: 'error' });
    } finally {
      setPurging(false);
    }
  };

  return (
    <Dialog open={open} onClose={purging ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1.5,
          borderBottom: '1px solid',
          borderColor: 'error.light',
          bgcolor: 'error.lighter',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <DeleteForeverIcon color="error" />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>
            Удаление всех позиций оборудования (EPS)
          </Typography>
        </Box>
        {!purging && (
          <IconButton size="small" onClick={onClose} aria-label="Закрыть диалог удаления">
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Alert
          severity="error"
          icon={<WarningAmberIcon fontSize="large" />}
          sx={{
            borderRadius: '8px',
            border: '1px solid',
            borderColor: 'error.light',
            backgroundColor: 'error.lighter',
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'error.dark' }}>
            Внимание! Критическое необратимое действие
          </Typography>
          <Typography variant="body2" sx={{ color: 'error.dark', lineHeight: 1.5 }}>
            Вы собираетесь безвозвратно удалить <strong>ВСЕ позиции оборудования</strong> из базы
            данных модуля EPS. Все связанные паспорта, прикрепленные документы, фотографии,
            история согласований и графики обслуживания будут полностью удалены без возможности
            восстановления.
          </Typography>
        </Alert>

        <Box
          sx={{
            p: 2,
            borderRadius: '8px',
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-around',
            textAlign: 'center',
          }}
        >
          {loadingStats ? (
            <CircularProgress size={24} />
          ) : (
            <>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                  {stats.equipmentCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Позиций оборудования
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {stats.documentsCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Файлов документов
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {stats.photosCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Фотографий
                </Typography>
              </Box>
            </>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Для подтверждения удаления введите слово <strong>УДАЛИТЬ</strong>:
          </Typography>
          <TextField
            id="purge-confirmation"
            label="Подтверждение удаления"
            aria-describedby="purge-confirmation-help"
            fullWidth
            size="small"
            placeholder="УДАЛИТЬ"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            disabled={purging}
            autoFocus
            error={confirmInput.length > 0 && !isConfirmed}
            helperText={
              confirmInput.length > 0 && !isConfirmed
                ? 'Введите точное слово УДАЛИТЬ заглавными буквами'
                : 'Операция будет зарегистрирована в журнале системного аудита'
            }
            FormHelperTextProps={{ id: 'purge-confirmation-help' }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} color="inherit" size="small" disabled={purging}>
          Отмена
        </Button>
        <Button
          variant="contained"
          color="error"
          size="small"
          startIcon={purging ? <CircularProgress size={16} color="inherit" /> : <DeleteForeverIcon />}
          disabled={!isConfirmed || purging}
          onClick={handlePurge}
          sx={{ fontWeight: 700 }}
        >
          {purging ? 'Удаление данных...' : 'Удалить все позиции безвозвратно'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EquipmentPurgeDialog;

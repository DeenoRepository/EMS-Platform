'use client';

import React, { useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Chip,
  Paper,
} from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import LinkIcon from '@mui/icons-material/Link';
import DevicesIcon from '@mui/icons-material/Devices';
import { StatusBadge } from '@/components/ui';
import {
  FeedbackType,
  FeedbackModule,
  FeedbackPriority,
  FEEDBACK_MODULE_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  formatBytes,
} from '@ems/shared';

interface FeedbackNewTicketTabProps {
  type: FeedbackType;
  setType: (t: FeedbackType) => void;
  module: FeedbackModule;
  setModule: (m: FeedbackModule) => void;
  priority: FeedbackPriority;
  setPriority: (p: FeedbackPriority) => void;
  title: string;
  setTitle: (t: string) => void;
  description: string;
  setDescription: (d: string) => void;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  pageUrl: string;
  browserInfo: any;
  onSubmit: (e: React.FormEvent) => void;
}

const FEEDBACK_TYPES = [
  {
    id: 'BUG',
    label: 'Неисправность / Ошибка',
    icon: <BugReportIcon sx={{ fontSize: 22, color: 'error.main' }} />,
    border: 'error.main',
    bgLight: 'error.light',
  },
  {
    id: 'FEATURE_REQUEST',
    label: 'Предложение по улучшению',
    icon: <LightbulbOutlinedIcon sx={{ fontSize: 22, color: 'primary.main' }} />,
    border: 'primary.main',
    bgLight: 'info.light',
  },
  {
    id: 'QUESTION',
    label: 'Вопрос / Консультация',
    icon: <HelpOutlineIcon sx={{ fontSize: 22, color: 'secondary.main' }} />,
    border: 'secondary.main',
    bgLight: 'secondary.light',
  },
  {
    id: 'OTHER',
    label: 'Другое',
    icon: <MoreHorizIcon sx={{ fontSize: 22, color: 'text.secondary' }} />,
    border: 'text.secondary',
    bgLight: 'background.default',
  },
];

export function FeedbackNewTicketTab({
  type,
  setType,
  module,
  setModule,
  priority,
  setPriority,
  title,
  setTitle,
  description,
  setDescription,
  files,
  setFiles,
  pageUrl,
  browserInfo,
  onSubmit,
}: FeedbackNewTicketTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Box component="form" onSubmit={onSubmit}>
      <Grid container spacing={2.5}>
        {/* Type Selection */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
            Тип обращения
          </Typography>
          <Grid container spacing={1.5}>
            {FEEDBACK_TYPES.map((item) => (
              <Grid item xs={6} sm={3} key={item.id}>
                <Paper
                  onClick={() => setType(item.id as FeedbackType)}
                  elevation={0}
                  sx={{
                    height: 84,
                    p: 1.25,
                    borderRadius: '10px',
                    border: '1.5px solid',
                    borderColor: type === item.id ? item.border : 'divider',
                    backgroundColor: type === item.id ? item.bgLight : 'background.paper',
                    boxShadow: type === item.id ? `0 2px 8px ${item.border}20` : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    gap: 0.5,
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box',
                    '&:hover': {
                      borderColor: item.border,
                      backgroundColor: item.bgLight,
                    },
                  }}
                >
                  {item.icon}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: type === item.id ? 700 : 600,
                      fontSize: '0.8125rem',
                      color: 'text.primary',
                      lineHeight: 1.2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.label}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Module & Priority */}
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            size="small"
            label="Модуль системы"
            value={module}
            onChange={(e) => setModule(e.target.value as FeedbackModule)}
          >
            {Object.entries(FEEDBACK_MODULE_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            size="small"
            label="Приоритет / Критичность"
            value={priority}
            onChange={(e) => setPriority(e.target.value as FeedbackPriority)}
          >
            {Object.entries(FEEDBACK_PRIORITY_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StatusBadge status={k} label={v.label} size="small" />
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Title */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            size="small"
            label="Тема обращения"
            placeholder="Кратко сформулируйте суть проблемы или идеи..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Grid>

        {/* Description */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            multiline
            minRows={4}
            label="Подробное описание"
            placeholder="Опишите подробности, последовательность действий для воспроизведения или ожидаемый результат..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            helperText="💡 Подсказка: вы можете вставить скриншот прямо сюда комбинацией клавиш Ctrl+V"
          />
        </Grid>

        {/* Attachments / Dropzone */}
        <Grid item xs={12}>
          <Box
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: '2px dashed',
              borderColor: 'grey.300',
              borderRadius: '12px',
              p: 2,
              textAlign: 'center',
              backgroundColor: 'background.default',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              '&:hover': { borderColor: 'primary.main', backgroundColor: 'info.light' },
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.log,.zip"
            />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, color: 'primary.main', mb: 0.5 }}>
              <CloudUploadOutlinedIcon />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Прикрепить файлы или скриншоты
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Нажмите для выбора файлов или вставьте скриншот из буфера (Ctrl+V)
            </Typography>
          </Box>

          {/* Attached Files List */}
          {files.length > 0 && (
            <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {files.map((file, idx) => (
                <Chip
                  key={idx}
                  icon={file.type.startsWith('image/') ? <ContentPasteIcon sx={{ fontSize: 16 }} /> : <AttachFileIcon sx={{ fontSize: 16 }} />}
                  label={`${file.name} (${formatBytes(file.size)})`}
                  onDelete={() => handleRemoveFile(idx)}
                  deleteIcon={<DeleteOutlineIcon />}
                  sx={{
                    borderRadius: '8px',
                    backgroundColor: 'grey.100',
                    fontWeight: 500,
                  }}
                />
              ))}
            </Box>
          )}
        </Grid>

        {/* Context Telemetry Preview */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: '10px',
              backgroundColor: 'background.default',
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinkIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                Страница: <strong>{pageUrl || '/'}</strong>
              </Typography>
            </Box>

            {browserInfo && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DevicesIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  Экран: {browserInfo.screenResolution}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default FeedbackNewTicketTab;

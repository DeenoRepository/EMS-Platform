'use client';

import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { formatBytes } from '@ems/shared';

export interface FileUploadDropzoneProps {
  accept?: string;
  maxSizeMb?: number;
  multiple?: boolean;
  files?: File[];
  onChange?: (files: File[]) => void;
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
  title?: string;
  description?: string;
  compact?: boolean;
  error?: string;
  className?: string;
}

export function FileUploadDropzone({
  accept = '.pdf,.png,.jpg,.jpeg,.xlsx,.xls,.doc,.docx',
  maxSizeMb = 15,
  multiple = false,
  files = [],
  onChange,
  onFileSelect,
  disabled = false,
  title = 'Перетащите файлы сюда или нажмите для выбора',
  description,
  compact = false,
  error: propError,
  className,
}: FileUploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  const validateAndAddFiles = (incomingFiles: FileList | File[]) => {
    setLocalError(null);
    const validList: File[] = [];

    const acceptedTypes = accept
      .split(',')
      .map((t) => t.trim().toLowerCase());

    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];

      // Check size
      if (file.size > maxSizeBytes) {
        setLocalError(`Файл «${file.name}» превышает лимит ${maxSizeMb} МБ (${formatBytes(file.size)})`);
        return;
      }

      // Check extension if accept is specified
      if (accept && accept !== '*') {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        const mime = file.type.toLowerCase();
        const isExtValid = acceptedTypes.some((t) => t === ext || (t.includes('/') && mime.includes(t)));

        if (!isExtValid) {
          setLocalError(`Формат файла «${file.name}» не поддерживается. Разрешены: ${accept}`);
          return;
        }
      }

      validList.push(file);
      if (!multiple) break;
    }

    if (validList.length > 0) {
      if (onFileSelect) {
        onFileSelect(validList[0]);
      }
      if (onChange) {
        onChange(multiple ? [...files, ...validList] : validList);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
    // Reset input value so the same file can be selected again
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    if (onChange) {
      const updated = files.filter((_, idx) => idx !== index);
      onChange(updated);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <PictureAsPdfIcon color="error" />;
    if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext || '')) return <ImageIcon color="primary" />;
    return <InsertDriveFileIcon color="action" />;
  };

  const displayError = propError || localError;

  return (
    <Box className={className} sx={{ width: '100%' }}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      <Paper
        elevation={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        sx={{
          p: compact ? 2 : { xs: 2.5, sm: 3.5 },
          textAlign: 'center',
          borderRadius: '12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderStyle: 'dashed',
          borderWidth: 2,
          borderColor: isDragActive ? '#0284c7' : displayError ? '#dc2626' : '#cbd5e1',
          bgcolor: isDragActive ? 'rgba(2, 132, 199, 0.04)' : '#ffffff',
          transition: 'all 0.2s ease',
          opacity: disabled ? 0.6 : 1,
          '&:hover': {
            borderColor: disabled ? '#cbd5e1' : '#0284c7',
            bgcolor: disabled ? '#ffffff' : '#f8fafc',
          },
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: compact ? 40 : 50,
            height: compact ? 40 : 50,
            borderRadius: '50%',
            bgcolor: isDragActive ? 'rgba(2, 132, 199, 0.12)' : '#f1f5f9',
            color: isDragActive ? '#0284c7' : '#64748b',
            mb: compact ? 1 : 1.25,
          }}
        >
          <CloudUploadIcon sx={{ fontSize: compact ? 22 : 26 }} />
        </Box>

        <Typography
          variant="body2"
          fontWeight={600}
          color="#0f172a"
          sx={{ mb: 0.5, fontSize: compact ? '0.8125rem' : '0.875rem' }}
        >
          {title}
        </Typography>

        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }} display="block">
          {description || `Поддерживаемые форматы: ${accept.replace(/\./g, '').toUpperCase()} (до ${maxSizeMb} МБ)`}
        </Typography>

        <Button
          variant="outlined"
          size="small"
          disabled={disabled}
          sx={{
            mt: compact ? 1 : 1.75,
            pointerEvents: 'none',
            fontWeight: 600,
            borderRadius: '8px',
            borderColor: '#e2e8f0',
            color: '#334155',
            backgroundColor: '#ffffff',
            px: 2,
            py: 0.5,
          }}
        >
          Выбрать файл{multiple ? 'ы' : ''} на диске
        </Button>
      </Paper>

      {displayError && (
        <Alert severity="error" sx={{ mt: 1.5, borderRadius: '8px', fontSize: '0.8125rem' }}>
          {displayError}
        </Alert>
      )}

      {files.length > 0 && (
        <List dense sx={{ mt: 1.5, bgcolor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          {files.map((file, idx) => (
            <ListItem
              key={idx}
              sx={{ py: 1 }}
              secondaryAction={
                !disabled && (
                  <IconButton
                    edge="end"
                    aria-label="Удалить файл"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(idx);
                    }}
                    sx={{ color: '#94a3b8', '&:hover': { color: '#dc2626' } }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )
              }
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{getFileIcon(file.name)}</ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={600} color="#0f172a" noWrap sx={{ fontSize: '0.8125rem' }}>
                    {file.name}
                  </Typography>
                }
                secondary={
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                    <Typography component="span" variant="caption" sx={{ color: '#64748b', fontSize: '0.6875rem' }}>
                      {formatBytes(file.size)}
                    </Typography>
                    <Chip
                      label="Готов к отправке"
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        backgroundColor: '#ecfdf5',
                        color: '#15803d',
                        borderRadius: '4px',
                      }}
                    />
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

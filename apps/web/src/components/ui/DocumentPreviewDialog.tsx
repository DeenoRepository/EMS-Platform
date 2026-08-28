'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Button,
  Typography,
  Box,
  Tooltip,
  ButtonGroup,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import QrCode2Icon from '@mui/icons-material/QrCode2';

export interface DocumentPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fileUrl?: string;
  fileType?: 'image' | 'pdf' | 'qr' | 'other';
  qrValue?: string;
  downloadName?: string;
  onPrint?: () => void;
  className?: string;
}

export function DocumentPreviewDialog({
  open,
  onClose,
  title,
  subtitle,
  fileUrl,
  fileType = 'image',
  qrValue,
  downloadName,
  onPrint,
  className,
}: DocumentPreviewDialogProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleZoomIn = () => setZoom((prev) => Math.min(300, prev + 25));
  const handleZoomOut = () => setZoom((prev) => Math.max(25, prev - 25));
  const handleResetZoom = () => {
    setZoom(100);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleDownload = () => {
    if (!fileUrl) return;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = downloadName || title || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isFullScreen}
      className={className}
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(6px)',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
          },
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: isFullScreen ? 0 : '16px',
          overflow: 'hidden',
          backgroundColor: 'grey.900',
          color: 'common.white',
          height: isFullScreen ? '100vh' : '82vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        },
      }}
    >
      {/* Header Toolbar */}
      <DialogTitle
        sx={{
          m: 0,
          px: { xs: 2, sm: 3 },
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          bgcolor: 'grey.800',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '8px',
              bgcolor: 'primary.dark',
              color: 'primary.light',
            }}
          >
            {fileType === 'qr' ? <QrCode2Icon fontSize="small" /> : <DescriptionOutlinedIcon fontSize="small" />}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} color="grey.50" noWrap sx={{ fontSize: '0.9375rem' }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="grey.400" noWrap sx={{ display: 'block', fontSize: '0.75rem' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Action Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {fileType === 'image' && (
            <ButtonGroup size="small" variant="outlined" sx={{ '& button': { borderColor: 'rgba(255,255,255,0.15)', color: 'grey.300' } }}>
              <Tooltip title="Увеличить (+)">
                <IconButton size="small" onClick={handleZoomIn} sx={{ color: 'grey.300' }}>
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Сбросить масштаб">
                <Button onClick={handleResetZoom} sx={{ fontSize: '0.75rem', px: 1, py: 0.2, color: 'grey.300' }}>
                  {zoom}%
                </Button>
              </Tooltip>
              <Tooltip title="Уменьшить (-)">
                <IconButton size="small" onClick={handleZoomOut} sx={{ color: 'grey.300' }}>
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Повернуть на 90°">
                <IconButton size="small" onClick={handleRotate} sx={{ color: 'grey.300' }}>
                  <RotateRightIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </ButtonGroup>
          )}

          <Tooltip title={isFullScreen ? 'Свернуть' : 'На весь экран'}>
            <IconButton size="small" onClick={() => setIsFullScreen((prev) => !prev)} sx={{ color: 'grey.300' }}>
              {isFullScreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {fileUrl && (
            <Tooltip title="Скачать файл">
              <IconButton size="small" onClick={handleDownload} sx={{ color: 'primary.light' }}>
                <DownloadOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Распечатать">
            <IconButton size="small" onClick={handlePrint} sx={{ color: 'grey.300' }}>
              <PrintOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <IconButton size="small" onClick={onClose} sx={{ color: 'grey.400', '&:hover': { color: 'common.white' } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Viewer Canvas */}
      <DialogContent
        sx={{
          p: 0,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          backgroundColor: 'grey.900',
        }}
      >
        {fileType === 'image' && fileUrl ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              transition: 'transform 0.15s ease',
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl}
              alt={title}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                borderRadius: '8px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                objectFit: 'contain',
              }}
            />
          </Box>
        ) : fileType === 'qr' ? (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              backgroundColor: 'background.paper',
              borderRadius: '16px',
              color: 'text.primary',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            }}
          >
            <Box
              sx={{
                width: 220,
                height: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: '12px',
                mb: 2,
                mx: 'auto',
              }}
            >
              <QrCode2Icon sx={{ fontSize: 160, color: 'text.primary' }} />
            </Box>
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem', mb: 0.5, color: 'text.primary' }}>
              {title}
            </Typography>
            <Chip
              label={qrValue || 'QR-CODE-VAL'}
              size="small"
              sx={{ fontFamily: 'monospace', fontWeight: 600, bgcolor: 'action.hover' }}
            />
          </Box>
        ) : fileType === 'pdf' && fileUrl ? (
          <iframe
            src={fileUrl}
            title={title}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
          />
        ) : (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <DescriptionOutlinedIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 1.5 }} />
            <Typography variant="body1" color="text.disabled" fontWeight={500}>
              Предпросмотр недоступен
            </Typography>
            {fileUrl && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<DownloadOutlinedIcon />}
                onClick={handleDownload}
                sx={{ mt: 2, borderRadius: '8px' }}
              >
                Скачать файл
              </Button>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default DocumentPreviewDialog;

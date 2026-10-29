'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Box, CircularProgress, Typography } from '@mui/material';

export interface QrCodeViewProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  className?: string;
  sx?: any;
}

export function QrCodeView({
  value,
  size = 128,
  level = 'M',
  className,
  sx,
}: QrCodeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    setIsGenerating(true);
    setError(null);

    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 1,
        errorCorrectionLevel: level,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      },
      (err) => {
        setIsGenerating(false);
        if (err) {
          console.error('Failed to generate QR Code:', err);
          setError('Ошибка генерации QR');
        }
      }
    );
  }, [value, size, level]);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: size,
        height: size,
        ...sx,
      }}
      className={className}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          borderRadius: 4,
          display: error ? 'none' : 'block',
        }}
      />
      {isGenerating && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.7)',
          }}
        >
          <CircularProgress size={20} />
        </Box>
      )}
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Box>
  );
}

/**
 * Вспомогательная функция для генерации base64 DataURL QR-кода (например, для бланков печати HTML)
 */
export async function getQrDataUrl(value: string, size = 160): Promise<string> {
  try {
    return await QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Ошибка создания DataURL QR-кода:', err);
    return '';
  }
}

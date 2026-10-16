'use client';

import React from 'react';
import {
  TableRow,
  TableCell,
  Typography,
  Chip,
  IconButton,
  Box,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { StatusBadge } from '@/components/ui';
import { formatDate, formatBytes } from '@ems/shared';
import { DocumentItem } from './types';

const FONT_SEMI_BOLD = 600;

interface DocumentTableRowProps {
  doc: DocumentItem;
  visibleColumns: string[];
  canDelete: boolean;
  onPreview: (url: string) => void;
  onDelete: (doc: DocumentItem) => void;
  onNavigateToEquipment: (id: string) => void;
}

export function DocumentTableRow({
  doc,
  visibleColumns,
  canDelete,
  onPreview,
  onDelete,
  onNavigateToEquipment,
}: DocumentTableRowProps) {
  const isPdfOrImg = doc.fileType?.includes('pdf') || doc.fileType?.includes('image');
  const fileUrl = `/api/files/${doc.fileName}`;

  return (
    <TableRow hover>
      {visibleColumns.includes('originalName') && (
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: FONT_SEMI_BOLD, color: 'text.primary' }}>
            {doc.originalName}
          </Typography>
          {doc.description && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
              {doc.description}
            </Typography>
          )}
        </TableCell>
      )}

      {visibleColumns.includes('docType') && (
        <TableCell>
          <StatusBadge status={doc.docType} />
        </TableCell>
      )}

      {visibleColumns.includes('equipment') && (
        <TableCell>
          {doc.equipment ? (
            <Chip
              icon={<PrecisionManufacturingIcon sx={{ fontSize: '13px !important' }} />}
              label={doc.equipment.name}
              size="small"
              clickable
              onClick={() => onNavigateToEquipment(doc.equipment.id)}
              sx={{
                fontSize: '0.75rem',
                fontWeight: 500,
                borderRadius: '4px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            />
          ) : (
            <Typography variant="caption" color="text.disabled">—</Typography>
          )}
        </TableCell>
      )}

      {visibleColumns.includes('model') && (
        <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
          {doc.equipment?.model || '—'}
        </TableCell>
      )}

      {visibleColumns.includes('location') && (
        <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
          {doc.equipment?.location || '—'}
        </TableCell>
      )}

      {visibleColumns.includes('fileSize') && (
        <TableCell sx={{ fontSize: '0.8125rem', fontFeatureSettings: '"tnum"' }}>
          {formatBytes(doc.fileSize)}
        </TableCell>
      )}

      {visibleColumns.includes('uploadedBy') && (
        <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
          {doc.uploadedBy?.displayName || '—'}
        </TableCell>
      )}

      {visibleColumns.includes('createdAt') && (
        <TableCell sx={{ fontSize: '0.8125rem', fontFeatureSettings: '"tnum"', color: 'text.secondary' }}>
          {formatDate(doc.createdAt)}
        </TableCell>
      )}

      {visibleColumns.includes('actions') && (
        <TableCell align="right">
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            {isPdfOrImg && (
              <IconButton
                size="small"
                color="primary"
                onClick={() => onPreview(fileUrl)}
                title="Предпросмотр"
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            )}
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
                onClick={() => onDelete(doc)}
                title="Удалить"
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </TableCell>
      )}
    </TableRow>
  );
}

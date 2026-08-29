'use client';

import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Paper,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { DOCUMENT_TYPE_MAP, formatDate, formatBytes } from '@ems/shared';
import { StatusBadge } from '@/components/ui';

export interface DocumentItem {
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

interface DocumentArchiveTableViewProps {
  items: DocumentItem[];
  visibleColumns: string[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onRequestSort: (field: string) => void;
  canEdit: boolean;
  onNavigateToEquipment: (equipmentId: string) => void;
  onDeleteDocument: (doc: { id: string; name: string }) => void;
}

export function DocumentArchiveTableView({
  items,
  visibleColumns,
  sortField,
  sortDirection,
  onRequestSort,
  canEdit,
  onNavigateToEquipment,
  onDeleteDocument,
}: DocumentArchiveTableViewProps) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ backgroundColor: 'background.paper' }}>
          {visibleColumns.includes('name') && (
            <TableCell sx={{ minWidth: 200 }}>
              <TableSortLabel
                active={sortField === 'name'}
                direction={sortField === 'name' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('name')}
              >
                Имя файла
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('equipment') && (
            <TableCell sx={{ minWidth: 180 }}>
              <TableSortLabel
                active={sortField === 'equipment'}
                direction={sortField === 'equipment' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('equipment')}
              >
                Оборудование
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('docType') && (
            <TableCell sx={{ minWidth: 160 }}>
              <TableSortLabel
                active={sortField === 'docType'}
                direction={sortField === 'docType' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('docType')}
              >
                Тип документа
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('description') && (
            <TableCell sx={{ minWidth: 160 }}>
              <TableSortLabel
                active={sortField === 'description'}
                direction={sortField === 'description' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('description')}
              >
                Описание
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('size') && (
            <TableCell sx={{ minWidth: 110 }}>
              <TableSortLabel
                active={sortField === 'size'}
                direction={sortField === 'size' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('size')}
              >
                Размер
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('uploadedBy') && (
            <TableCell sx={{ minWidth: 140 }}>
              <TableSortLabel
                active={sortField === 'uploadedBy'}
                direction={sortField === 'uploadedBy' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('uploadedBy')}
              >
                Загрузил
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('date') && (
            <TableCell sx={{ minWidth: 120 }}>
              <TableSortLabel
                active={sortField === 'date'}
                direction={sortField === 'date' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('date')}
              >
                Дата
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('actions') && (
            <TableCell align="right" sx={{ minWidth: 100 }}>
              Действия
            </TableCell>
          )}
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((doc) => (
          <TableRow key={doc.id} hover>
            {visibleColumns.includes('name') && (
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DescriptionOutlinedIcon color="primary" sx={{ fontSize: 18 }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.8125rem' }}>
                      {doc.originalName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Версия {doc.version}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
            )}

            {visibleColumns.includes('equipment') && (
              <TableCell>
                {doc.equipment ? (
                  <Box
                    onClick={() => onNavigateToEquipment(doc.equipment.id)}
                    sx={{
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 0.35,
                      '&:hover .equipment-name': { color: 'primary.main', textDecoration: 'underline' },
                    }}
                  >
                    <Typography
                      className="equipment-name"
                      variant="body2"
                      fontWeight={600}
                      sx={{ fontSize: '0.8125rem', color: 'text.primary', lineHeight: 1.35 }}
                    >
                      {doc.equipment.name}
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        px: 0.75,
                        py: 0.1,
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        bgcolor: 'background.default',
                        fontSize: '0.6875rem',
                        borderRadius: '4px',
                        color: 'text.secondary',
                        borderColor: 'grey.400',
                        lineHeight: 1.3,
                      }}
                    >
                      {doc.equipment.inventoryNumber || 'Б/Н'}
                    </Paper>
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Общий документ
                  </Typography>
                )}
              </TableCell>
            )}

            {visibleColumns.includes('docType') && (
              <TableCell>
                <StatusBadge
                  status={doc.docType}
                  label={DOCUMENT_TYPE_MAP[doc.docType] || doc.docType}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
            )}

            {visibleColumns.includes('description') && (
              <TableCell sx={{ fontSize: '0.8125rem', color: doc.description ? 'inherit' : 'text.secondary' }}>
                {doc.description || '—'}
              </TableCell>
            )}

            {visibleColumns.includes('size') && (
              <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                {formatBytes(doc.fileSize)}
              </TableCell>
            )}

            {visibleColumns.includes('uploadedBy') && (
              <TableCell sx={{ fontSize: '0.8125rem' }}>
                {doc.uploadedBy?.displayName || 'Система'}
              </TableCell>
            )}

            {visibleColumns.includes('date') && (
              <TableCell sx={{ fontSize: '0.8125rem' }}>
                {formatDate(doc.createdAt)}
              </TableCell>
            )}

            {visibleColumns.includes('actions') && (
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
                        onClick={() => onDeleteDocument({ id: doc.id, name: doc.originalName })}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

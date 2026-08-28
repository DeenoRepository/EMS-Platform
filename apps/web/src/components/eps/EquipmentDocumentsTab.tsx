'use client';

import React from 'react';
import { Box, Button, Card, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { DOCUMENT_TYPE_MAP, formatBytes, formatDate } from '@ems/shared';
import { DataTableWrapper, EmptyState, StatusBadge } from '@/components/ui';
import type { EquipmentDetails } from '@/app/eps/[id]/page';

interface EquipmentDocumentsTabProps {
  activeTab: number;
  documents: EquipmentDetails['documents'];
  canUpload: boolean;
  canDelete: boolean;
  onUpload: () => void;
  onDelete: (documentId: string) => void;
}

export function EquipmentDocumentsTab({
  activeTab,
  documents,
  canUpload,
  canDelete,
  onUpload,
  onDelete,
}: EquipmentDocumentsTabProps) {
  if (activeTab !== 1) return null;

  return (
    <Card sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          Документация и чертежи ({documents.length})
        </Typography>
        {canUpload && (
          <Button
            variant="contained"
            startIcon={<UploadFileIcon />}
            onClick={onUpload}
            sx={{
              height: 38,
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'none',
              px: 2.25,
              boxSizing: 'border-box',
              backgroundColor: 'primary.main',
              '&:hover': { backgroundColor: 'primary.dark' },
            }}
          >
            Прикрепить документ
          </Button>
        )}
      </Box>

      {documents.length === 0 ? (
        <EmptyState
          title="Документы не загружены"
          description="В паспорте оборудования пока нет прикрепленных руководств, чертежей и сертификатов."
          actionText={canDelete ? 'Прикрепить документ' : undefined}
          onAction={canDelete ? onUpload : undefined}
          minHeight={180}
        />
      ) : (
        <DataTableWrapper>
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
              {documents.map((doc) => (
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
                    <StatusBadge
                      status={doc.docType}
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
                    {canDelete && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDelete(doc.id)}
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
        </DataTableWrapper>
      )}
    </Card>
  );
}

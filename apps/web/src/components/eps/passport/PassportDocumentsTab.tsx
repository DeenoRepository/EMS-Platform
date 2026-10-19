'use client';

import React from 'react';
import {
  Card,
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { StatusBadge, EmptyState, DataTableWrapper } from '@/components/ui';
import { formatDate } from '@ems/shared';
import { EquipmentDocument } from './types';

const FONT_SEMI_BOLD = 600;

interface PassportDocumentsTabProps {
  documents: EquipmentDocument[];
  equipmentModel?: string | null;
  canUpload: boolean;
  canDelete: boolean;
  onOpenUploadModal: () => void;
  onPreview: (url: string) => void;
  onDeleteDoc: (doc: EquipmentDocument) => void;
}

export function PassportDocumentsTab({
  documents,
  equipmentModel,
  canUpload,
  canDelete,
  onOpenUploadModal,
  onPreview,
  onDeleteDoc,
}: PassportDocumentsTabProps) {
  return (
    <Card sx={{ p: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          Документация и чертежи ({documents.length})
        </Typography>
        {canUpload && (
          <Button
            variant="contained"
            size="small"
            startIcon={<UploadFileIcon />}
            onClick={onOpenUploadModal}
            sx={{
              height: 38,
              borderRadius: '8px',
              fontWeight: FONT_SEMI_BOLD,
              fontSize: '0.8125rem',
              textTransform: 'none',
              px: 2,
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
          actionText={canUpload ? 'Прикрепить документ' : undefined}
          onAction={canUpload ? onOpenUploadModal : undefined}
          minHeight={180}
        />
      ) : (
        <DataTableWrapper total={documents.length}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Имя файла</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Тип документа</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Модель</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Описание</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Размер</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Загрузил</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Дата</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc) => {
                const isPdfOrImg = doc.fileType?.includes('pdf') || doc.fileType?.includes('image');
                const targetPath = doc.filePath ? (doc.filePath.startsWith('/') ? doc.filePath.slice(1) : doc.filePath) : doc.fileName;
                const fileUrl = `/api/files/${targetPath.split('/').map(encodeURIComponent).join('/')}`;

                return (
                  <TableRow key={doc.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={FONT_SEMI_BOLD}>
                        {doc.originalName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={doc.docType} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {equipmentModel || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {doc.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFeatureSettings: '"tnum"' }}>
                        {(doc.fileSize / 1024 / 1024).toFixed(2)} МБ
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {doc.uploadedBy?.displayName || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFeatureSettings: '"tnum"' }}>
                        {formatDate(doc.createdAt)}
                      </Typography>
                    </TableCell>
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
                            onClick={() => onDeleteDoc(doc)}
                            title="Удалить"
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableWrapper>
      )}
    </Card>
  );
}

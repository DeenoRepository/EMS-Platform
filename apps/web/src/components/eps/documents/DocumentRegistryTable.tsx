'use client';

import React from 'react';
import { Table, TableBody } from '@mui/material';
import { EmptyState } from '@/components/ui';
import { DocumentItem } from './types';
import { DocumentTableHead } from './DocumentTableHead';
import { DocumentTableRow } from './DocumentTableRow';

interface DocumentRegistryTableProps {
  items: DocumentItem[];
  visibleColumns: string[];
  canDelete: boolean;
  loading: boolean;
  onPreview: (url: string) => void;
  onDelete: (doc: DocumentItem) => void;
  onNavigateToEquipment: (id: string) => void;
  onResetFilters: () => void;
  hasFilters: boolean;
}

export function DocumentRegistryTable({
  items,
  visibleColumns,
  canDelete,
  loading,
  onPreview,
  onDelete,
  onNavigateToEquipment,
  onResetFilters,
  hasFilters,
}: DocumentRegistryTableProps) {
  if (items.length === 0 && !loading) {
    return (
      <EmptyState
        title="Документы не найдены"
        description={
          hasFilters
            ? 'По заданным параметрам поиска документация не найдена.'
            : 'В архив еще не загружены документы и схемы оборудования.'
        }
        actionText={hasFilters ? 'Сбросить фильтры' : undefined}
        onAction={hasFilters ? onResetFilters : undefined}
      />
    );
  }

  return (
    <Table size="small" aria-label="Архив технической документации">
      <DocumentTableHead visibleColumns={visibleColumns} />
      <TableBody>
        {items.map((doc) => (
          <DocumentTableRow
            key={doc.id}
            doc={doc}
            visibleColumns={visibleColumns}
            canDelete={canDelete}
            onPreview={onPreview}
            onDelete={onDelete}
            onNavigateToEquipment={onNavigateToEquipment}
          />
        ))}
      </TableBody>
    </Table>
  );
}

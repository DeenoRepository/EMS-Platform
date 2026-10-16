'use client';

import React from 'react';
import { TableHead, TableRow, TableCell } from '@mui/material';

const COL_WIDTH_NAME = 220;
const COL_WIDTH_TYPE = 160;
const COL_WIDTH_EQUIP = 200;
const COL_WIDTH_MODEL = 140;
const COL_WIDTH_LOC = 140;
const COL_WIDTH_SIZE = 100;
const COL_WIDTH_USER = 140;
const COL_WIDTH_DATE = 130;
const COL_WIDTH_ACTIONS = 120;

export function DocumentTableHead({ visibleColumns }: { visibleColumns: string[] }) {
  return (
    <TableHead sx={{ bgcolor: 'background.default' }}>
      <TableRow>
        {visibleColumns.includes('originalName') && (
          <TableCell sx={{ fontWeight: 700, minWidth: COL_WIDTH_NAME }}>Наименование файла</TableCell>
        )}
        {visibleColumns.includes('docType') && (
          <TableCell sx={{ fontWeight: 700, minWidth: COL_WIDTH_TYPE }}>Тип документации</TableCell>
        )}
        {visibleColumns.includes('equipment') && (
          <TableCell sx={{ fontWeight: 700, minWidth: COL_WIDTH_EQUIP }}>Оборудование</TableCell>
        )}
        {visibleColumns.includes('model') && (
          <TableCell sx={{ fontWeight: 700, minWidth: COL_WIDTH_MODEL }}>Модель</TableCell>
        )}
        {visibleColumns.includes('location') && (
          <TableCell sx={{ fontWeight: 700, minWidth: COL_WIDTH_LOC }}>Локация</TableCell>
        )}
        {visibleColumns.includes('fileSize') && (
          <TableCell sx={{ fontWeight: 700, minWidth: COL_WIDTH_SIZE }}>Размер</TableCell>
        )}
        {visibleColumns.includes('uploadedBy') && (
          <TableCell sx={{ fontWeight: 700, minWidth: COL_WIDTH_USER }}>Загрузил</TableCell>
        )}
        {visibleColumns.includes('createdAt') && (
          <TableCell sx={{ fontWeight: 700, minWidth: COL_WIDTH_DATE }}>Дата прикрепления</TableCell>
        )}
        {visibleColumns.includes('actions') && (
          <TableCell align="right" sx={{ fontWeight: 700, minWidth: COL_WIDTH_ACTIONS }}>Действия</TableCell>
        )}
      </TableRow>
    </TableHead>
  );
}

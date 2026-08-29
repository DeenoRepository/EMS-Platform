'use client';

import React from 'react';
import { Box, Card, Chip, Divider, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { DataTableWrapper, EmptyState, StatusBadge } from '@/components/ui';
import type { EquipmentDetails } from '@/app/eps/[id]/page';

interface EquipmentSparePartsTabProps {
  equipment: EquipmentDetails;
}

export function EquipmentSparePartsTab({ equipment }: EquipmentSparePartsTabProps) {
  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Комплектующие, запасные части и ЗИП
      </Typography>
      <Typography variant="caption" color="text.secondary" paragraph>
        Номенклатурные позиции склада WMS, привязанные к обслуживанию и ремонту данной единицы оборудования
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {equipment.spareParts.length === 0 ? (
        <EmptyState
          title="Нет привязанных комплектующих и ЗИП"
          description="В номенклатурном справочнике склада еще нет позиций, сопоставленных с данным типом оборудования."
          minHeight={180}
        />
      ) : (
        <DataTableWrapper>
          <Table>
            <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Артикул</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Наименование номенклатуры</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Ед. изм.</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Остатки на складах</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {equipment.spareParts.map(({ nomenclature: nom }) => (
                <TableRow key={nom.id} hover>
                  <TableCell>
                    <Chip label={nom.article || 'Б/А'} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{nom.name}</TableCell>
                  <TableCell>{nom.unit}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {nom.stockItems.map((si, idx) => (
                        <StatusBadge
                          key={idx}
                          status={Number(si.quantity) > 0 ? 'NORMAL_STOCK' : 'OUT_OF_STOCK'}
                          label={`${si.warehouse.name}: ${si.quantity} ${nom.unit}`}
                          size="small"
                          variant="subtle"
                        />
                      ))}
                    </Box>
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

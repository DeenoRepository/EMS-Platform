'use client';

import React from 'react';
import { Box, Card, Divider, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { formatDate } from '@ems/shared';
import { DataTableWrapper, EmptyState, StatusBadge } from '@/components/ui';
import type { EquipmentDetails } from '@/app/eps/[id]/page';

interface EquipmentMaintenanceTabProps {
  equipment: EquipmentDetails;
}

export function EquipmentMaintenanceTab({ equipment }: EquipmentMaintenanceTabProps) {
  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        График регламентного обслуживания и ППР (ТОиР)
      </Typography>
      <Typography variant="caption" color="text.secondary" paragraph>
        Планы периодического ТО, графики ППР и перечень технологических операций
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {equipment.maintenancePlans.length === 0 ? (
        <EmptyState
          title="Планы регламентного ТО не назначены"
          description="Для данного оборудования еще не сформированы регламентные карты и графики периодического обслуживания."
          minHeight={180}
        />
      ) : (
        equipment.maintenancePlans.map((plan) => (
          <Box key={plan.id} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 1 }}>
              {plan.name} ({plan.frequency})
            </Typography>
            <DataTableWrapper>
              <Table size="small">
                <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Задача</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Дата по графику</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Статус</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plan.schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell sx={{ fontWeight: 500 }}>{schedule.title}</TableCell>
                      <TableCell>{formatDate(schedule.scheduledDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={schedule.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableWrapper>
          </Box>
        ))
      )}
    </Card>
  );
}

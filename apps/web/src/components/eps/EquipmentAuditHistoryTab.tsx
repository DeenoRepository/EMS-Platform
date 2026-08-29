'use client';

import React from 'react';
import { Box, Card, Divider, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { formatDateTime } from '@ems/shared';
import { DataTableWrapper, EmptyState, LifecycleTimeline, PageLoading, StatusBadge, type LifecycleEvent } from '@/components/ui';

export type EquipmentAuditLog = Record<string, unknown> & {
  id: string;
  createdAt: string;
  user?: { displayName?: string | null } | null;
  action: string;
  changes: unknown;
};

interface EquipmentAuditHistoryTabProps {
  lifecycleEvents: LifecycleEvent[];
  auditLogs: EquipmentAuditLog[];
  loadingAudit: boolean;
}

export function EquipmentAuditHistoryTab({ lifecycleEvents, auditLogs, loadingAudit }: EquipmentAuditHistoryTabProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <LifecycleTimeline
        events={lifecycleEvents}
        title="Хронология полного жизненного цикла актива"
        loading={loadingAudit}
      />

      <Card sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: '1rem' }}>
          Системный журнал аудита изменений данных
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {loadingAudit ? (
          <PageLoading text="Загрузка журнала аудита изменений..." minHeight={180} />
        ) : auditLogs.length === 0 ? (
          <EmptyState
            title="Записей аудита не найдено"
            description="История изменений для данного оборудования еще не содержит записей."
            minHeight={180}
          />
        ) : (
          <DataTableWrapper>
            <Table size="small">
              <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, width: 160 }}>Дата и время</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 180 }}>Пользователь</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 140 }}>Действие</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Детали изменений</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{log.user?.displayName || 'Система'}</TableCell>
                    <TableCell>
                      <StatusBadge status={log.action} />
                    </TableCell>
                    <TableCell>
                      <Box
                        component="pre"
                        sx={{
                          p: 1,
                          backgroundColor: 'background.default',
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          m: 0,
                          maxHeight: 120,
                          overflow: 'auto',
                        }}
                      >
                        {JSON.stringify(log.changes, null, 2)}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableWrapper>
        )}
      </Card>
    </Box>
  );
}

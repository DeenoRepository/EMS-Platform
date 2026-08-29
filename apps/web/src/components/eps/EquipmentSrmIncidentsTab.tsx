'use client';

import React from 'react';
import { Box, Button, Card, Divider, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import LaunchIcon from '@mui/icons-material/Launch';
import { formatDateTime } from '@ems/shared';
import { DataTableWrapper, EmptyState, StatusBadge } from '@/components/ui';
import type { EquipmentDetails } from '@/app/eps/[id]/page';
import { useRouter } from 'next/navigation';

interface EquipmentSrmIncidentsTabProps {
  equipment: EquipmentDetails;
  onCreateSrmRequest: () => void;
}

export function EquipmentSrmIncidentsTab({ equipment, onCreateSrmRequest }: EquipmentSrmIncidentsTabProps) {
  const router = useRouter();

  return (
    <Card sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box>
          <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 0.25 }}>
            Журнал инцидентов, дефектов и заявок на ремонт (SRM)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            История обращений, сервисных инцидентов и заявок на восстановление работоспособности
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          size="small"
          onClick={onCreateSrmRequest}
          sx={{ fontWeight: 700, borderRadius: '8px' }}
        >
          Зафиксировать отказ / Заявка SRM
        </Button>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {!equipment.jiraIssues || equipment.jiraIssues.length === 0 ? (
        <EmptyState
          title="Зарегистрированных инцидентов и дефектов нет"
          description="В журнале сервисных заявок нет зарегистрированных инцидентов по данному оборудованию."
          minHeight={180}
        />
      ) : (
        <DataTableWrapper>
          <Table>
            <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Ключ заявки</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Тема</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Приоритет</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Статус</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Создана</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Решена</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {equipment.jiraIssues.map((issue) => (
                <TableRow key={issue.id} hover>
                  <TableCell>
                    <StatusBadge status="OPEN" label={issue.issueKey} variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{issue.summary}</TableCell>
                  <TableCell>
                    <StatusBadge status={issue.priority} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={issue.status} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>{formatDateTime(issue.createdDate)}</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>{formatDateTime(issue.resolvedDate)}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'inline-flex', gap: 0.75 }}>
                      <Tooltip title="Создать наряд ТОиР в модуле MRO">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            const params = new URLSearchParams();
                            params.set('createSchedule', 'true');
                            params.set('equipmentId', equipment.id);
                            params.set('title', `Ремонт по инциденту ${issue.issueKey}: ${issue.summary}`);
                            params.set('notes', `Создано из журнала инцидентов SRM. Статус: ${issue.status}, приоритет: ${issue.priority}`);
                            router.push(`/mro?${params.toString()}`);
                          }}
                        >
                          <BuildCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Открыть в реестре SRM">
                        <IconButton size="small" onClick={() => router.push('/srm?tab=issues')}>
                          <LaunchIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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

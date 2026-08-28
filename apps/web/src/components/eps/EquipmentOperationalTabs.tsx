'use client';

import React from 'react';
import { Box, Button, Card, Chip, Divider, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import LaunchIcon from '@mui/icons-material/Launch';
import { formatDate, formatDateTime } from '@ems/shared';
import { DataTableWrapper, EmptyState, LifecycleTimeline, PageLoading, StatusBadge, type LifecycleEvent } from '@/components/ui';
import type { EquipmentDetails } from '@/app/eps/[id]/page';
import { useRouter } from 'next/navigation';

interface EquipmentOperationalTabsProps {
  activeTab: number;
  equipment: EquipmentDetails;
  lifecycleEvents: LifecycleEvent[];
  auditLogs: any[];
  loadingAudit: boolean;
  onCreateSrmRequest: () => void;
}

export function EquipmentOperationalTabs({
  activeTab,
  equipment,
  lifecycleEvents,
  auditLogs,
  loadingAudit,
  onCreateSrmRequest,
}: EquipmentOperationalTabsProps) {
  const router = useRouter();

  if (activeTab === 3) {
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

  if (activeTab === 4) {
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

  if (activeTab === 5) {
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

  if (activeTab === 6) {
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

  return null;
}

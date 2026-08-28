'use client';

import React from 'react';
import { Box, Button, Card, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { APPROVAL_TYPE_MAP, formatDate, formatDateTime } from '@ems/shared';
import { DataTableWrapper, EmptyState, StatusBadge } from '@/components/ui';
import type { EquipmentDetails } from '@/app/eps/[id]/page';

interface EquipmentApprovalsTabProps {
  activeTab: number;
  approvals: EquipmentDetails['approvals'];
  canCreate: boolean;
  onCreate: () => void;
}

export function EquipmentApprovalsTab({ activeTab, approvals, canCreate, onCreate }: EquipmentApprovalsTabProps) {
  if (activeTab !== 2) return null;

  return (
    <Card sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Заявки на согласование ({approvals?.length || 0})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            История и статус заявок на ввод в эксплуатацию, списание и изменение характеристик
          </Typography>
        </Box>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
            Создать заявку
          </Button>
        )}
      </Box>

      {!approvals || approvals.length === 0 ? (
        <EmptyState
          title="Заявок на согласование нет"
          description="По данному оборудованию еще не зарегистрировано заявок на списание, вывод из эксплуатации или модернизацию."
          actionText={canCreate ? 'Создать заявку' : undefined}
          onAction={canCreate ? onCreate : undefined}
          minHeight={180}
        />
      ) : (
        <DataTableWrapper>
          <Table>
            <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Тема заявки</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Тип согласования</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Статус</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Инициатор</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Дата создания</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Решение / Согласующий</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {approvals.map((approval) => (
                  <TableRow key={approval.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {approval.title}
                      </Typography>
                      {approval.description && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {approval.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={approval.type}
                        label={APPROVAL_TYPE_MAP[approval.type] || approval.type}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={approval.status}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                      {approval.requester.displayName}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                      {formatDateTime(approval.createdAt)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                      {approval.reviewer ? (
                        <Box>
                          <Typography variant="caption" fontWeight={600} display="block">
                            {approval.reviewer.displayName} ({formatDate(approval.reviewedAt)})
                          </Typography>
                          {approval.resolutionComment && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              «{approval.resolutionComment}»
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          На рассмотрении
                        </Typography>
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

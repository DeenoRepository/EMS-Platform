'use client';

import React from 'react';
import {
  Box,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DataTableWrapper, EmptyState, StatusBadge } from '@/components/ui';
import { formatDateTime, formatDate, APPROVAL_TYPE_MAP } from '@ems/shared';

interface ApprovalItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  createdAt: string;
  reviewedAt?: string | null;
  resolutionComment?: string | null;
  requester: { displayName: string };
  reviewer?: { displayName: string } | null;
}

interface PassportApprovalsTabProps {
  approvals: ApprovalItem[];
  canEdit: boolean;
  onCreateApproval: () => void;
}

export const PassportApprovalsTab: React.FC<PassportApprovalsTabProps> = ({
  approvals,
  canEdit,
  onCreateApproval,
}) => {
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
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateApproval}
          >
            Создать заявку
          </Button>
        )}
      </Box>

      {(!approvals || approvals.length === 0) ? (
        <EmptyState
          title="Заявок на согласование нет"
          description="По данному оборудованию еще не зарегистрировано заявок на списание, вывод из эксплуатации или модернизацию."
          actionText={canEdit ? 'Создать заявку' : undefined}
          onAction={canEdit ? onCreateApproval : undefined}
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
              {approvals.map((app) => (
                <TableRow key={app.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {app.title}
                    </Typography>
                    {app.description && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {app.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={app.type}
                      label={APPROVAL_TYPE_MAP[app.type as keyof typeof APPROVAL_TYPE_MAP] || app.type}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={app.status}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>
                    {app.requester.displayName}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>
                    {formatDateTime(app.createdAt)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>
                    {app.reviewer ? (
                      <Box>
                        <Typography variant="caption" fontWeight={600} display="block">
                          {app.reviewer.displayName} ({formatDate(app.reviewedAt)})
                        </Typography>
                        {app.resolutionComment && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            «{app.resolutionComment}»
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
};

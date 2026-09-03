'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Box,
  Card,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DataTableWrapper, EmptyState, PageLoading, StatusBadge } from '@/components/ui';
import { formatDateTime, PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import type { EquipmentDetails } from '@/app/eps/[id]/page';
import type { PrmRequestTableItem } from '@/components/prm';

interface EquipmentPrmTabProps {
  equipment: EquipmentDetails;
}

export function EquipmentPrmTab({ equipment }: EquipmentPrmTabProps) {
  const { hasPermission } = useAuth();

  const canViewPrm =
    hasPermission(PERMISSIONS.PRM_REQUESTS_VIEW) ||
    hasPermission(PERMISSIONS.PRM_REQUESTS_CREATE) ||
    hasPermission(PERMISSIONS.PRM_REQUESTS_MANAGE);
  const canCreatePrm = hasPermission(PERMISSIONS.PRM_REQUESTS_CREATE);

  const [requests, setRequests] = useState<PrmRequestTableItem[]>([]);
  const [loading, setLoading] = useState(canViewPrm);
  const [error, setError] = useState<string | null>(null);

  const fetchEquipmentRequests = useCallback(async () => {
    if (!canViewPrm) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/prm/requests?equipmentId=${encodeURIComponent(equipment.id)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setRequests(json.data.items || []);
        } else {
          setError(json.error || 'Ошибка загрузки заявок на закупку');
        }
      } else if (res.status === 403) {
        setError('У вас нет прав для просмотра заявок на закупку');
      } else {
        setError('Ошибка при загрузке заявок на закупку');
      }
    } catch {
      setError('Ошибка сети при загрузке заявок');
    } finally {
      setLoading(false);
    }
  }, [canViewPrm, equipment.id]);

  useEffect(() => {
    if (!canViewPrm) return;
    fetchEquipmentRequests();
  }, [canViewPrm, fetchEquipmentRequests]);

  if (!canViewPrm) {
    return (
      <Card sx={{ p: 3 }}>
        <EmptyState
          title="Доступ ограничен"
          description="У вас нет прав для просмотра заявок на закупку (PRM)."
          minHeight={180}
        />
      </Card>
    );
  }

  if (loading) {
    return (
      <Card sx={{ p: 3 }}>
        <PageLoading text="Загрузка связанных заявок на закупку..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ p: 3 }}>
        <EmptyState
          title="Ошибка загрузки"
          description={error}
          minHeight={180}
        />
      </Card>
    );
  }

  const createHref = `/prm?create=true&equipmentId=${encodeURIComponent(equipment.id)}`;

  return (
    <Card sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Заявки на закупку ТМЦ (PRM){!loading && !error ? ` (${requests.length})` : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Закупочные потребности, оформленные для данной технологической единицы оборудования
          </Typography>
        </Box>
        {canCreatePrm && (
          <Button
            component={Link}
            href={createHref}
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            sx={{ fontWeight: 700 }}
          >
            Создать заявку
          </Button>
        )}
      </Box>
      <Divider sx={{ mb: 2 }} />

      {requests.length === 0 ? (
        <EmptyState
          title="Нет привязанных заявок на закупку"
          description="Для данного оборудования ещё не создавались заявки на закупку ТМЦ."
          icon={<ShoppingCartOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
          minHeight={180}
        />
      ) : (
        <DataTableWrapper>
          <Table size="small">
            <TableHead sx={{ backgroundColor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, minWidth: 140 }}>№ заявки</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 160 }}>Склад назначения</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 180 }}>Позиции ТМЦ</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 110 }}>Приоритет</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 130 }}>Статус</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, minWidth: 120 }}>Сумма</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 130 }}>Дата создания</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id} hover>
                  <TableCell>
                    <Button
                      component={Link}
                      href={`/prm?requestId=${encodeURIComponent(req.id)}`}
                      size="small"
                      sx={{ p: 0, textTransform: 'none', fontFamily: 'monospace', fontWeight: 700 }}
                      endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                    >
                      {req.requestNumber}
                    </Button>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>{req.targetWarehouse.name}</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                    {req.items?.slice(0, 2).map((it) => it.nomenclature.name).join(', ')}
                    {req.items && req.items.length > 2 ? ` +${req.items.length - 2}` : ''}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={req.priority} size="small" />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={req.status} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                    {Number(req.estimatedTotal).toLocaleString('ru-RU')} {req.currency}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                    {formatDateTime(req.createdAt)}
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

export default EquipmentPrmTab;

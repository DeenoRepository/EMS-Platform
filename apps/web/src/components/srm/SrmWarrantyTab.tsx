'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  StatCard,
  DataTableWrapper,
  StatusBadge,
  FilterToolbar,
  SearchInput,
  EmptyState,
} from '@/components/ui';

export interface SrmWarrantyTabProps {
  issues: any[];
  onSelectIssue: (issue: any) => void;
}

export default function SrmWarrantyTab({ issues, onSelectIssue }: SrmWarrantyTabProps) {
  const [search, setSearch] = useState('');
  const [contractorFilter, setContractorFilter] = useState('ALL');

  // Filter only warranty claims
  const warrantyIssues = useMemo(() => {
    return issues.filter((i) => Boolean(i.warrantyClaim));
  }, [issues]);

  const filtered = useMemo(() => {
    return warrantyIssues.filter((i) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const keyMatch = i.issueKey?.toLowerCase().includes(q);
        const sumMatch = i.summary?.toLowerCase().includes(q);
        const contrMatch = i.contractorName?.toLowerCase().includes(q);
        const eqMatch = i.equipment?.name?.toLowerCase().includes(q);
        if (!keyMatch && !sumMatch && !contrMatch && !eqMatch) return false;
      }
      if (contractorFilter !== 'ALL' && i.contractorName !== contractorFilter) {
        return false;
      }
      return true;
    });
  }, [warrantyIssues, search, contractorFilter]);

  const resolvedWarrantyCount = warrantyIssues.filter((i) =>
    ['CLOSED', 'RESOLVED', 'DONE', 'Closed', 'Resolved'].includes(i.status)
  ).length;

  const inProgressWarrantyCount = warrantyIssues.length - resolvedWarrantyCount;

  return (
    <Box>
      {/* 4 Карточки KPI по гарантиям */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Гарантийных инцидентов"
            value={warrantyIssues.length}
            subtitle="Зафиксировано рекламаций"
            icon={<ShieldOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="На рассмотрении подрядчиком"
            value={inProgressWarrantyCount}
            subtitle="Требуют выезда СЦ"
            icon={<HandymanOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(217, 119, 6, 0.08)"
            iconColor="#d97706"
            accentColor="#d97706"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Успешно урегулировано"
            value={resolvedWarrantyCount}
            subtitle="Устранено по гарантии"
            icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="#16a34a"
            accentColor="#16a34a"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Уровень возмещения затрат"
            value="100%"
            subtitle="Без расходов предприятия"
            icon={<MonetizationOnOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(124, 58, 237, 0.08)"
            iconColor="#7c3aed"
            accentColor="#7c3aed"
          />
        </Grid>
      </Grid>

      {/* Панель поиска */}
      <FilterToolbar
        activeFilterCount={search.trim() ? 1 : 0}
        onResetFilters={() => setSearch('')}
        variant="standalone"
      >
        <Box sx={{ width: { xs: '100%', sm: 320 } }}>
          <SearchInput
            placeholder="Поиск по подрядчику, номеру, оборудованию..."
            value={search}
            onSearch={(val) => setSearch(val)}
          />
        </Box>
      </FilterToolbar>

      {/* Таблица рекламаций */}
      {filtered.length === 0 ? (
        <EmptyState
          paper
          icon={<ShieldOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
          title={warrantyIssues.length === 0 ? 'Гарантийные случаи отсутствуют' : 'Нет рекламаций по фильтру'}
          description={
            warrantyIssues.length === 0
              ? 'В системе не зарегистрировано инцидентов с признаком гарантийного ремонта. При подаче сервисной заявки отметьте пункт «Гарантийный случай».'
              : 'Попробуйте изменить поисковый запрос.'
          }
        />
      ) : (
        <DataTableWrapper total={filtered.length} stickyHeader>
          <Table size="small" aria-label="Реестр гарантийных инцидентов и рекламаций">
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>Ключ заявки</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Суть неисправности</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Оборудование (EPS)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Подрядчик / Сервисный центр</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }}>Статус</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }}>Дата подачи</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 100 }} align="right">
                  Действия
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((issue) => (
                <TableRow key={issue.id} hover>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main', fontFamily: 'monospace' }}>
                    {issue.issueKey}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 300 }}>
                      {issue.summary}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Приоритет: {issue.priority}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {issue.equipment ? (
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {issue.equipment.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Инв. №: {issue.equipment.inventoryNumber || '—'}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        Не привязано
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<ShieldOutlinedIcon sx={{ fontSize: 14 }} />}
                      label={issue.contractorName || 'Завод-изготовитель'}
                      color="warning"
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={issue.status} />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                    {new Date(issue.createdDate).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onSelectIssue(issue)}
                    >
                      Карточка
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableWrapper>
      )}
    </Box>
  );
}

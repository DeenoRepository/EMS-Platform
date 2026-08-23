'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Chip,
  Stack,
  Paper,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import PageHeader from '@/components/layout/PageHeader';
import ChecklistIcon from '@mui/icons-material/Checklist';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import {
  StatCard,
  SearchInput,
  FilterToolbar,
  EmptyState,
  PageLoading,
} from '@/components/ui';
import { useSnackbar } from 'notistack';

interface ChecklistTemplateItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    description: string;
    itemType: string;
    sortOrder: number;
    isRequired: boolean;
  }>;
  _count?: {
    plans: number;
  };
}

export default function MroChecklistsPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [checklists, setChecklists] = useState<ChecklistTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchChecklists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mro/checklists');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setChecklists(json.data);
        } else {
          setChecklists([]);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка при загрузке чек-листов', { variant: 'error' });
      setChecklists([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchChecklists();
  };

  const filteredChecklists = checklists.filter((cl) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return cl.name.toLowerCase().includes(q) || (cl.description && cl.description.toLowerCase().includes(q));
  });

  const totalChecklists = checklists.length;
  const totalItemsCount = checklists.reduce((acc, cl) => acc + (cl.items?.length || 0), 0);
  const linkedPlansCount = checklists.reduce((acc, cl) => acc + (cl._count?.plans || 0), 0);

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      {/* 1. Header */}
      <PageHeader
        title="Технологические карты и чек-листы"
        subtitle="Библиотека стандартных технологических регламентов, инструкций и опросных листов ППР"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'ТО и Ремонт', href: '/mro' },
          { label: 'Технологические карты' },
        ]}
        actions={
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon className={refreshing ? 'animate-spin' : ''} sx={{ fontSize: 16 }} />}
            onClick={handleRefresh}
            sx={{ fontWeight: 600, borderRadius: '8px', minHeight: 36 }}
          >
            Обновить
          </Button>
        }
      />

      {/* 2. KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Всего чек-листов"
            value={totalChecklists}
            icon={<ChecklistIcon />}
            iconColor="#0284c7"
            iconBgColor="rgba(2, 132, 199, 0.08)"
            loading={loading}
            subtitle="Шаблонов технологических карт"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Пунктов проверки"
            value={totalItemsCount}
            icon={<FormatListNumberedIcon />}
            iconColor="#0284c7"
            iconBgColor="rgba(2, 132, 199, 0.08)"
            loading={loading}
            subtitle="Стандартизированных контрольных операций"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Связано с планами ТО"
            value={linkedPlansCount}
            icon={<AssignmentTurnedInIcon />}
            iconColor="#16a34a"
            iconBgColor="rgba(22, 163, 74, 0.08)"
            loading={loading}
            subtitle="Активных регламентов обслуживания"
          />
        </Grid>
      </Grid>

      {/* 3. Filter Toolbar */}
      <FilterToolbar activeFilterCount={search ? 1 : 0} onResetFilters={() => setSearch('')}>
        <Box sx={{ width: { xs: '100%', sm: 320 } }}>
          <SearchInput
            value={search}
            onSearch={setSearch}
            placeholder="Поиск по названию или описанию карты..."
          />
        </Box>
      </FilterToolbar>

      {/* 4. Checklist Cards */}
      {loading ? (
        <PageLoading text="Загрузка библиотеки чек-листов..." />
      ) : filteredChecklists.length === 0 ? (
        <EmptyState
          icon={<ChecklistIcon sx={{ fontSize: 48, color: '#94a3b8' }} />}
          title="Чек-листы не найдены"
          description={
            search
              ? 'По вашему поисковому запросу ничего не найдено.'
              : 'В системе пока нет зарегистрированных технологических карт.'
          }
          actionText={search ? 'Сбросить поиск' : undefined}
          onAction={search ? () => setSearch('') : undefined}
        />
      ) : (
        <Grid container spacing={2.5}>
          {filteredChecklists.map((cl) => (
            <Grid item xs={12} md={6} key={cl.id}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: '12px',
                  borderColor: '#e2e8f0',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#0284c7',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                      {cl.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Привязан к {cl._count?.plans || 0} планам ТО
                    </Typography>
                  </Box>
                  <Chip
                    label={`${cl.items?.length || 0} пунктов`}
                    size="small"
                    sx={{ fontWeight: 700, bgcolor: '#f0f9ff', color: '#0284c7', borderRadius: '6px' }}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                  {cl.description || 'Стандартный регламентный чек-лист для проверки узлов, смазки и регулировки агрегатов.'}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Контрольные операции:
                </Typography>

                <Stack spacing={1} sx={{ flex: 1 }}>
                  {cl.items?.slice(0, 4).map((item, idx) => (
                    <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" sx={{ color: '#0284c7', fontFamily: 'monospace', fontWeight: 700, width: 20 }}>
                        {idx + 1}.
                      </Typography>
                      <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.8125rem' }}>
                        {item.description}
                      </Typography>
                      {item.isRequired && (
                        <Chip label="Обязательно" size="small" sx={{ height: 18, fontSize: '0.625rem', bgcolor: '#fef2f2', color: '#dc2626' }} />
                      )}
                    </Box>
                  ))}
                  {cl.items?.length > 4 && (
                    <Typography variant="caption" color="primary" sx={{ fontWeight: 600, pt: 0.5 }}>
                      + еще {cl.items.length - 4} пунктов проверки
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

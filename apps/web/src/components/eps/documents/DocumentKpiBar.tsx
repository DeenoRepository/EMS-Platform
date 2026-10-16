'use client';

import React from 'react';
import { Grid } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FolderZipOutlinedIcon from '@mui/icons-material/FolderZipOutlined';
import SchemaOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { StatCard } from '@/components/ui';
import { DocumentKpiCounts } from './types';

interface DocumentKpiBarProps {
  stats: DocumentKpiCounts;
  docTypeFilter: string;
  loading: boolean;
  onKpiFilter: (type: string) => void;
}

export function DocumentKpiBar({
  stats,
  docTypeFilter,
  loading,
  onKpiFilter,
}: DocumentKpiBarProps) {
  return (
    <Grid container spacing={2} sx={{ mb: 2.5 }}>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Всего документов"
          value={stats.total}
          subtitle="Файлов в архиве"
          icon={<FolderZipOutlinedIcon sx={{ fontSize: 20 }} />}
          accentColor="primary.main"
          active={!docTypeFilter}
          onClick={() => onKpiFilter('')}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Паспорта оборудования"
          value={stats.passport}
          subtitle="Формуляры и паспорта"
          icon={<DescriptionOutlinedIcon sx={{ fontSize: 20 }} />}
          accentColor="info.main"
          active={docTypeFilter === 'PASSPORT'}
          onClick={() => onKpiFilter('PASSPORT')}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Электрические схемы"
          value={stats.schema}
          subtitle="Принципиальные и монтажные"
          icon={<SchemaOutlinedIcon sx={{ fontSize: 20 }} />}
          accentColor="warning.main"
          active={docTypeFilter === 'SCHEMA'}
          onClick={() => onKpiFilter('SCHEMA')}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Руководства и ТО"
          value={stats.manual}
          subtitle="Инструкции по эксплуатации"
          icon={<MenuBookOutlinedIcon sx={{ fontSize: 20 }} />}
          accentColor="secondary.main"
          active={docTypeFilter === 'MANUAL'}
          onClick={() => onKpiFilter('MANUAL')}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Сертификаты и акты"
          value={stats.certificate}
          subtitle="Поверки и калибровки"
          icon={<VerifiedOutlinedIcon sx={{ fontSize: 20 }} />}
          accentColor="success.main"
          active={docTypeFilter === 'CERTIFICATE'}
          onClick={() => onKpiFilter('CERTIFICATE')}
          loading={loading}
        />
      </Grid>
    </Grid>
  );
}

'use client';

import React from 'react';
import { Box, Typography, Button, IconButton, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PageHeader from '@/components/layout/PageHeader';
import { NavTabsContainer } from '@/components/ui';
import { EquipmentDetails, TAB_INDEX_MAP } from './types';

const FONT_SEMI_BOLD = 600;

interface PassportHeaderSummaryProps {
  equipment: EquipmentDetails;
  activeTab: number;
  canEdit: boolean;
  canDelete: boolean;
  onTabChange: (newTab: number) => void;
  onOpenEditModal: () => void;
  onDeleteEquipment: () => void;
  onSubmitDraftForApproval: () => void;
}

export function PassportHeaderSummary({
  equipment,
  activeTab,
  canEdit,
  canDelete,
  onTabChange,
  onOpenEditModal,
  onDeleteEquipment,
  onSubmitDraftForApproval,
}: PassportHeaderSummaryProps) {
  return (
    <>
      {/* Official Print Header */}
      <Box
        className="print-only"
        sx={{
          display: 'none',
          '@media print': {
            display: 'block !important',
            mb: 2.5,
            pb: 1.5,
            borderBottom: '2px solid',
            borderColor: 'text.primary',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: '0.02em', color: 'text.primary' }}>
              Электронный паспорт оборудования
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
              Корпоративная система управления оборудованием и основными фондами (EMS Platform)
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
              Дата выгрузки паспорта:
            </Typography>
            <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>
              {new Date().toLocaleDateString('ru-RU')}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Page Header */}
      <PageHeader
        title={equipment.name}
        subtitle={`${equipment.manufacturer || ''} ${equipment.model || ''} • Инв. №: ${equipment.inventoryNumber || 'Б/Н'}`}
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: equipment.name },
        ]}
        actions={
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
            {canEdit && (
              <Button
                variant="contained"
                size="small"
                startIcon={<EditIcon />}
                onClick={onOpenEditModal}
                sx={{
                  height: 38,
                  borderRadius: '8px',
                  fontWeight: FONT_SEMI_BOLD,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                  px: 2,
                }}
              >
                Редактировать
              </Button>
            )}
            {canDelete && (
              <IconButton color="error" onClick={onDeleteEquipment} title="Удалить оборудование">
                <DeleteOutlineIcon />
              </IconButton>
            )}
          </Box>
        }
        tabs={
          <NavTabsContainer
            value={activeTab}
            onChange={onTabChange}
            tabs={[
              { label: 'Паспорт оборудования', value: 0 },
              { label: 'Документация и схемы', value: 1, badge: equipment.documents.length },
              { label: 'Согласования и заявки', value: 2, badge: equipment.approvals?.length || 0 },
              { label: 'Комплектующие и ЗИП', value: 3, badge: equipment.spareParts.length },
              { label: 'График ТОиР и ППР', value: 4, badge: equipment.maintenancePlans.length },
              { label: 'Журнал инцидентов и дефектов', value: 5, badge: equipment.jiraIssues?.length || 0 },
              { label: 'Жизненный цикл и аудит', value: 6 },
            ]}
          />
        }
      />

      {/* Draft Status Alert */}
      {equipment.status === 'DRAFT' && (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              onClick={onSubmitDraftForApproval}
              sx={{ fontWeight: FONT_SEMI_BOLD }}
            >
              Отправить на согласование
            </Button>
          }
          sx={{ mb: 3, borderRadius: '8px' }}
        >
          <strong>Черновик паспорта:</strong> этот паспорт виден только вам. Чтобы он появился в общем реестре оборудования, отправьте его на согласование.
        </Alert>
      )}
    </>
  );
}

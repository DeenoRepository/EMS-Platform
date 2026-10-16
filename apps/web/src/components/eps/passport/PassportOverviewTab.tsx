'use client';

import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Divider,
  Button,
  Chip,
  Alert,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CategoryIcon from '@mui/icons-material/Category';
import SpeedIcon from '@mui/icons-material/Speed';
import ShieldIcon from '@mui/icons-material/Shield';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BoltIcon from '@mui/icons-material/Bolt';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import StraightenIcon from '@mui/icons-material/Straighten';
import TuneIcon from '@mui/icons-material/Tune';
import { EmptyState } from '@/components/ui';
import { checkEquipmentCardCompleteness, getEquipmentFieldValue } from '@/lib/eps-helpers';
import { EquipmentDetails, CustomSectionDef } from './types';
import { PassportFieldRenderer } from './PassportFieldRenderer';

const SECTION_ICONS: Record<string, React.ReactNode> = {
  Category: <CategoryIcon color="primary" />,
  Speed: <SpeedIcon color="error" />,
  Shield: <ShieldIcon color="success" />,
  Engineering: <EngineeringIcon color="warning" />,
  Bolt: <BoltIcon color="warning" />,
  WaterDrop: <WaterDropIcon color="info" />,
  Straighten: <StraightenIcon color="secondary" />,
  Tune: <TuneIcon color="primary" />,
};

const FONT_SEMI_BOLD = 600;

interface PassportOverviewTabProps {
  equipment: EquipmentDetails;
  sections: CustomSectionDef[];
  canEdit: boolean;
  onOpenEditModal: () => void;
  onOpenChangeResp: () => void;
  onCopy: (text: string, label: string) => void;
  onNavigateToSettings: () => void;
}

export function PassportOverviewTab({
  equipment,
  sections,
  canEdit,
  onOpenEditModal,
  onOpenChangeResp,
  onCopy,
  onNavigateToSettings,
}: PassportOverviewTabProps) {
  const comp = checkEquipmentCardCompleteness(equipment, sections);
  const custom = equipment.customFields || {};
  const respPerson = custom.responsible_person_name || '';

  return (
    <Box>
      {/* 1. Предупреждение о неполноте карточки */}
      {sections.length > 0 && comp.isIncomplete && comp.totalCount > 0 && (
        <Alert
          severity="warning"
          icon={<WarningAmberIcon />}
          action={
            canEdit ? (
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                onClick={onOpenEditModal}
                sx={{
                  borderColor: 'warning.main',
                  color: 'warning.dark',
                  fontWeight: 700,
                  textTransform: 'none',
                  fontSize: '0.75rem',
                }}
              >
                Заполнить поля
              </Button>
            ) : undefined
          }
          sx={{
            mb: 2.5,
            borderRadius: '10px',
            border: '1px solid',
            borderColor: 'warning.light',
            backgroundColor: 'warning.light',
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
              В карточке паспорта заполнены не все обязательные поля (Заполнено {comp.filledCount} из {comp.totalCount})
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
              Не заполнены обязательные позиции: <strong>{comp.missingFields.join(', ')}</strong>. Требуемые поля подсвечены индикатором «Не заполнено *».
            </Typography>
          </Box>
        </Alert>
      )}

      {/* 2. Технические разделы паспорта */}
      {sections.length === 0 ? (
        <EmptyState
          title="Технические разделы паспорта не настроены"
          description="В системе пока нет активных технических разделов. Настройте структуру паспорта в параметрах модуля EPS."
          actionText={canEdit ? 'Перейти к настройке разделов' : undefined}
          onAction={onNavigateToSettings}
          minHeight={240}
        />
      ) : (
        <Grid container spacing={3}>
          {sections.map((sec) => (
            <Grid item xs={12} lg={6} key={sec.id}>
              <Card
                sx={{
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <CardContent sx={{ p: 2.5, flex: '1 1 auto' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {SECTION_ICONS[sec.icon || 'Category'] || <CategoryIcon color="primary" />}
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {sec.name}
                        </Typography>
                        {sec.description && (
                          <Typography variant="caption" color="text.secondary">
                            {sec.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Chip
                      label={`${sec.fields.length} параметров`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                  <Divider sx={{ mb: 1.5 }} />

                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        {sec.fields.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={2} sx={{ py: 2, color: 'text.secondary', textAlign: 'center' }}>
                              В данном разделе пока нет добавленных характеристик
                            </TableCell>
                          </TableRow>
                        ) : (
                          sec.fields.map((f, fIdx) => {
                            const val = getEquipmentFieldValue(equipment, f.key);
                            const isLast = fIdx === sec.fields.length - 1;
                            const isResponsiblePerson = f.key === 'responsible_person_name';

                            return (
                              <TableRow key={f.key}>
                                <TableCell
                                  sx={{
                                    fontWeight: 500,
                                    color: 'text.secondary',
                                    width: '44%',
                                    py: 1,
                                    borderBottom: isLast ? 0 : '1px solid',
                                    borderColor: 'divider',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <span>{f.name}</span>
                                    {f.isRequired && (
                                      <Tooltip title="Обязательное поле паспорта">
                                        <Typography
                                          component="span"
                                          sx={{ color: 'error.main', fontWeight: 700, fontSize: '0.875rem' }}
                                        >
                                          *
                                        </Typography>
                                      </Tooltip>
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ py: 1, borderBottom: isLast ? 0 : '1px solid', borderColor: 'divider' }}>
                                  {isResponsiblePerson ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                        <Typography variant="body2" sx={{ fontWeight: FONT_SEMI_BOLD }}>
                                          {respPerson || (
                                            <Typography component="span" variant="body2" color="text.disabled">
                                              —
                                            </Typography>
                                          )}
                                        </Typography>
                                        {custom.responsible_user_login && (
                                          <Chip
                                            label={`@${custom.responsible_user_login}`}
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                            sx={{
                                              height: 20,
                                              fontSize: '0.7rem',
                                              fontFamily: 'monospace',
                                              fontWeight: FONT_SEMI_BOLD,
                                            }}
                                          />
                                        )}
                                      </Box>
                                      {canEdit && (
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          startIcon={<EditIcon sx={{ fontSize: 13 }} />}
                                          onClick={onOpenChangeResp}
                                          sx={{
                                            height: 24,
                                            fontSize: '0.75rem',
                                            fontWeight: FONT_SEMI_BOLD,
                                            textTransform: 'none',
                                            px: 1,
                                            borderColor: 'divider',
                                            color: 'primary.main',
                                          }}
                                        >
                                          Назначить
                                        </Button>
                                      )}
                                    </Box>
                                  ) : (
                                    <PassportFieldRenderer field={f} value={val} onCopy={onCopy} />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

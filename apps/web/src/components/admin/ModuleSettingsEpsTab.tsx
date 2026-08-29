'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BoltIcon from '@mui/icons-material/Bolt';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ShieldIcon from '@mui/icons-material/Shield';
import StraightenIcon from '@mui/icons-material/Straighten';
import SpeedIcon from '@mui/icons-material/Speed';
import CategoryIcon from '@mui/icons-material/Category';
import EngineeringIcon from '@mui/icons-material/Engineering';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';

import {
  DataTableWrapper,
  EmptyState,
  PageLoading,
  StatusBadge,
} from '@/components/ui';

import type { CustomSectionItem, CustomFieldItem } from './ModuleSettingsDialogs';

export interface TagItem {
  id: string;
  name: string;
  color: string;
  equipmentCount: number;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  Category: <CategoryIcon color="primary" />,
  Speed: <SpeedIcon color="error" />,
  Shield: <ShieldIcon color="success" />,
  Engineering: <EngineeringIcon color="warning" />,
  Bolt: <BoltIcon color="warning" />,
  WaterDrop: <WaterDropIcon color="info" />,
  Straighten: <StraightenIcon color="secondary" />,
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: 'Текстовое поле',
  TEXTAREA: 'Многострочный текст',
  NUMBER: 'Числовое значение',
  DATE: 'Дата',
  SELECT: 'Выпадающий список',
  BOOLEAN: 'Флаг (Да/Нет)',
};

interface ModuleSettingsEpsTabProps {
  sections: CustomSectionItem[];
  unassignedFields: CustomFieldItem[];
  tags: TagItem[];
  loadingEps: boolean;
  onOpenImport: () => void;
  onOpenCreateSection: () => void;
  onOpenEditSection: (sec: CustomSectionItem) => void;
  onDeleteSection: (sec: CustomSectionItem) => void;
  onOpenCreateField: (sectionId?: string) => void;
  onDeleteField: (field: CustomFieldItem) => void;
  onOpenCreateTag: () => void;
}

export function ModuleSettingsEpsTab({
  sections,
  unassignedFields,
  tags,
  loadingEps,
  onOpenImport,
  onOpenCreateSection,
  onOpenEditSection,
  onDeleteSection,
  onOpenCreateField,
  onDeleteField,
  onOpenCreateTag,
}: ModuleSettingsEpsTabProps) {
  const renderFieldTable = (fields: CustomFieldItem[]) => {
    if (fields.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            В этом разделе пока нет добавленных параметров.
          </Typography>
        </Box>
      );
    }

    return (
      <Table size="small" aria-label="Таблица параметров раздела">
        <TableHead sx={{ backgroundColor: 'action.hover' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Наименование</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Системный ключ</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Тип данных</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Ед. изм.</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Обязательное</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.map((f) => (
            <TableRow key={f.id} hover>
              <TableCell sx={{ fontWeight: 600 }}>{f.name}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{f.key}</TableCell>
              <TableCell>
                <Chip label={FIELD_TYPE_LABELS[f.fieldType] || f.fieldType} size="small" variant="outlined" />
              </TableCell>
              <TableCell>{f.unit || '—'}</TableCell>
              <TableCell>
                {f.isRequired ? (
                  <Chip label="Да" size="small" color="primary" sx={{ height: 20, fontSize: '0.6875rem' }} />
                ) : (
                  <Typography variant="caption" color="text.secondary">Нет</Typography>
                )}
              </TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDeleteField(f)}
                  title="Удалить параметр"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Grid container spacing={3}>
      {/* Main Column: Custom Sections with their Fields */}
      <Grid item xs={12} lg={8}>
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Технические разделы и характеристики паспорта
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Группировка технических параметров по разделам паспорта с единицами измерения
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  color="primary"
                  startIcon={<FileUploadOutlinedIcon />}
                  onClick={onOpenImport}
                  sx={{ borderRadius: '8px' }}
                >
                  Импорт оборудования
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={onOpenCreateSection}
                  sx={{ borderRadius: '8px' }}
                >
                  Добавить раздел
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => onOpenCreateField()}
                  sx={{ borderRadius: '8px' }}
                >
                  Добавить параметр
                </Button>
              </Box>
            </Box>
            <Divider sx={{ mb: 2.5 }} />

            {loadingEps ? (
              <PageLoading text="Загрузка структуры разделов..." minHeight={160} size={28} />
            ) : sections.length === 0 ? (
              <EmptyState
                title="Разделы не созданы"
                description="Технические разделы еще не созданы. Нажмите «Добавить раздел» для группировки параметров."
                minHeight={160}
              />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sections.map((sec) => (
                  <Accordion key={sec.id} defaultExpanded variant="outlined" sx={{ borderRadius: '8px !important', overflow: 'hidden' }}>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        backgroundColor: 'background.default',
                        borderBottom: '1px solid divider',
                        px: 2.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {SECTION_ICONS[sec.icon || 'Bolt'] || <BoltIcon color="primary" />}
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={`${sec.fields.length} параметров`} size="small" />
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenEditSection(sec);
                            }}
                            title="Редактировать раздел"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSection(sec);
                            }}
                            title="Удалить раздел"
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      {renderFieldTable(sec.fields)}
                      <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end', backgroundColor: 'background.default', borderTop: '1px solid', borderColor: 'divider' }}>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => onOpenCreateField(sec.id)}
                        >
                          Добавить параметр в «{sec.name}»
                        </Button>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}

                {/* Unassigned Fields Section if any */}
                {unassignedFields.length > 0 && (
                  <Accordion defaultExpanded variant="outlined" sx={{ borderRadius: '8px !important', overflow: 'hidden' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: 'warning.light' }}>
                      <Typography variant="subtitle1" fontWeight={700} color="warning.dark">
                        Общие параметры (базовые характеристики)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      {renderFieldTable(unassignedFields)}
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Side Column: Tags & Colors */}
      <Grid item xs={12} lg={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Метки и классификаторы
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Категории и цветовая маркировка
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={onOpenCreateTag}
              >
                Добавить метку
              </Button>
            </Box>
            <Divider sx={{ mb: 2.5 }} />

            {loadingEps ? (
              <PageLoading text="Загрузка списка тегов..." minHeight={140} size={24} />
            ) : (
              <DataTableWrapper total={tags.length} stickyHeader>
                <Table size="small" aria-label="Таблица тегов оборудования">
                  <TableHead sx={{ backgroundColor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Тег</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Цвет</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Оборудование</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tags.map((t) => (
                      <TableRow key={t.id} hover>
                        <TableCell>
                          <StatusBadge
                            status={t.name}
                            label={t.name}
                            customColor={t.color}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: t.color }} />
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                              {t.color}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{t.equipmentCount} ед.</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableWrapper>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

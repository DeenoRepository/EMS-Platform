'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Chip,
  IconButton,
  Divider,
  Paper,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { FormDialog, SearchInput } from '@/components/ui';

export interface ReportColumn {
  key: string;
  name: string;
  category: string;
  unit?: string | null;
}

export interface IndustryPreset {
  id: string;
  name: string;
  columns: string[];
}

interface ReportColumnBuilderDialogProps {
  open: boolean;
  availableColumns: ReportColumn[];
  selectedColumnKeys: string[];
  activePresetOrTemplateId: string | null;
  presets: IndustryPreset[];
  onClose: () => void;
  onApplyColumns: (columns: string[]) => void;
  onApplyPreset: (preset: IndustryPreset) => void;
  onSelectAll: () => void;
  onToggleColumn: (key: string) => void;
  onToggleCategory: (category: string) => void;
  onMoveColumn: (index: number, direction: 'up' | 'down') => void;
  onRemoveColumn: (key: string) => void;
  onResetOrder: () => void;
}

export function ReportColumnBuilderDialog({
  open,
  availableColumns,
  selectedColumnKeys,
  activePresetOrTemplateId,
  presets,
  onClose,
  onApplyColumns,
  onApplyPreset,
  onSelectAll,
  onToggleColumn,
  onToggleCategory,
  onMoveColumn,
  onRemoveColumn,
  onResetOrder,
}: ReportColumnBuilderDialogProps) {
  const [searchQueryColumn, setSearchQueryColumn] = useState('');

  const columnsByCategory = useMemo(() => {
    const map: Record<string, ReportColumn[]> = {};
    availableColumns.forEach((col) => {
      const cat = col.category || 'Прочее';
      if (!map[cat]) map[cat] = [];
      map[cat].push(col);
    });
    return map;
  }, [availableColumns]);

  const filteredColumnsByCategory = useMemo(() => {
    if (!searchQueryColumn.trim()) return columnsByCategory;
    const query = searchQueryColumn.toLowerCase().trim();
    const result: Record<string, ReportColumn[]> = {};

    Object.entries(columnsByCategory).forEach(([category, cols]) => {
      const matched = cols.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.key.toLowerCase().includes(query) ||
          (c.unit && c.unit.toLowerCase().includes(query)) ||
          category.toLowerCase().includes(query)
      );
      if (matched.length > 0) {
        result[category] = matched;
      }
    });

    return result;
  }, [columnsByCategory, searchQueryColumn]);

  const activeColumnsDef = useMemo(() => {
    const map = new Map(availableColumns.map((c) => [c.key, c]));
    return selectedColumnKeys
      .map((k) => map.get(k))
      .filter((c): c is ReportColumn => Boolean(c));
  }, [availableColumns, selectedColumnKeys]);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Конструктор колонок и состава ведомости"
      icon={<ViewColumnOutlinedIcon color="primary" />}
      maxWidth="md"
      submitLabel="Применить состав колонок"
      onSubmit={() => {
        onApplyColumns(selectedColumnKeys);
        onClose();
      }}
    >
      <Box sx={{ mb: 2, pt: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
          Готовые пресеты ведомостей:
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          {presets.map((preset) => (
            <Chip
              key={preset.id}
              label={preset.name}
              variant={activePresetOrTemplateId === preset.id ? 'filled' : 'outlined'}
              color={activePresetOrTemplateId === preset.id ? 'primary' : 'default'}
              onClick={() => onApplyPreset(preset)}
              clickable
              size="small"
              sx={{ fontWeight: 600, borderRadius: '6px', fontSize: '0.75rem' }}
            />
          ))}
          <Chip
            label="Все параметры"
            variant={activePresetOrTemplateId === 'all' ? 'filled' : 'outlined'}
            color={activePresetOrTemplateId === 'all' ? 'primary' : 'default'}
            onClick={onSelectAll}
            clickable
            size="small"
            sx={{ fontWeight: 600, borderRadius: '6px', fontSize: '0.75rem' }}
          />
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Grid container spacing={2.5}>
        {/* Left Column: Categorized Available Fields */}
        <Grid item xs={12} md={7}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
              Доступные характеристики ({availableColumns.length})
            </Typography>
            <Button size="small" onClick={onSelectAll} sx={{ fontSize: '0.75rem' }}>
              Выбрать все
            </Button>
          </Box>

          <Box sx={{ mb: 1.5 }}>
            <SearchInput
              size="small"
              fullWidth
              placeholder="Поиск характеристик..."
              value={searchQueryColumn}
              onSearch={(val) => setSearchQueryColumn(val)}
              delay={100}
            />
          </Box>

          <Box sx={{ maxHeight: 380, overflowY: 'auto', pr: 0.5 }}>
            {Object.entries(filteredColumnsByCategory).map(([category, cols]) => {
              const catKeys = cols.map((c) => c.key);
              const checkedCount = catKeys.filter((k) => selectedColumnKeys.includes(k)).length;
              const isAllChecked = checkedCount === catKeys.length;
              const isIndeterminate = checkedCount > 0 && checkedCount < catKeys.length;

              return (
                <Accordion
                  key={category}
                  defaultExpanded={category === 'Основные реквизиты' || category === 'Классификаторы'}
                  expanded={searchQueryColumn.trim() ? true : undefined}
                  disableGutters
                  sx={{
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px !important',
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox
                          size="small"
                          checked={isAllChecked}
                          indeterminate={isIndeterminate}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleCategory(category);
                          }}
                        />
                        <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                          {category}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${checkedCount}/${cols.length}`}
                        size="small"
                        color={checkedCount > 0 ? 'primary' : 'default'}
                        variant="outlined"
                        sx={{ fontSize: '0.6875rem', height: 20 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, pb: 1, px: 2 }}>
                    <Grid container spacing={0.5}>
                      {cols.map((col) => (
                        <Grid item xs={12} key={col.key}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                size="small"
                                checked={selectedColumnKeys.includes(col.key)}
                                onChange={() => onToggleColumn(col.key)}
                              />
                            }
                            label={
                              <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                                {col.name}
                              </Typography>
                            }
                            sx={{ m: 0 }}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        </Grid>

        {/* Right Column: Ordered Selected Columns */}
        <Grid item xs={12} md={5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
              Порядок колонок в отчете ({selectedColumnKeys.length})
            </Typography>
            <Button
              size="small"
              color="error"
              onClick={onResetOrder}
              sx={{ fontSize: '0.75rem' }}
            >
              Сброс
            </Button>
          </Box>

          <Paper
            variant="outlined"
            sx={{
              maxHeight: 430,
              overflowY: 'auto',
              p: 0.5,
              backgroundColor: 'background.default',
              borderRadius: '8px',
            }}
          >
            <List dense disablePadding>
              {activeColumnsDef.map((col, idx) => (
                <ListItem
                  key={col.key}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    mb: 0.5,
                    bgcolor: 'background.paper',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <ListItemText
                    primary={col.name}
                    secondary={col.category}
                    primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 600 }}
                    secondaryTypographyProps={{ fontSize: '0.6875rem' }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      disabled={idx === 0}
                      onClick={() => onMoveColumn(idx, 'up')}
                      sx={{ p: 0.25 }}
                    >
                      <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={idx === activeColumnsDef.length - 1}
                      onClick={() => onMoveColumn(idx, 'down')}
                      sx={{ p: 0.25 }}
                    >
                      <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onRemoveColumn(col.key)}
                      sx={{ p: 0.25 }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </FormDialog>
  );
}

export default ReportColumnBuilderDialog;

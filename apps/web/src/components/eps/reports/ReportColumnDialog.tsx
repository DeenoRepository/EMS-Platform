'use client';

import React from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
  Stack,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { FormDialog, SearchInput } from '@/components/ui';
import { ReportColumn } from './types';

const FONT_SEMI_BOLD = 600;

interface ReportColumnDialogProps {
  open: boolean;
  availableColumns: ReportColumn[];
  selectedKeys: string[];
  searchQuery: string;
  onClose: () => void;
  onSearchChange: (q: string) => void;
  onToggleColumn: (key: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function ReportColumnDialog({
  open,
  availableColumns,
  selectedKeys,
  searchQuery,
  onClose,
  onSearchChange,
  onToggleColumn,
  onSelectAll,
  onDeselectAll,
}: ReportColumnDialogProps) {
  // Group columns by category
  const categories = React.useMemo(() => {
    const map = new Map<string, ReportColumn[]>();
    availableColumns.forEach((c) => {
      const matchSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase());
      if (matchSearch) {
        const list = map.get(c.category) || [];
        list.push(c);
        map.set(c.category, list);
      }
    });
    return Array.from(map.entries());
  }, [availableColumns, searchQuery]);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Настройка колонок и состава ведомости"
      subtitle={`Выбрано колонок: ${selectedKeys.length} из ${availableColumns.length}`}
      maxWidth="sm"
      submitLabel="Применить состав"
      onSubmit={onClose}
    >
      <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <SearchInput
          placeholder="Поиск по характеристикам..."
          value={searchQuery}
          onSearch={onSearchChange}
        />

        <Stack direction="row" spacing={1}>
          <Button size="small" variant="text" onClick={onSelectAll} sx={{ fontSize: '0.75rem', fontWeight: FONT_SEMI_BOLD }}>
            Выбрать все
          </Button>
          <Button size="small" variant="text" color="inherit" onClick={onDeselectAll} sx={{ fontSize: '0.75rem' }}>
            Снять выбор
          </Button>
        </Stack>

        <Box sx={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {categories.map(([cat, cols]) => (
            <Accordion key={cat} defaultExpanded sx={{ mb: 1, '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: '8px !important' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {cat} ({cols.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 0.5 }}>
                  {cols.map((c) => (
                    <FormControlLabel
                      key={c.key}
                      control={
                        <Checkbox
                          size="small"
                          checked={selectedKeys.includes(c.key)}
                          onChange={() => onToggleColumn(c.key)}
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{c.name}</Typography>}
                    />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Box>
    </FormDialog>
  );
}

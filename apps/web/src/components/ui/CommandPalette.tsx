'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  InputBase,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Paper,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import SearchIcon from '@mui/icons-material/Search';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import OutboxIcon from '@mui/icons-material/Outbox';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'EPS' | 'WMS' | 'MRO' | 'SRM' | 'ADMIN' | 'ACTIONS';
  icon: React.ReactNode;
  href?: string;
  action?: () => void;
  keywords?: string[];
}

const COMMAND_ITEMS: CommandItem[] = [
  // EPS
  {
    id: 'eps-root',
    title: 'Реестр оборудования',
    subtitle: 'Каталог оборудования, паспорта, статусы и характеристики',
    category: 'EPS',
    icon: <PrecisionManufacturingIcon sx={{ fontSize: 20 }} />,
    href: '/eps',
    keywords: ['паспорт', 'станок', 'серийный', 'инвентарный', 'оборудование'],
  },
  {
    id: 'eps-approvals',
    title: 'Согласования оборудования',
    subtitle: 'Заявки на ввод, перемещение и списание',
    category: 'EPS',
    icon: <FactCheckOutlinedIcon sx={{ fontSize: 20 }} />,
    href: '/eps/approvals',
    keywords: ['согласование', 'акт', 'заявка', 'утверждение'],
  },
  {
    id: 'eps-documents',
    title: 'Техническая документация',
    subtitle: 'Чертежи, сертификаты, руководства по эксплуатации',
    category: 'EPS',
    icon: <DescriptionOutlinedIcon sx={{ fontSize: 20 }} />,
    href: '/eps/documents',
    keywords: ['документ', 'чертеж', 'сертификат', 'инструкция', 'pdf'],
  },
  {
    id: 'eps-history',
    title: 'История и аудит оборудования',
    subtitle: 'Хронология изменений параметров и жизненного цикла',
    category: 'EPS',
    icon: <HistoryOutlinedIcon sx={{ fontSize: 20 }} />,
    href: '/eps/history',
    keywords: ['история', 'таймлайн', 'изменения', 'лог'],
  },

  // WMS
  {
    id: 'wms-root',
    title: 'Складской дашборд',
    subtitle: 'Сводка остатков ТМЦ, дефицит, активные инвентаризации',
    category: 'WMS',
    icon: <Inventory2OutlinedIcon sx={{ fontSize: 20 }} />,
    href: '/wms',
    keywords: ['склад', 'тмц', 'запчасти', 'дефицит'],
  },
  {
    id: 'wms-stock',
    title: 'Остатки ТМЦ и материалов',
    subtitle: 'Номенклатура, адресное хранение, минимальный остаток',
    category: 'WMS',
    icon: <Inventory2OutlinedIcon sx={{ fontSize: 20 }} />,
    href: '/wms/stock',
    keywords: ['остатки', 'номенклатура', 'ячейка', 'стеллаж', 'артикул'],
  },
  {
    id: 'wms-operations',
    title: 'Журнал складских операций',
    subtitle: 'Приход, расход, перемещение и списание ТМЦ',
    category: 'WMS',
    icon: <MoveToInboxIcon sx={{ fontSize: 20 }} />,
    href: '/wms/operations',
    keywords: ['приход', 'расход', 'перемещение', 'накладная'],
  },
  {
    id: 'wms-inventory',
    title: 'Акты инвентаризации',
    subtitle: 'Проведение ревизий и автоматическое сведение остатков',
    category: 'WMS',
    icon: <FactCheckOutlinedIcon sx={{ fontSize: 20 }} />,
    href: '/wms/inventory',
    keywords: ['инвентаризация', 'ревизия', 'сверка', 'излишки', 'недостачи'],
  },
  {
    id: 'wms-warehouses',
    title: 'Топология складов и зон',
    subtitle: 'Склады, зоны хранения и адресные ячейки',
    category: 'WMS',
    icon: <Inventory2OutlinedIcon sx={{ fontSize: 20 }} />,
    href: '/wms/warehouses',
    keywords: ['склады', 'зоны', 'ячейки', 'мол', 'ответственный'],
  },

  // MRO
  {
    id: 'mro-root',
    title: 'ТОиР — Графики и регламенты',
    subtitle: 'Планово-предупредительный ремонт и обслуживание',
    category: 'MRO',
    icon: <BuildOutlinedIcon sx={{ fontSize: 20 }} />,
    href: '/mro',
    keywords: ['тоир', 'ремонт', 'то', 'ппр', 'график', 'регламент'],
  },

  // SRM
  {
    id: 'srm-root',
    title: 'SRM — Сервис и заявки',
    subtitle: 'Интеграция с Jira/ServiceDesk, SLA и поставщики',
    category: 'SRM',
    icon: <HubOutlinedIcon sx={{ fontSize: 20 }} />,
    href: '/srm',
    keywords: ['srm', 'jira', 'тикет', 'sla', 'поставщик', 'servicedesk'],
  },

  // Admin
  {
    id: 'admin-users',
    title: 'Пользователи платформы',
    subtitle: 'Учетные записи, LDAP-синхронизация и статусы',
    category: 'ADMIN',
    icon: <PeopleOutlineIcon sx={{ fontSize: 20 }} />,
    href: '/admin/users',
    keywords: ['пользователи', 'ldap', 'аккаунты', 'админ'],
  },
  {
    id: 'admin-roles',
    title: 'Роли и матрица прав (RBAC)',
    subtitle: 'Настройка системных прав и ролей пользователей',
    category: 'ADMIN',
    icon: <VerifiedUserOutlinedIcon sx={{ fontSize: 20 }} />,
    href: '/admin/roles',
    keywords: ['роли', 'права', 'rbac', 'доступ', 'permissions'],
  },
  {
    id: 'admin-audit',
    title: 'Журнал аудита системы',
    subtitle: 'Неизменяемый лог всех действий пользователей и событий',
    category: 'ADMIN',
    icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 20 }} />,
    href: '/admin/audit-log',
    keywords: ['аудит', 'лог', 'безопасность', 'действия'],
  },
  {
    id: 'admin-settings',
    title: 'Системные настройки',
    subtitle: 'Конфигурация модулей, LDAP и внешних интеграций',
    category: 'ADMIN',
    icon: <SettingsOutlinedIcon sx={{ fontSize: 20 }} />,
    href: '/admin/settings',
    keywords: ['настройки', 'конфигурация', 'параметры'],
  },
];

const CATEGORY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  EPS: { label: 'Оборудование (EPS)', color: '#0284c7', bg: '#e0f2fe' },
  WMS: { label: 'Склад (WMS)', color: '#d97706', bg: '#fef3c7' },
  MRO: { label: 'ТОиР (MRO)', color: '#059669', bg: '#d1fae5' },
  SRM: { label: 'Заявки (SRM)', color: '#7c3aed', bg: '#ede9fe' },
  ADMIN: { label: 'Управление', color: '#475569', bg: '#f1f5f9' },
  ACTIONS: { label: 'Действия', color: '#dc2626', bg: '#fee2e2' },
};

export interface CommandPaletteProps {
  open?: boolean;
  onClose?: () => void;
}

export function CommandPalette({ open: controlledOpen, onClose: controlledOnClose }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const handleClose = useCallback(() => {
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
    setQuery('');
    setSelectedIndex(0);
  }, [isControlled, controlledOnClose]);

  // Глобальный слушатель клавиатуры Ctrl+K / Cmd+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isControlled) {
          if (isOpen && controlledOnClose) controlledOnClose();
        } else {
          setInternalOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isControlled, isOpen, controlledOnClose]);

  // Фильтрация элементов
  const filteredItems = useMemo(() => {
    if (!query.trim()) return COMMAND_ITEMS;
    const q = query.trim().toLowerCase();

    return COMMAND_ITEMS.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle?.toLowerCase().includes(q) || false;
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q)) || false;

      return matchTitle || matchSubtitle || matchCategory || matchKeywords;
    });
  }, [query]);

  // Навигация стрелками
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) {
        if (selected.href) {
          router.push(selected.href);
          handleClose();
        } else if (selected.action) {
          selected.action();
          handleClose();
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  const handleSelectItem = (item: CommandItem) => {
    if (item.href) {
      router.push(item.href);
      handleClose();
    } else if (item.action) {
      item.action();
      handleClose();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(5px)',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
          },
        },
      }}
      PaperProps={{
        onKeyDown: handleKeyDown,
        sx: {
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          mt: { xs: 4, sm: 8 },
          verticalAlign: 'top',
        },
      }}
    >
      {/* Search Input Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          py: 2,
          borderBottom: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
        }}
      >
        <SearchIcon sx={{ color: '#0284c7', fontSize: 22 }} />
        <InputBase
          autoFocus
          fullWidth
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          placeholder="Поиск по разделам, паспортам, ТМЦ и регламентам..."
          sx={{
            fontSize: '0.9375rem',
            color: '#0f172a',
            fontWeight: 500,
            '& input::placeholder': {
              color: '#94a3b8',
              opacity: 1,
            },
          }}
        />
        <Chip
          label="ESC"
          size="small"
          onClick={handleClose}
          sx={{
            fontWeight: 700,
            fontSize: '0.6875rem',
            height: 22,
            borderRadius: '6px',
            bgcolor: '#f1f5f9',
            color: '#64748b',
            cursor: 'pointer',
          }}
        />
      </Box>

      {/* Results List */}
      <DialogContent sx={{ p: 1, maxHeight: 420, overflowY: 'auto' }}>
        {filteredItems.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="#64748b" fontWeight={500}>
              По запросу «{query}» ничего не найдено
            </Typography>
            <Typography variant="caption" color="#94a3b8" sx={{ mt: 0.5, display: 'block' }}>
              Попробуйте изменить формулировку или ключевые слова
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const cat = CATEGORY_MAP[item.category] || { label: item.category, color: '#64748b', bg: '#f1f5f9' };

              return (
                <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    sx={{
                      borderRadius: '10px',
                      py: 1.25,
                      px: 1.75,
                      transition: 'all 0.12s ease',
                      '&.Mui-selected': {
                        backgroundColor: '#f0f9ff',
                        '&:hover': { backgroundColor: '#e0f2fe' },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 38,
                        color: isSelected ? '#0284c7' : '#64748b',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: isSelected ? 700 : 600,
                              color: isSelected ? '#0284c7' : '#0f172a',
                              fontSize: '0.875rem',
                            }}
                          >
                            {item.title}
                          </Typography>
                          <Chip
                            label={cat.label}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              color: cat.color,
                              bgcolor: cat.bg,
                              borderRadius: '4px',
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        item.subtitle ? (
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#64748b',
                              fontSize: '0.75rem',
                              display: 'block',
                              mt: 0.25,
                            }}
                            noWrap
                          >
                            {item.subtitle}
                          </Typography>
                        ) : null
                      }
                    />
                    {isSelected && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#0284c7', flexShrink: 0 }}>
                        <KeyboardReturnIcon sx={{ fontSize: 16 }} />
                      </Box>
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>

      {/* Footer Navigation Hints */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 1.25,
          borderTop: '1px solid #f1f5f9',
          bgcolor: '#f8fafc',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label="↑" size="small" sx={{ height: 18, fontSize: '0.6875rem', bgcolor: '#ffffff', border: '1px solid #cbd5e1' }} />
            <Chip label="↓" size="small" sx={{ height: 18, fontSize: '0.6875rem', bgcolor: '#ffffff', border: '1px solid #cbd5e1' }} />
            <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.6875rem', ml: 0.25 }}>
              Навигация
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label="↵" size="small" sx={{ height: 18, fontSize: '0.6875rem', bgcolor: '#ffffff', border: '1px solid #cbd5e1' }} />
            <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.6875rem', ml: 0.25 }}>
              Выбрать
            </Typography>
          </Box>
        </Box>
        <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.6875rem', fontWeight: 500 }}>
          EMS Command Palette
        </Typography>
      </Box>
    </Dialog>
  );
}

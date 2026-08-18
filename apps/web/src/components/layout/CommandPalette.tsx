'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  InputBase,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import TuneIcon from '@mui/icons-material/Tune';
import HistoryIcon from '@mui/icons-material/History';
import PeopleIcon from '@mui/icons-material/People';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import { useRouter } from 'next/navigation';
import { EQUIPMENT_STATUS_MAP, PERMISSIONS } from '@ems/shared';
import { StatusBadge, EmptyState } from '@/components/ui';
import { useAuth } from '@/lib/auth-client';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface EquipmentSearchResult {
  id: string;
  name: string;
  inventoryNumber: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  status: string;
}

interface StaticCommandItem {
  title: string;
  path: string;
  category: string;
  icon: React.ReactNode;
  permission?: string;
  adminOnly?: boolean;
}

const STATIC_COMMANDS: StaticCommandItem[] = [
  {
    title: 'Добавить единицу оборудования',
    path: '/eps/new',
    category: 'Действия',
    icon: <AddCircleOutlineIcon color="primary" />,
    permission: PERMISSIONS.EPS_EQUIPMENT_CREATE,
  },
  {
    title: 'Паспортизация оборудования (EPS)',
    path: '/eps',
    category: 'Навигация',
    icon: <PrecisionManufacturingIcon />,
    permission: PERMISSIONS.EPS_EQUIPMENT_VIEW,
  },
  {
    title: 'Складской учёт и остатки (WMS)',
    path: '/wms',
    category: 'Навигация',
    icon: <Inventory2Icon />,
    permission: PERMISSIONS.WMS_STOCK_VIEW,
  },
  {
    title: 'Система подачи заявок (SRM)',
    path: '/srm',
    category: 'Навигация',
    icon: <AssessmentIcon />,
    permission: PERMISSIONS.SRM_DASHBOARD_VIEW,
  },
  {
    title: 'График ППР и ТО (MRO)',
    path: '/mro',
    category: 'Навигация',
    icon: <BuildCircleIcon />,
    permission: PERMISSIONS.MRO_SCHEDULE_VIEW,
  },
  {
    title: 'Настройки модулей (EPS, WMS, SRM, MRO)',
    path: '/admin/module-settings',
    category: 'Администрирование',
    icon: <TuneIcon />,
    adminOnly: true,
  },
  {
    title: 'Пользователи системы',
    path: '/admin/users',
    category: 'Администрирование',
    icon: <PeopleIcon />,
    permission: PERMISSIONS.ADMIN_USERS_MANAGE,
    adminOnly: true,
  },
  {
    title: 'Журнал аудита операций',
    path: '/admin/audit-log',
    category: 'Администрирование',
    icon: <HistoryIcon />,
    permission: PERMISSIONS.ADMIN_AUDIT_VIEW,
    adminOnly: true,
  },
];

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [equipmentResults, setEquipmentResults] = useState<EquipmentSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search Equipment via API
  useEffect(() => {
    if (!query.trim()) {
      setEquipmentResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/eps/equipment?search=${encodeURIComponent(query.trim())}&pageSize=6`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setEquipmentResults(json.data.items || []);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter static commands by user permissions and search query
  const canAccessAdmin = user?.roles.includes('admin') || hasPermission(PERMISSIONS.ADMIN_USERS_MANAGE);

  const filteredCommands = STATIC_COMMANDS.filter((cmd) => {
    if (cmd.adminOnly && !canAccessAdmin) return false;
    if (cmd.permission && !hasPermission(cmd.permission)) return false;
    return cmd.title.toLowerCase().includes(query.toLowerCase());
  });

  const totalItems = equipmentResults.length + filteredCommands.length;

  const handleSelect = useCallback(
    (index: number) => {
      if (index < equipmentResults.length) {
        const eq = equipmentResults[index];
        router.push(`/eps/${eq.id}`);
      } else {
        const cmd = filteredCommands[index - equipmentResults.length];
        if (cmd) router.push(cmd.path);
      }
      onClose();
    },
    [equipmentResults, filteredCommands, router, onClose]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (totalItems || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (totalItems || 1)) % (totalItems || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (totalItems > 0) {
        handleSelect(selectedIndex);
      }
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, equipmentResults.length]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          top: '-15%',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Search Input Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2.5,
            py: 2,
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
          }}
        >
          <SearchIcon sx={{ color: '#0284c7', fontSize: 24, mr: 1.5 }} />
          <InputBase
            inputRef={inputRef}
            autoFocus
            placeholder="Поиск оборудования по инв. №, названию, заводскому номеру или команде..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{
              flexGrow: 1,
              fontSize: '1rem',
              fontWeight: 500,
              '& input::placeholder': { color: '#94a3b8', opacity: 1 },
            }}
          />
          {loading ? (
            <CircularProgress size={20} />
          ) : (
            <Chip
              label="ESC"
              size="small"
              onClick={onClose}
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, backgroundColor: '#f1f5f9' }}
            />
          )}
        </Box>

        {/* Results Body */}
        <Box sx={{ maxHeight: 420, overflowY: 'auto', p: 1.5 }}>
          {/* Equipment Search Results */}
          {equipmentResults.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ px: 1.5, py: 0.5, display: 'block', fontWeight: 700, color: '#94a3b8' }}>
                ОБОРУДОВАНИЕ В РЕЕСТРЕ
              </Typography>
              <List disablePadding>
                {equipmentResults.map((eq, idx) => {
                  const isSelected = selectedIndex === idx;
                  const statusInfo = EQUIPMENT_STATUS_MAP[eq.status] || { label: eq.status, color: 'default' };
                  return (
                    <ListItem key={eq.id} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        selected={isSelected}
                        onClick={() => handleSelect(idx)}
                        sx={{
                          borderRadius: '10px',
                          py: 1,
                          px: 1.5,
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(2, 132, 199, 0.08)',
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36, color: '#0284c7' }}>
                          <PrecisionManufacturingIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" fontWeight={600} noWrap>
                                {eq.name}
                              </Typography>
                              <Chip
                                label={eq.inventoryNumber || 'Б/Н'}
                                size="small"
                                variant="outlined"
                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                              />
                            </Box>
                          }
                          secondary={`${eq.manufacturer || ''} ${eq.model ? '• ' + eq.model : ''} ${eq.location ? '• ' + eq.location : ''}`}
                          secondaryTypographyProps={{ fontSize: '0.75rem', noWrap: true }}
                        />
                        <StatusBadge
                          status={eq.status}
                          size="small"
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}

          {/* Quick Commands & Navigation */}
          {filteredCommands.length > 0 && (
            <Box>
              <Typography variant="caption" sx={{ px: 1.5, py: 0.5, display: 'block', fontWeight: 700, color: '#94a3b8' }}>
                БЫСТРЫЕ ДЕЙСТВИЯ И РАЗДЕЛЫ
              </Typography>
              <List disablePadding>
                {filteredCommands.map((cmd, idx) => {
                  const globalIdx = equipmentResults.length + idx;
                  const isSelected = selectedIndex === globalIdx;
                  return (
                    <ListItem key={cmd.path + cmd.title} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        selected={isSelected}
                        onClick={() => handleSelect(globalIdx)}
                        sx={{
                          borderRadius: '10px',
                          py: 1,
                          px: 1.5,
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(2, 132, 199, 0.08)',
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>{cmd.icon}</ListItemIcon>
                        <ListItemText
                          primary={cmd.title}
                          primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                          {cmd.category}
                        </Typography>
                        <KeyboardReturnIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}

          {totalItems === 0 && !loading && (
            <EmptyState
              title={`Ничего не найдено по запросу «${query}»`}
              description="Попробуйте изменить поисковый запрос или проверить правильность написания."
              minHeight={140}
            />
          )}
        </Box>

        {/* Footer Hint Bar */}
        <Divider />
        <Box
          sx={{
            px: 2.5,
            py: 1.25,
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#64748b',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2 }}>
            <span>↑↓ Навигация</span>
            <span>↵ Выбрать</span>
            <span>ESC Закрыть</span>
          </Box>
          <Typography variant="caption" color="text.secondary">
            EMS Command Palette
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

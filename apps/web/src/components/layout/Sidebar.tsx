'use client';

import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Collapse,
  Chip,
} from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import TuneIcon from '@mui/icons-material/Tune';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS } from '@ems/shared';

const DRAWER_WIDTH = 260;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  variant?: 'permanent' | 'temporary';
}

export default function Sidebar({ open, onClose, variant = 'permanent' }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasPermission } = useAuth();

  const [epsOpen, setEpsOpen] = React.useState(true);
  const [adminOpen, setAdminOpen] = React.useState(true);

  const navigate = (path: string) => {
    router.push(path);
    if (variant === 'temporary') {
      onClose();
    }
  };

  const isActive = (path: string, exact = false) => {
    if (exact) return pathname === path;
    return pathname.startsWith(path);
  };

  const canAccessEps = hasPermission(PERMISSIONS.EPS_EQUIPMENT_VIEW);
  const canAccessWms = hasPermission(PERMISSIONS.WMS_STOCK_VIEW);
  const canAccessSrm = hasPermission(PERMISSIONS.SRM_DASHBOARD_VIEW);
  const canAccessMro = hasPermission(PERMISSIONS.MRO_SCHEDULE_VIEW);
  const canAccessAdmin = user?.roles.includes('admin') || hasPermission(PERMISSIONS.ADMIN_USERS_MANAGE);

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand Header */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            backgroundColor: 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.1rem',
          }}
        >
          E
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.1}>
            EMS
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            Управление оборудованием
          </Typography>
        </Box>
      </Box>
      <Divider />

      {/* Navigation List */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1 }}>
        <List disablePadding>
          {/* EPS MODULE */}
          {canAccessEps && (
            <>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => setEpsOpen(!epsOpen)}
                  selected={isActive('/eps')}
                  sx={{
                    py: 1,
                    px: 2,
                    mx: 1,
                    borderRadius: 1.5,
                    mb: 0.5,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(2, 132, 199, 0.08)',
                      color: 'primary.main',
                      '&:hover': { backgroundColor: 'rgba(2, 132, 199, 0.12)' },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: isActive('/eps') ? 'primary.main' : 'inherit' }}>
                    <PrecisionManufacturingIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="EPS — Оборудование"
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive('/eps') ? 600 : 500 }}
                  />
                  {epsOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </ListItemButton>
              </ListItem>

              <Collapse in={epsOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 3 }}>
                  <ListItemButton
                    onClick={() => navigate('/eps')}
                    selected={pathname === '/eps'}
                    sx={{ py: 0.75, px: 2, mx: 1, borderRadius: 1.5, mb: 0.25 }}
                  >
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <ListAltIcon fontSize="small" color={pathname === '/eps' ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Реестр оборудования" primaryTypographyProps={{ fontSize: '0.8125rem' }} />
                  </ListItemButton>

                  {hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE) && (
                    <ListItemButton
                      onClick={() => navigate('/eps/new')}
                      selected={pathname === '/eps/new'}
                      sx={{ py: 0.75, px: 2, mx: 1, borderRadius: 1.5, mb: 0.25 }}
                    >
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <AddCircleOutlineIcon fontSize="small" color={pathname === '/eps/new' ? 'primary' : 'inherit'} />
                      </ListItemIcon>
                      <ListItemText primary="Добавить единицу" primaryTypographyProps={{ fontSize: '0.8125rem' }} />
                    </ListItemButton>
                  )}

                  <ListItemButton
                    onClick={() => navigate('/eps/tags')}
                    selected={pathname === '/eps/tags'}
                    sx={{ py: 0.75, px: 2, mx: 1, borderRadius: 1.5, mb: 0.25 }}
                  >
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <LocalOfferIcon fontSize="small" color={pathname === '/eps/tags' ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Теги и категории" primaryTypographyProps={{ fontSize: '0.8125rem' }} />
                  </ListItemButton>

                  {hasPermission(PERMISSIONS.EPS_CUSTOM_FIELDS_MANAGE) && (
                    <ListItemButton
                      onClick={() => navigate('/eps/custom-fields')}
                      selected={pathname === '/eps/custom-fields'}
                      sx={{ py: 0.75, px: 2, mx: 1, borderRadius: 1.5, mb: 0.25 }}
                    >
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <TuneIcon fontSize="small" color={pathname === '/eps/custom-fields' ? 'primary' : 'inherit'} />
                      </ListItemIcon>
                      <ListItemText primary="Кастомные поля" primaryTypographyProps={{ fontSize: '0.8125rem' }} />
                    </ListItemButton>
                  )}
                </List>
              </Collapse>
            </>
          )}

          {/* WMS MODULE */}
          {canAccessWms && (
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => navigate('/wms')}
                selected={isActive('/wms')}
                sx={{
                  py: 1,
                  px: 2,
                  mx: 1,
                  borderRadius: 1.5,
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(2, 132, 199, 0.08)',
                    color: 'primary.main',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: isActive('/wms') ? 'primary.main' : 'inherit' }}>
                  <Inventory2Icon />
                </ListItemIcon>
                <ListItemText
                  primary="WMS — Складской учёт"
                  primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive('/wms') ? 600 : 500 }}
                />
              </ListItemButton>
            </ListItem>
          )}

          {/* SRM MODULE */}
          {canAccessSrm && (
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => navigate('/srm')}
                selected={isActive('/srm')}
                sx={{
                  py: 1,
                  px: 2,
                  mx: 1,
                  borderRadius: 1.5,
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(2, 132, 199, 0.08)',
                    color: 'primary.main',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: isActive('/srm') ? 'primary.main' : 'inherit' }}>
                  <AssessmentIcon />
                </ListItemIcon>
                <ListItemText
                  primary="SRM — Дашборд Jira"
                  primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive('/srm') ? 600 : 500 }}
                />
              </ListItemButton>
            </ListItem>
          )}

          {/* MRO MODULE */}
          {canAccessMro && (
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => navigate('/mro')}
                selected={isActive('/mro')}
                sx={{
                  py: 1,
                  px: 2,
                  mx: 1,
                  borderRadius: 1.5,
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(2, 132, 199, 0.08)',
                    color: 'primary.main',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: isActive('/mro') ? 'primary.main' : 'inherit' }}>
                  <BuildCircleIcon />
                </ListItemIcon>
                <ListItemText
                  primary="MRO — ТО и Ремонт"
                  primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive('/mro') ? 600 : 500 }}
                />
              </ListItemButton>
            </ListItem>
          )}

          {/* ADMIN SECTION */}
          {canAccessAdmin && (
            <>
              <Box sx={{ mt: 2, mb: 1, px: 3 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.5}>
                  АДМИНИСТРИРОВАНИЕ
                </Typography>
              </Box>

              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => setAdminOpen(!adminOpen)}
                  selected={isActive('/admin')}
                  sx={{
                    py: 1,
                    px: 2,
                    mx: 1,
                    borderRadius: 1.5,
                    mb: 0.5,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(2, 132, 199, 0.08)',
                      color: 'primary.main',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: isActive('/admin') ? 'primary.main' : 'inherit' }}>
                    <AdminPanelSettingsIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Управление"
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive('/admin') ? 600 : 500 }}
                  />
                  {adminOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </ListItemButton>
              </ListItem>

              <Collapse in={adminOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 3 }}>
                  <ListItemButton
                    onClick={() => navigate('/admin/users')}
                    selected={pathname === '/admin/users'}
                    sx={{ py: 0.75, px: 2, mx: 1, borderRadius: 1.5, mb: 0.25 }}
                  >
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <PeopleIcon fontSize="small" color={pathname === '/admin/users' ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Пользователи" primaryTypographyProps={{ fontSize: '0.8125rem' }} />
                  </ListItemButton>

                  <ListItemButton
                    onClick={() => navigate('/admin/roles')}
                    selected={pathname === '/admin/roles'}
                    sx={{ py: 0.75, px: 2, mx: 1, borderRadius: 1.5, mb: 0.25 }}
                  >
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <SecurityIcon fontSize="small" color={pathname === '/admin/roles' ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Роли и права" primaryTypographyProps={{ fontSize: '0.8125rem' }} />
                  </ListItemButton>

                  <ListItemButton
                    onClick={() => navigate('/admin/audit-log')}
                    selected={pathname === '/admin/audit-log'}
                    sx={{ py: 0.75, px: 2, mx: 1, borderRadius: 1.5, mb: 0.25 }}
                  >
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <HistoryIcon fontSize="small" color={pathname === '/admin/audit-log' ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Журнал аудита" primaryTypographyProps={{ fontSize: '0.8125rem' }} />
                  </ListItemButton>

                  <ListItemButton
                    onClick={() => navigate('/admin/settings')}
                    selected={pathname === '/admin/settings'}
                    sx={{ py: 0.75, px: 2, mx: 1, borderRadius: 1.5, mb: 0.25 }}
                  >
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <SettingsIcon fontSize="small" color={pathname === '/admin/settings' ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Настройки системы" primaryTypographyProps={{ fontSize: '0.8125rem' }} />
                  </ListItemButton>
                </List>
              </Collapse>
            </>
          )}
        </List>
      </Box>

      {/* Footer */}
      <Divider />
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary" display="block">
          EMS v1.0.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
      {variant === 'temporary' ? (
        <Drawer
          variant="temporary"
          open={open}
          onClose={onClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: '1px solid #e2e8f0' },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: '1px solid #e2e8f0' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      )}
    </Box>
  );
}

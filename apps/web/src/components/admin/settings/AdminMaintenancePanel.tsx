import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Paper,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import EngineeringIcon from '@mui/icons-material/Engineering';
import { PlatformMaintenanceStatus } from '@ems/shared';
import { StatusBadge } from '@/components/ui';

export interface AdminMaintenancePanelProps {
  maintStatus: PlatformMaintenanceStatus;
  savingMaintenance: boolean;
  onGlobalMaintSwitch: (checked: boolean) => void;
  onSystemMessageChange: (message: string) => void;
  onEstimatedUntilChange: (estimatedUntil: string) => void;
  onSaveSystemMaintDetails: () => void;
  onToggleModuleMaint: (moduleId: string, enabled: boolean) => void;
}

interface MaintenanceModuleItem {
  id: keyof PlatformMaintenanceStatus['modules'];
  name: string;
  desc: string;
  icon: React.ReactNode;
}

const MODULE_ITEMS: MaintenanceModuleItem[] = [
  {
    id: 'eps',
    name: 'Паспортизация оборудования (EPS)',
    desc: 'Реестр оборудования, технические паспорта, классификаторы и структура технических параметров.',
    icon: <BadgeOutlinedIcon color="primary" sx={{ fontSize: 24 }} />,
  },
  {
    id: 'wms',
    name: 'Складской учёт ТМЦ (WMS)',
    desc: 'Управление складами, остатками ТМЦ, перемещениями, приходами, расходами и инвентаризацией.',
    icon: <WarehouseOutlinedIcon color="primary" sx={{ fontSize: 24 }} />,
  },
  {
    id: 'srm',
    name: 'Управление инцидентами и сервисом (SRM)',
    desc: 'Учёт инцидентов, синхронизация с Service Desk, статистика отказов и расчет показателей надежности (MTTR / MTBF).',
    icon: <AnalyticsOutlinedIcon color="primary" sx={{ fontSize: 24 }} />,
  },
  {
    id: 'mro',
    name: 'Техническое обслуживание и ремонт (MRO)',
    desc: 'Графики ППР, технологические регламенты, проведение ТО и списание комплектующих.',
    icon: <BuildOutlinedIcon color="primary" sx={{ fontSize: 24 }} />,
  },
];

export function AdminMaintenancePanel({
  maintStatus,
  savingMaintenance,
  onGlobalMaintSwitch,
  onSystemMessageChange,
  onEstimatedUntilChange,
  onSaveSystemMaintDetails,
  onToggleModuleMaint,
}: AdminMaintenancePanelProps) {
  return (
    <>
      <Card
        sx={{
          borderRadius: '12px',
          border: maintStatus.system.enabled ? '2px solid warning.main' : '1px solid divider',
          backgroundColor: maintStatus.system.enabled ? 'warning.light' : 'background.paper',
          boxShadow: maintStatus.system.enabled ? '0 4px 20px rgba(234, 88, 12, 0.12)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '10px',
                  backgroundColor: maintStatus.system.enabled ? 'warning.light' : 'action.hover',
                  color: maintStatus.system.enabled ? 'warning.main' : 'text.secondary',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <EngineeringIcon sx={{ fontSize: 26 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ color: maintStatus.system.enabled ? 'warning.dark' : 'text.primary' }}>
                  Техническое обслуживание платформы
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                  Перевод всей системы в режим ТО с блокировкой входа для всех пользователей кроме администратора
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <StatusBadge
                status={maintStatus.system.enabled ? 'MAINTENANCE' : 'ACTIVE'}
                label={maintStatus.system.enabled ? 'РЕЖИМ ТО (ВХОД ОГРАНИЧЕН)' : 'ШТАТНЫЙ РЕЖИМ (ДОСТУПЕН ВСЕМ)'}
                size="medium"
              />
              <Switch
                checked={maintStatus.system.enabled}
                onChange={(event) => onGlobalMaintSwitch(event.target.checked)}
                color="warning"
                disabled={savingMaintenance}
                sx={{ transform: 'scale(1.2)' }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                label="Сообщение для пользователей на экране входа"
                fullWidth
                size="small"
                multiline
                rows={2}
                value={maintStatus.system.message || ''}
                onChange={(event) => onSystemMessageChange(event.target.value)}
                placeholder="Например: Проводятся регламентные технические работы по обновлению базы данных."
                helperText="Данный текст увидят пользователи на странице авторизации /login"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Плановое время окончания ТО"
                fullWidth
                size="small"
                value={maintStatus.system.estimatedUntil || ''}
                onChange={(event) => onEstimatedUntilChange(event.target.value)}
                placeholder="Например: Сегодня до 18:30 МСК"
                helperText="Ориентировочный срок завершения для информирования"
              />
              <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onSaveSystemMaintDetails}
                  disabled={savingMaintenance}
                  sx={{ fontWeight: 600, borderRadius: '8px' }}
                >
                  Сохранить текст ТО
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TuneOutlinedIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Техническое обслуживание модулей (EPS, WMS, SRM, MRO)
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph sx={{ fontSize: '0.8125rem' }}>
            При переводе модуля в режим ТО обычные пользователи видят информационный экран-заглушку, а администратор сохраняет доступ для проведения настройки и проверки.
          </Typography>
          <Divider sx={{ mb: 2.5 }} />

          <Grid container spacing={2}>
            {MODULE_ITEMS.map((module) => {
              const moduleMaintenance = maintStatus.modules[module.id];
              const isMaint = Boolean(moduleMaintenance.enabled);

              return (
                <Grid item xs={12} sm={6} md={3} key={module.id}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      height: '100%',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      backgroundColor: isMaint ? 'warning.light' : 'background.paper',
                      borderColor: isMaint ? 'warning.light' : 'divider',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      },
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {module.icon}
                          <Typography variant="subtitle1" fontWeight={700} fontSize="0.875rem">
                            {module.name}
                          </Typography>
                        </Box>
                        <StatusBadge
                          status={isMaint ? 'MAINTENANCE' : 'ACTIVE'}
                          label={isMaint ? 'ТО' : 'Штатно'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78125rem', lineHeight: 1.4, mb: 2 }}>
                        {module.desc}
                      </Typography>
                    </Box>

                    <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="caption" fontWeight={600} color={isMaint ? 'warning.main' : 'primary.main'}>
                        {isMaint ? 'Режим ТО включен' : 'Работает штатно'}
                      </Typography>
                      <Switch
                        checked={isMaint}
                        onChange={(event) => onToggleModuleMaint(module.id, event.target.checked)}
                        color="warning"
                        size="small"
                      />
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>
    </>
  );
}

export default AdminMaintenancePanel;

'use client';

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Stack,
  Divider,
  Paper,
  InputAdornment,
  Radio,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import HubIcon from '@mui/icons-material/Hub';

export type SrmProviderType = 'DISABLED' | 'JIRA' | 'REDMINE' | 'GITLAB' | 'GENERIC_REST';

export interface SetupStorageSrmStepProps {
  storageDir: string;
  setStorageDir: (val: string) => void;
  srmProvider: SrmProviderType;
  setSrmProvider: (val: SrmProviderType) => void;
  srmUrl: string;
  setSrmUrl: (val: string) => void;
  srmProjectKey: string;
  setSrmProjectKey: (val: string) => void;
  srmApiKey: string;
  setSrmApiKey: (val: string) => void;
}

const SRM_PROVIDERS: { id: SrmProviderType; label: string; desc: string }[] = [
  { id: 'DISABLED', label: 'Отключено', desc: 'Автономная работа' },
  { id: 'JIRA', label: 'Atlassian Jira', desc: 'Jira Cloud / Server' },
  { id: 'REDMINE', label: 'Redmine', desc: 'REST API' },
  { id: 'GITLAB', label: 'GitLab Issues', desc: 'GitLab API' },
  { id: 'GENERIC_REST', label: 'Custom REST API', desc: 'Универсальный вебхук' },
];

export function SetupStorageSrmStep({
  storageDir,
  setStorageDir,
  srmProvider,
  setSrmProvider,
  srmUrl,
  setSrmUrl,
  srmProjectKey,
  setSrmProjectKey,
  srmApiKey,
  setSrmApiKey,
}: SetupStorageSrmStepProps) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Настройка файлового хранилища
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Укажите путь для хранения прикрепленных паспортов, актов, сертификатов и фото оборудования.
        </Typography>
      </Box>

      <TextField
        fullWidth
        label="Директория хранения файлов, паспортов и чертежей"
        value={storageDir}
        onChange={(e) => setStorageDir(e.target.value)}
        helperText="Локальный каталог сервера или путь внутри Docker-тома (/app/uploads)"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <FolderOpenIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
      />

      <Divider />

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <HubIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography variant="subtitle1" fontWeight={800}>
            Интеграция с внешней системой ServiceDesk (SRM) — опционально
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {SRM_PROVIDERS.map((prov) => (
            <Grid item xs={12} sm={4} key={prov.id}>
              <Paper
                onClick={() => setSrmProvider(prov.id)}
                variant="outlined"
                sx={{
                  p: 1.5,
                  cursor: 'pointer',
                  borderRadius: 2.5,
                  border: '2px solid',
                  borderColor: srmProvider === prov.id ? 'primary.main' : 'divider',
                  bgcolor: srmProvider === prov.id ? 'rgba(2, 132, 199, 0.04)' : 'background.paper',
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': { borderColor: 'primary.light' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Radio checked={srmProvider === prov.id} size="small" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    {prov.label}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ pl: 3.5, display: 'block' }}>
                  {prov.desc}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {srmProvider !== 'DISABLED' && (
          <Grid
            container
            spacing={2}
            sx={{ p: 2.5, bgcolor: 'background.default', borderRadius: 3, border: '1px solid divider' }}
          >
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="URL внешней системы"
                placeholder="https://jira.company.com или https://redmine.local"
                value={srmUrl}
                onChange={(e) => setSrmUrl(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Ключ проекта"
                placeholder="EMS"
                value={srmProjectKey}
                onChange={(e) => setSrmProjectKey(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="API Token / Ключ доступа"
                placeholder="••••••••••••"
                value={srmApiKey}
                onChange={(e) => setSrmApiKey(e.target.value)}
              />
            </Grid>
          </Grid>
        )}
      </Box>
    </Stack>
  );
}

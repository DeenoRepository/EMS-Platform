'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function ImportRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/module-settings?tab=eps&subtab=import');
  }, [router]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 2 }}>
      <CircularProgress size={36} color="primary" />
      <Typography variant="body2" color="text.secondary">
        Перенаправление в мастер импорта оборудования (настройки модуля EPS)...
      </Typography>
    </Box>
  );
}

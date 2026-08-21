'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  useEffect(() => {
    if (tab === 'import') {
      router.replace('/admin/module-settings?tab=eps&subtab=import');
    } else {
      router.replace('/admin/module-settings?tab=eps');
    }
  }, [router, tab]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 2 }}>
      <CircularProgress size={36} color="primary" />
      <Typography variant="body2" color="text.secondary">
        Перенаправление в настройки модуля (Shell)...
      </Typography>
    </Box>
  );
}

export default function EpsSettingsRedirectPage() {
  return (
    <Suspense fallback={null}>
      <RedirectContent />
    </Suspense>
  );
}

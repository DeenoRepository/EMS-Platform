'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button } from '@mui/material';
import { useAuth } from '@/lib/auth-client';
import { PageLoading } from '@/components/ui';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/eps');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  // Safety fallback for fast redirection
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoading) {
        if (user) {
          window.location.href = '/eps';
        } else {
          window.location.href = '/login';
        }
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [user, isLoading]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        gap: 1,
      }}
    >
      <PageLoading text="Загрузка системы EMS..." minHeight={120} />
      <Button
        variant="text"
        size="small"
        onClick={() => {
          window.location.href = user ? '/eps' : '/login';
        }}
        sx={{ mt: 1, textTransform: 'none', color: 'primary.main' }}
      >
        Перейти в раздел оборудования →
      </Button>
    </Box>
  );
}


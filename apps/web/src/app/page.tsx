'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-client';
import { Box, CircularProgress, Typography, Button } from '@mui/material';

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
        gap: 2,
      }}
    >
      <CircularProgress size={44} thickness={4} />
      <Typography variant="body2" color="text.secondary">
        Загрузка системы EMS...
      </Typography>
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


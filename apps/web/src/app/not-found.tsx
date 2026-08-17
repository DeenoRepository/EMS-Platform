'use client';

import React from 'react';
import { Container, Paper } from '@mui/material';
import { ErrorState } from '@/components/ui/ErrorState';
import SearchOffIcon from '@mui/icons-material/SearchOff';

export default function NotFound() {
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <ErrorState
          statusCode={404}
          title="Запрашиваемая страница не найдена"
          description="Страница была перемещена, удалена или указан неверный адрес в строке браузера."
          icon={<SearchOffIcon sx={{ fontSize: 36 }} />}
        />
      </Paper>
    </Container>
  );
}

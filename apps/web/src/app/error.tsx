'use client';

import React, { useEffect } from 'react';
import { Box, Container, Paper } from '@mui/material';
import { ErrorState } from '@/components/ui/ErrorState';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Next.js App Router error:', error);
  }, [error]);

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <ErrorState
          statusCode={500}
          title="Внутренняя системная ошибка приложения"
          description="Произошел сбой при обработке запроса страницы. Нажмите кнопку «Повторить попытку» или вернитесь на главную страницу."
          error={error}
          onRetry={reset}
        />
      </Paper>
    </Container>
  );
}

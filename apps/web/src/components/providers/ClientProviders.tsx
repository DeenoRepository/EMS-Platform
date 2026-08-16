'use client';

import React from 'react';
import { SnackbarProvider } from 'notistack';
import { AuthProvider } from '@/lib/auth-client';
import AppLayout from '@/components/layout/AppLayout';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SnackbarProvider
      maxSnack={3}
      autoHideDuration={3500}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <AuthProvider>
        <AppLayout>{children}</AppLayout>
      </AuthProvider>
    </SnackbarProvider>
  );
}

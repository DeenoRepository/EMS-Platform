'use client';

import React from 'react';
import { SnackbarProvider } from 'notistack';
import { AuthProvider } from '@/lib/auth-client';
import { ConfirmProvider, CommandPalette } from '@/components/ui';
import AppLayout from '@/components/layout/AppLayout';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SnackbarProvider
      maxSnack={3}
      autoHideDuration={3500}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <AuthProvider>
        <ConfirmProvider>
          <AppLayout>{children}</AppLayout>
          <CommandPalette />
        </ConfirmProvider>
      </AuthProvider>
    </SnackbarProvider>
  );
}


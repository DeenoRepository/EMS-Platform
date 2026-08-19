'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ConfirmDialog, ConfirmDialogProps, ConfirmDialogVariant } from './ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  subtitle?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  confirmWord?: string;
  confirmWordPlaceholder?: string;
  countdownSeconds?: number;
}

type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFunction | null>(null);

export function useConfirm(): ConfirmFunction {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<ConfirmOptions & { open: boolean }>({
    open: false,
    title: '',
    message: '',
    variant: 'primary',
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFunction>((options) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        ...options,
        open: true,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setDialogState((prev) => ({ ...prev, open: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    setDialogState((prev) => ({ ...prev, open: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={dialogState.open}
        title={dialogState.title}
        subtitle={dialogState.subtitle}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        variant={dialogState.variant}
        confirmWord={dialogState.confirmWord}
        confirmWordPlaceholder={dialogState.confirmWordPlaceholder}
        countdownSeconds={dialogState.countdownSeconds}
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    </ConfirmContext.Provider>
  );
}

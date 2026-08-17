'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-client';

export interface PermissionGateProps {
  permission: string | string[];
  match?: 'all' | 'any';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  permission,
  match = 'all',
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];

  let hasAccess = false;
  if (match === 'any') {
    hasAccess = hasAnyPermission(permissions);
  } else {
    hasAccess = permissions.every((p) => hasPermission(p));
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

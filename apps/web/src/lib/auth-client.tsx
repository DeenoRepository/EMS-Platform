'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { JwtUserPayload } from '@ems/shared';

interface AuthContextType {
  user: JwtUserPayload | null;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
  hasAnyPermission: (permissionCodes: string[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<JwtUserPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setUser(json.data);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Редирект на логин если не авторизован (кроме /login)
  useEffect(() => {
    if (!isLoading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/eps');
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = async (username: string, password = '') => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        setUser(data.data.user);
        router.push('/eps');
        return { success: true };
      }
      return { success: false, error: data.error || 'Ошибка входа' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Ошибка сети' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  const hasPermission = (permissionCode: string) => {
    if (!user) return false;
    if (user.roles.includes('admin')) return true;
    return user.permissions.includes(permissionCode);
  };

  const hasAnyPermission = (permissionCodes: string[]) => {
    if (!user) return false;
    if (user.roles.includes('admin')) return true;
    return permissionCodes.some((p) => user.permissions.includes(p));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

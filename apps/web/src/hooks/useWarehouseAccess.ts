'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS } from '@ems/shared';

export interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  location?: string | null;
  responsibleUserId?: string | null;
  responsibleUser?: {
    id: string;
    displayName: string;
    ldapLogin?: string;
  } | null;
  isActive?: boolean;
}

export function useWarehouseAccess() {
  const { user, hasPermission } = useAuth();
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

  const isAdmin = useMemo(() => {
    return Boolean(
      user?.roles?.includes('admin') ||
      hasPermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      hasPermission(PERMISSIONS.WMS_WAREHOUSES_MANAGE)
    );
  }, [user, hasPermission]);

  const fetchWarehouses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/wms/warehouses');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setWarehouses(json.data);
          
          // Auto-select for non-admin storekeeper if they have exactly one assigned warehouse
          if (!isAdmin) {
            const myWhs = json.data.filter((w: WarehouseOption) => w.responsibleUserId === user?.userId);
            if (myWhs.length === 1 && !selectedWarehouseId) {
              setSelectedWarehouseId(myWhs[0].id);
            }
          }
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки складов:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, user?.userId, selectedWarehouseId]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const availableWarehouses = useMemo(() => {
    if (isAdmin) return warehouses;
    const userWhs = warehouses.filter((w) => w.responsibleUserId === user?.userId);
    return userWhs.length > 0 ? userWhs : warehouses;
  }, [warehouses, isAdmin, user?.userId]);

  const myWarehouses = useMemo(() => {
    return warehouses.filter((w) => w.responsibleUserId === user?.userId);
  }, [warehouses, user?.userId]);

  const isStorekeeper = myWarehouses.length > 0;

  const canManageWarehouse = useCallback(
    (warehouseId: string) => {
      if (isAdmin) return true;
      return myWarehouses.some((w) => w.id === warehouseId);
    },
    [isAdmin, myWarehouses]
  );

  return {
    warehouses,
    availableWarehouses,
    myWarehouses,
    isAdmin,
    isStorekeeper,
    isLoading,
    selectedWarehouseId,
    setSelectedWarehouseId,
    canManageWarehouse,
    refetchWarehouses: fetchWarehouses,
  };
}

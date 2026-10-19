'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSnackbar } from 'notistack';
import { WarehouseItem, WarehouseUserOption, WarehouseKpiStats } from './types';

export function useWarehouseManagement(isAdmin: boolean, currentUserId?: string) {
  const { enqueueSnackbar } = useSnackbar();

  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [users, setUsers] = useState<WarehouseUserOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View Mode: 'grid' | 'table'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');

  // Modal: Add / Edit Warehouse
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal: Topology
  const [isTopologyOpen, setIsTopologyOpen] = useState(false);
  const [selectedWarehouseForTopology, setSelectedWarehouseForTopology] = useState<WarehouseItem | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const fetchWarehouses = useCallback(async () => {
    setIsLoading(true);
    try {
      const [whRes, usersRes] = await Promise.all([
        fetch('/api/wms/warehouses?forManage=true'),
        fetch('/api/users'),
      ]);

      if (whRes.ok) {
        const json = await whRes.json();
        if (json.success) {
          setWarehouses(json.data);
        }
      }
      if (usersRes.ok) {
        const json = await usersRes.json();
        if (json.success) {
          setUsers(json.data);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка при загрузке складов', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleOpenCreate = useCallback(() => {
    setEditingId(null);
    setName('');
    setCode('');
    setLocation('');
    setResponsibleUserId('');
    setIsActive(true);
    setIsModalOpen(true);
  }, []);

  const handleGenerateWarehouseCode = useCallback(() => {
    const prefix = 'WH';
    const rand = Math.floor(10 + Math.random() * 90);
    setCode(`${prefix}-${rand}`);
  }, []);

  const handleOpenEdit = useCallback((w: WarehouseItem) => {
    setEditingId(w.id);
    setName(w.name);
    setCode(w.code);
    setLocation(w.location || '');
    setResponsibleUserId(w.responsibleUserId || '');
    setIsActive(w.isActive);
    setIsModalOpen(true);
  }, []);

  const handleOpenTopology = useCallback((w: WarehouseItem) => {
    setSelectedWarehouseForTopology(w);
    setIsTopologyOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      enqueueSnackbar('Укажите наименование склада', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingId ? `/api/wms/warehouses/${editingId}` : '/api/wms/warehouses';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          location: location.trim() || undefined,
          responsibleUserId: responsibleUserId ? responsibleUserId.trim() : null,
          isActive,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar(editingId ? 'Склад обновлен' : 'Склад успешно создан', { variant: 'success' });
        setIsModalOpen(false);
        fetchWarehouses();
      } else {
        enqueueSnackbar(json.error || 'Ошибка сохранения склада', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при сохранении склада', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [editingId, name, code, location, responsibleUserId, isActive, enqueueSnackbar, fetchWarehouses]);

  const visibleWarehouses = useMemo(() => {
    if (isAdmin) return warehouses;
    return warehouses.filter((w) => w.responsibleUserId === currentUserId);
  }, [warehouses, isAdmin, currentUserId]);

  const filteredWarehouses = useMemo(() => {
    if (!search.trim()) return visibleWarehouses;
    const q = search.toLowerCase();
    return visibleWarehouses.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        (w.location && w.location.toLowerCase().includes(q)) ||
        (w.responsibleUser && w.responsibleUser.displayName.toLowerCase().includes(q))
    );
  }, [visibleWarehouses, search]);

  const paginatedWarehouses = useMemo(() => {
    return filteredWarehouses.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [filteredWarehouses, page, rowsPerPage]);

  const kpiStats = useMemo<WarehouseKpiStats>(() => {
    const total = visibleWarehouses.length;
    const active = visibleWarehouses.filter((w) => w.isActive).length;
    const totalStockItems = visibleWarehouses.reduce((acc, w) => acc + (w._count?.stockItems || 0), 0);
    const totalOperations = visibleWarehouses.reduce((acc, w) => acc + (w._count?.operations || 0), 0);
    return { total, active, totalStockItems, totalOperations };
  }, [visibleWarehouses]);

  return {
    warehouses: visibleWarehouses,
    filteredWarehouses,
    paginatedWarehouses,
    users,
    isLoading,
    viewMode,
    search,
    isModalOpen,
    editingId,
    name,
    code,
    location,
    responsibleUserId,
    isActive,
    isSubmitting,
    isTopologyOpen,
    selectedWarehouseForTopology,
    page,
    rowsPerPage,
    kpiStats,
    setViewMode,
    setSearch,
    setIsModalOpen,
    setName,
    setCode,
    setLocation,
    setResponsibleUserId,
    setIsActive,
    setIsTopologyOpen,
    setPage,
    setRowsPerPage,
    handleOpenCreate,
    handleGenerateWarehouseCode,
    handleOpenEdit,
    handleOpenTopology,
    handleSubmit,
    fetchWarehouses,
  };
}

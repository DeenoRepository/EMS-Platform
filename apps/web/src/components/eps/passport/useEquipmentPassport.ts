'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';
import {
  EquipmentDetails,
  CustomSectionDef,
  CustomFieldDef,
  TAB_INDEX_MAP,
  TAB_KEY_MAP,
} from './types';

export function useEquipmentPassport(id: string, initialTabParam?: string | null) {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [equipment, setEquipment] = useState<EquipmentDetails | null>(null);
  const [sections, setSections] = useState<CustomSectionDef[]>([]);
  const [unassignedFields, setUnassignedFields] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState(() => {
    if (initialTabParam && TAB_KEY_MAP[initialTabParam] !== undefined) {
      return TAB_KEY_MAP[initialTabParam];
    }
    return 0;
  });

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Edit State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editCustomFields, setEditCustomFields] = useState<Record<string, any>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Quick Change Responsible
  const [changeRespModalOpen, setChangeRespModalOpen] = useState(false);
  const [newRespName, setNewRespName] = useState('');
  const [newRespUser, setNewRespUser] = useState<any | null>(null);
  const [savingResp, setSavingResp] = useState(false);

  // Fetch full equipment & section meta
  const fetchEquipmentAndMeta = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [eqRes, secRes] = await Promise.all([
        fetch(`/api/eps/equipment/${id}`),
        fetch('/api/eps/custom-sections'),
      ]);

      if (!eqRes.ok) {
        throw new Error('Оборудование не найдено или доступ ограничен');
      }

      const eqJson = await eqRes.json();
      if (!eqJson.success || !eqJson.data) {
        throw new Error(eqJson.error || 'Ошибка формата данных');
      }

      const currentEq: EquipmentDetails = eqJson.data;
      setEquipment(currentEq);

      // Initialize Edit Forms
      setEditForm({
        name: currentEq.name,
        inventoryNumber: currentEq.inventoryNumber || '',
        serialNumber: currentEq.serialNumber || '',
        manufacturer: currentEq.manufacturer || '',
        model: currentEq.model || '',
        location: currentEq.location || '',
        status: currentEq.status,
        commissionDate: currentEq.commissionDate ? currentEq.commissionDate.substring(0, 10) : '',
      });
      setEditCustomFields(currentEq.customFields || {});

      // Custom sections
      if (secRes.ok) {
        const secJson = await secRes.json();
        if (secJson.success && secJson.data) {
          setSections(secJson.data.sections || []);
          setUnassignedFields(secJson.data.unassignedFields || []);
        }
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEquipmentAndMeta();
  }, [fetchEquipmentAndMeta]);

  // Fetch Audit Log
  const fetchAudit = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch(`/api/eps/equipment/${id}/audit`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setAuditLogs(json.data);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingAudit(false);
    }
  }, [id]);

  const handleTabChange = useCallback((newTab: number) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', TAB_INDEX_MAP[newTab] || 'overview');
    router.replace(`/eps/${id}?${params.toString()}`);
    if (newTab === 6) fetchAudit();
  }, [id, router, fetchAudit]);

  const handleFieldChange = useCallback((key: string, value: any, isBase: boolean) => {
    if (isBase) {
      setEditForm((prev: any) => ({ ...prev, [key]: value }));
    } else {
      setEditCustomFields((prev: any) => ({ ...prev, [key]: value }));
    }
  }, []);

  const handleSaveEdit = useCallback(async () => {
    setSavingEdit(true);
    try {
      const payload = {
        ...editForm,
        commissionDate: editForm.commissionDate ? new Date(editForm.commissionDate).toISOString() : null,
        customFields: editCustomFields,
      };

      const res = await fetch(`/api/eps/equipment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Паспорт оборудования успешно обновлен', { variant: 'success' });
        setEditModalOpen(false);
        fetchEquipmentAndMeta();
      } else {
        enqueueSnackbar(json.error || 'Ошибка сохранения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при сохранении изменений', { variant: 'error' });
    } finally {
      setSavingEdit(false);
    }
  }, [id, editForm, editCustomFields, enqueueSnackbar, fetchEquipmentAndMeta]);

  const handleSaveResponsible = useCallback(async () => {
    if (!equipment) return;
    setSavingResp(true);
    try {
      const updatedCustom = {
        ...(equipment.customFields || {}),
        responsible_person_name: newRespName || null,
        responsible_user_login: newRespUser?.ldapLogin || null,
      };

      const res = await fetch(`/api/eps/equipment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customFields: updatedCustom }),
      });

      if (res.ok) {
        enqueueSnackbar('Ответственное лицо успешно назначено', { variant: 'success' });
        setChangeRespModalOpen(false);
        fetchEquipmentAndMeta();
      } else {
        const json = await res.json();
        enqueueSnackbar(json.error || 'Ошибка назначения МОЛ', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при назначении ответственного', { variant: 'error' });
    } finally {
      setSavingResp(false);
    }
  }, [id, equipment, newRespName, newRespUser, enqueueSnackbar, fetchEquipmentAndMeta]);

  const handleCopy = useCallback((text: string, label: string) => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text);
    enqueueSnackbar(`${label} скопирован в буфер: ${text}`, {
      variant: 'info',
      autoHideDuration: 2200,
    });
  }, [enqueueSnackbar]);

  return {
    equipment,
    sections,
    unassignedFields,
    loading,
    loadError,
    activeTab,
    auditLogs,
    loadingAudit,
    editModalOpen,
    editForm,
    editCustomFields,
    savingEdit,
    changeRespModalOpen,
    newRespName,
    newRespUser,
    savingResp,
    setEditModalOpen,
    setChangeRespModalOpen,
    setNewRespName,
    setNewRespUser,
    handleTabChange,
    handleFieldChange,
    handleSaveEdit,
    handleSaveResponsible,
    handleCopy,
    fetchEquipmentAndMeta,
    fetchAudit,
  };
}

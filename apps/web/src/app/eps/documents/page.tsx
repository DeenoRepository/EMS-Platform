'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef, Suspense } from 'react';
import {
  Box,
  Card,
  Grid,
  Typography,
  TextField,
  MenuItem,
  Button,
  Chip,
  Pagination,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Autocomplete,
  Paper,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  CardContent,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FolderZipOutlinedIcon from '@mui/icons-material/FolderZipOutlined';
import SchemaOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PageHeader from '@/components/layout/PageHeader';
import { useRouter, useSearchParams } from 'next/navigation';
import { DOCUMENT_TYPE_MAP, formatDate, formatBytes, PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';
import { matchFileNameToTargets, type DocumentMatchResult } from '@/lib/eps-document-matcher';

import {
  StatCard,
  SearchInput,
  FilterToolbar,
  EmptyState,
  DataTableWrapper,
  ConfirmDialog,
  PageLoading,
  FormDialog,
  StatusBadge,
  type TableColumnOption,
  FileUploadDropzone,
} from '@/components/ui';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';

interface DocumentItem {
  id: string;
  equipmentId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  docType: string;
  version: number;
  description: string | null;
  createdAt: string;
  equipment: {
    id: string;
    name: string;
    inventoryNumber: string | null;
    manufacturer: string | null;
    model: string | null;
    location: string | null;
    status: string;
  };
  uploadedBy: {
    id: string;
    displayName: string;
    ldapLogin: string;
  };
}

interface EquipmentOption {
  id: string;
  name: string;
  inventoryNumber: string | null;
  model: string | null;
  decimalNumber?: string | null;
  customFields?: Record<string, any> | null;
}

function getEquipmentDecimalNumber(item: any): string {
  if (!item) return '';
  if (item.decimalNumber) return String(item.decimalNumber).trim();
  const custom = item.customFields;
  if (!custom) return '';
  return String(
    custom.decimal_number ||
    custom.detsimalnyy_nomer ||
    custom.decimalNumber ||
    custom['децимальный номер'] ||
    ''
  ).trim();
}

function normalizeEquipmentSearch(value: string | null | undefined): string {
  const raw = (value || '').toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
  const tokens = raw.replace(/[^a-zа-я0-9]+/gi, ' ').trim();
  const compact = raw.replace(/[^a-zа-я0-9]+/gi, '');
  return `${tokens} ${compact}`.trim();
}

interface UploadBatchFileItem {
  file: File;
  match: DocumentMatchResult;
  docType: string;
  bindingMode: 'DECIMAL' | 'MODEL' | 'EQUIPMENT' | 'GLOBAL';
  model?: string | null;
  decimalNumber?: string | null;
  equipmentId?: string | null;
  equipmentName?: string | null;
}

function filterEquipmentOptions(options: EquipmentOption[], inputValue: string): EquipmentOption[] {
  const searchTokens = (inputValue || '')
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (searchTokens.length === 0) return options;

  return options.filter((option) => {
    const decimalNumber = getEquipmentDecimalNumber(option);
    const searchable = normalizeEquipmentSearch([
      option.inventoryNumber,
      option.name,
      option.model,
      decimalNumber,
    ].filter(Boolean).join(' '));
    return searchTokens.every((token) => searchable.includes(token));
  });
}

function DocumentsListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [items, setItems] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Sorting
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleRequestSort = (property: string) => {
    const isAsc = sortField === property && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(property);
  };

  const sortedItems = useMemo(() => {
    if (!sortField) return items;
    return [...items].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      switch (sortField) {
        case 'name':
          aVal = a.originalName || a.fileName || '';
          bVal = b.originalName || b.fileName || '';
          break;
        case 'equipment':
          aVal = a.equipment?.name || a.equipment?.inventoryNumber || '';
          bVal = b.equipment?.name || b.equipment?.inventoryNumber || '';
          break;
        case 'docType':
          aVal = a.docType || '';
          bVal = b.docType || '';
          break;
        case 'description':
          aVal = a.description || '';
          bVal = b.description || '';
          break;
        case 'size':
          aVal = Number(a.fileSize || 0);
          bVal = Number(b.fileSize || 0);
          break;
        case 'uploadedBy':
          aVal = a.uploadedBy?.displayName || a.uploadedBy?.ldapLogin || '';
          bVal = b.uploadedBy?.displayName || b.uploadedBy?.ldapLogin || '';
          break;
        case 'date':
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          aVal = (a as any)[sortField] || '';
          bVal = (b as any)[sortField] || '';
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal), 'ru')
        : String(bVal).localeCompare(String(aVal), 'ru');
    });
  }, [items, sortField, sortDirection]);

  // Filters
  const [search, setSearch] = useState(searchParams?.get('search') || '');
  const [docTypeFilter, setDocTypeFilter] = useState(searchParams?.get('docType') || '');
  const [equipmentFilter, setEquipmentFilter] = useState(searchParams?.get('equipmentId') || '');

  // Equipment options for filter & upload
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);

  // Statistics
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalSizeBytes: 0,
    byTypeCounts: {} as Record<string, number>,
  });

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [bindingMode, setBindingMode] = useState<'EQUIPMENT' | 'MODEL' | 'DECIMAL'>('EQUIPMENT');
  const [selectedEquipmentForUpload, setSelectedEquipmentForUpload] = useState<EquipmentOption | null>(null);
  const [selectedModelForUpload, setSelectedModelForUpload] = useState<string | null>(null);
  const [modelSearchInput, setModelSearchInput] = useState('');
  const [selectedDecimalForUpload, setSelectedDecimalForUpload] = useState<string | null>(null);
  const [decimalSearchInput, setDecimalSearchInput] = useState('');
  const [applyToAllModel, setApplyToAllModel] = useState(false);
  const [applyToAllDecimal, setApplyToAllDecimal] = useState(false);
  const [availableBindingTargets, setAvailableBindingTargets] = useState<{
    models: { model: string; count: number; sampleEquipment: string[] }[];
    decimalNumbers: { decimalNumber: string; count: number; sampleEquipment: string[] }[];
  }>({ models: [], decimalNumbers: [] });
  const [equipmentSearchInput, setEquipmentSearchInput] = useState('');
  const [uploadEquipmentOptions, setUploadEquipmentOptions] = useState<EquipmentOption[]>([]);
  const [uploadEquipmentLoading, setUploadEquipmentLoading] = useState(false);
  const uploadSearchRequestRef = useRef(0);
  const uploadEquipmentOptionsWithSelected = useMemo(() => {
    const selectedMatchesSearch = !equipmentSearchInput.trim() || filterEquipmentOptions([selectedEquipmentForUpload].filter(Boolean) as EquipmentOption[], equipmentSearchInput).length > 0;
    if (!selectedEquipmentForUpload || !selectedMatchesSearch || uploadEquipmentOptions.some((option) => option.id === selectedEquipmentForUpload.id)) {
      return uploadEquipmentOptions;
    }
    return [selectedEquipmentForUpload, ...uploadEquipmentOptions];
  }, [selectedEquipmentForUpload, uploadEquipmentOptions, equipmentSearchInput]);
  const [uploadDocType, setUploadDocType] = useState('SCHEMA');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [autoMatchResult, setAutoMatchResult] = useState<DocumentMatchResult | null>(null);
  const [batchFileItems, setBatchFileItems] = useState<UploadBatchFileItem[]>([]);
  const [useUnifiedBinding, setUseUnifiedBinding] = useState(false);

  const handleFilesChange = useCallback((files: File[]) => {
    setSelectedFiles(files);
    if (!files || files.length === 0) {
      setAutoMatchResult(null);
      setBatchFileItems([]);
      return;
    }

    const initialBatch: UploadBatchFileItem[] = files.map((file) => {
      const match = matchFileNameToTargets(file.name, {
        models: availableBindingTargets.models,
        decimalNumbers: availableBindingTargets.decimalNumbers,
        equipmentList,
      });

      let mode: 'DECIMAL' | 'MODEL' | 'EQUIPMENT' = 'EQUIPMENT';
      if (match.suggestedBindingMode === 'DECIMAL' && match.matchedDecimalNumber) {
        mode = 'DECIMAL';
      } else if (match.suggestedBindingMode === 'MODEL' && match.matchedModel) {
        mode = 'MODEL';
      } else if (match.suggestedBindingMode === 'EQUIPMENT' && match.matchedEquipment) {
        mode = 'EQUIPMENT';
      }

      return {
        file,
        match,
        docType: match.detectedDocType && match.detectedDocType !== 'OTHER' ? match.detectedDocType : 'SCHEMA',
        bindingMode: mode,
        model: mode === 'MODEL' ? match.matchedModel : null,
        decimalNumber: mode === 'DECIMAL' ? match.matchedDecimalNumber : null,
        equipmentId: mode === 'EQUIPMENT' ? match.matchedEquipment?.id || null : null,
        equipmentName: match.matchedEquipment
          ? `${match.matchedEquipment.inventoryNumber ? `[${match.matchedEquipment.inventoryNumber}] ` : ''}${match.matchedEquipment.name}`
          : null,
      };
    });
    setBatchFileItems(initialBatch);

    const primaryFile = files[0];
    const primaryMatch = initialBatch[0]?.match || null;
    setAutoMatchResult(primaryMatch);

    if (primaryMatch) {
      if (primaryMatch.detectedDocType && primaryMatch.detectedDocType !== 'OTHER') {
        setUploadDocType(primaryMatch.detectedDocType);
      }

      if (primaryMatch.suggestedBindingMode === 'DECIMAL' && primaryMatch.matchedDecimalNumber) {
        setBindingMode('DECIMAL');
        setSelectedDecimalForUpload(primaryMatch.matchedDecimalNumber);
        setDecimalSearchInput(primaryMatch.matchedDecimalNumber);
      } else if (primaryMatch.suggestedBindingMode === 'MODEL' && primaryMatch.matchedModel) {
        setBindingMode('MODEL');
        setSelectedModelForUpload(primaryMatch.matchedModel);
        setModelSearchInput(primaryMatch.matchedModel);
      } else if (primaryMatch.suggestedBindingMode === 'EQUIPMENT' && primaryMatch.matchedEquipment) {
        setBindingMode('EQUIPMENT');
        setSelectedEquipmentForUpload(primaryMatch.matchedEquipment as EquipmentOption);
      }
    }

    // 2. Серверная верификация всех файлов через прямой поиск по БД
    fetch('/api/eps/documents/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileNames: files.map((f) => f.name) }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && Array.isArray(json.data?.matches)) {
          const sMatches: DocumentMatchResult[] = json.data.matches;
          setBatchFileItems((prev) =>
            prev.map((item) => {
              const sMatch = sMatches.find((m) => m.fileName === item.file.name);
              if (!sMatch || sMatch.confidence === 'none') return item;

              let mode: 'DECIMAL' | 'MODEL' | 'EQUIPMENT' = 'EQUIPMENT';
              if (sMatch.suggestedBindingMode === 'DECIMAL' && sMatch.matchedDecimalNumber) {
                mode = 'DECIMAL';
              } else if (sMatch.suggestedBindingMode === 'MODEL' && sMatch.matchedModel) {
                mode = 'MODEL';
              } else if (sMatch.suggestedBindingMode === 'EQUIPMENT' && sMatch.matchedEquipment) {
                mode = 'EQUIPMENT';
              }

              return {
                ...item,
                match: sMatch,
                docType: sMatch.detectedDocType && sMatch.detectedDocType !== 'OTHER' ? sMatch.detectedDocType : item.docType,
                bindingMode: mode,
                model: mode === 'MODEL' ? sMatch.matchedModel : null,
                decimalNumber: mode === 'DECIMAL' ? sMatch.matchedDecimalNumber : null,
                equipmentId: mode === 'EQUIPMENT' ? sMatch.matchedEquipment?.id || null : null,
                equipmentName: sMatch.matchedEquipment
                  ? `${sMatch.matchedEquipment.inventoryNumber ? `[${sMatch.matchedEquipment.inventoryNumber}] ` : ''}${sMatch.matchedEquipment.name}`
                  : item.equipmentName,
              };
            })
          );

          if (sMatches[0] && sMatches[0].confidence !== 'none') {
            setAutoMatchResult(sMatches[0]);
            if (sMatches[0].detectedDocType && sMatches[0].detectedDocType !== 'OTHER') {
              setUploadDocType(sMatches[0].detectedDocType);
            }
            if (sMatches[0].suggestedBindingMode === 'DECIMAL' && sMatches[0].matchedDecimalNumber) {
              setBindingMode('DECIMAL');
              setSelectedDecimalForUpload(sMatches[0].matchedDecimalNumber);
              setDecimalSearchInput(sMatches[0].matchedDecimalNumber);
            } else if (sMatches[0].suggestedBindingMode === 'MODEL' && sMatches[0].matchedModel) {
              setBindingMode('MODEL');
              setSelectedModelForUpload(sMatches[0].matchedModel);
              setModelSearchInput(sMatches[0].matchedModel);
            } else if (sMatches[0].suggestedBindingMode === 'EQUIPMENT' && sMatches[0].matchedEquipment) {
              setBindingMode('EQUIPMENT');
              setSelectedEquipmentForUpload(sMatches[0].matchedEquipment as EquipmentOption);
            }
          }
        }
      })
      .catch(() => {});
  }, [availableBindingTargets, equipmentList]);

  // Confirm Delete Dialog State
  const [deleteDialogDoc, setDeleteDialogDoc] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch binding targets (distinct models and decimal numbers with counts)
  const fetchBindingTargets = useCallback(async () => {
    try {
      const res = await fetch('/api/eps/documents/binding-targets');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setAvailableBindingTargets(json.data);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Load equipment list for picker
  useEffect(() => {
    async function loadEquipment() {
      try {
        const res = await fetch('/api/eps/equipment?pageSize=100');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.items) {
            setEquipmentList(
              json.data.items.map((eq: any) => ({
                id: eq.id,
                name: eq.name,
                inventoryNumber: eq.inventoryNumber,
                model: eq.model,
              }))
            );
          }
        }
      } catch {
        // ignore
      }
    }
    loadEquipment();
    fetchBindingTargets();
  }, [fetchBindingTargets]);

  useEffect(() => {
    const query = equipmentSearchInput.trim();
    const requestId = ++uploadSearchRequestRef.current;
    const controller = new AbortController();
    setUploadEquipmentOptions([]);
    setUploadEquipmentLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ page: '1', pageSize: '50' });
        if (query) params.set('search', query);
        const response = await fetch(`/api/eps/equipment?${params.toString()}`, { signal: controller.signal });
        if (!response.ok || requestId !== uploadSearchRequestRef.current) return;
        const json = await response.json();
        if (json.success && Array.isArray(json.data?.items) && requestId === uploadSearchRequestRef.current) {
          setUploadEquipmentOptions(json.data.items.map((equipment: any) => ({
            id: equipment.id,
            name: equipment.name,
            inventoryNumber: equipment.inventoryNumber,
            model: equipment.model,
            decimalNumber: getEquipmentDecimalNumber(equipment),
            customFields: equipment.customFields,
          })));
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Ошибка поиска оборудования для документа:', error);
        }
      } finally {
        if (requestId === uploadSearchRequestRef.current) setUploadEquipmentLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [equipmentSearchInput]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.append('search', search);
      if (docTypeFilter) params.append('docType', docTypeFilter);
      if (equipmentFilter) params.append('equipmentId', equipmentFilter);

      const res = await fetch(`/api/eps/documents?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setItems(json.data.items || []);
          setTotal(json.data.total || 0);
          if (json.data.stats) {
            setStats(json.data.stats);
          }
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки электронного архива документов', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, docTypeFilter, equipmentFilter, enqueueSnackbar]);

  const canAccessDocs =
    user?.roles?.includes('admin') ||
    hasPermission(PERMISSIONS.EPS_DOCUMENTS_VIEW) ||
    hasPermission(PERMISSIONS.EPS_DOCUMENTS_UPLOAD);

  useEffect(() => {
    if (canAccessDocs) {
      fetchDocuments();
    }
  }, [canAccessDocs, fetchDocuments]);

  const handleKpiFilter = (docType: string) => {
    if (docTypeFilter === docType) {
      setDocTypeFilter('');
    } else {
      setDocTypeFilter(docType);
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setDocTypeFilter('');
    setEquipmentFilter('');
    setPage(1);
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialogDoc) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/eps/documents/${deleteDialogDoc.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        enqueueSnackbar(`Документ «${deleteDialogDoc.name}» успешно удален`, { variant: 'info' });
        setDeleteDialogDoc(null);
        fetchDocuments();
      } else {
        enqueueSnackbar(json.error || 'Ошибка удаления', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при удалении', { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const isMultiAutoReady = useMemo(() => {
    return (
      selectedFiles.length > 1 &&
      !useUnifiedBinding &&
      batchFileItems.length > 0 &&
      batchFileItems.every((item) =>
        item.bindingMode === 'DECIMAL'
          ? Boolean(item.decimalNumber)
          : item.bindingMode === 'MODEL'
          ? Boolean(item.model)
          : Boolean(item.equipmentId)
      )
    );
  }, [selectedFiles.length, useUnifiedBinding, batchFileItems]);

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) {
      enqueueSnackbar('Выберите хотя бы один файл для загрузки', { variant: 'warning' });
      return;
    }

    if (!isMultiAutoReady) {
      if (bindingMode === 'EQUIPMENT' && !selectedEquipmentForUpload) {
        enqueueSnackbar('Выберите оборудование, к которому относится документ', { variant: 'warning' });
        return;
      }
      if (bindingMode === 'MODEL' && !selectedModelForUpload?.trim()) {
        enqueueSnackbar('Выберите или укажите модель оборудования', { variant: 'warning' });
        return;
      }
      if (bindingMode === 'DECIMAL' && !selectedDecimalForUpload?.trim()) {
        enqueueSnackbar('Выберите или укажите децимальный номер', { variant: 'warning' });
        return;
      }
    }

    setUploading(true);
    try {
      const fd = new FormData();
      selectedFiles.forEach((file) => {
        fd.append('files', file);
      });
      fd.append('docType', uploadDocType);
      fd.append('description', uploadDescription);
      fd.append('bindingMode', bindingMode);

      if (selectedFiles.length > 1 && !useUnifiedBinding && batchFileItems.length > 0) {
        const metadata = batchFileItems.map((item) => ({
          fileName: item.file.name,
          docType: item.docType,
          bindingMode: item.bindingMode,
          model: item.bindingMode === 'MODEL' ? (item.model || selectedModelForUpload) : null,
          decimalNumber: item.bindingMode === 'DECIMAL' ? (item.decimalNumber || selectedDecimalForUpload) : null,
          equipmentId: item.bindingMode === 'EQUIPMENT' ? (item.equipmentId || selectedEquipmentForUpload?.id) : null,
          description: uploadDescription,
        }));
        fd.append('filesMetadata', JSON.stringify(metadata));
      } else {
        if (bindingMode === 'EQUIPMENT' && selectedEquipmentForUpload) {
          fd.append('equipmentId', selectedEquipmentForUpload.id);
          if (applyToAllModel) fd.append('applyToAllModel', 'true');
          if (applyToAllDecimal) fd.append('applyToAllDecimal', 'true');
        } else if (bindingMode === 'MODEL' && selectedModelForUpload) {
          fd.append('model', selectedModelForUpload.trim());
        } else if (bindingMode === 'DECIMAL' && selectedDecimalForUpload) {
          fd.append('decimalNumber', selectedDecimalForUpload.trim());
        }
      }

      const res = await fetch('/api/eps/documents', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        if (res.status === 413) {
          enqueueSnackbar(
            'Размер файла превышает лимит сервера (HTTP 413). Проверьте client_max_body_size в Nginx (требуется 64M).',
            { variant: 'error' }
          );
          return;
        }
        let errMsg = `Ошибка сервера (${res.status})`;
        try {
          const errData = await res.json();
          if (errData?.error) errMsg = errData.error;
        } catch {}
        enqueueSnackbar(errMsg, { variant: 'error' });
        return;
      }

      const json = await res.json();
      if (json.success) {
        const docCount = json.count || selectedFiles.length;
        const eqCount = json.equipmentCount || 1;
        const msg =
          eqCount > 1
            ? `Успешно привязано документов: ${docCount} (к ${eqCount} ед. оборудования)`
            : docCount > 1
            ? `Успешно загружено и прикреплено документов: ${docCount}`
            : 'Документ успешно загружен и прикреплен';
        enqueueSnackbar(msg, { variant: 'success' });
        setUploadModalOpen(false);
        setSelectedFiles([]);
        setBatchFileItems([]);
        setAutoMatchResult(null);
        setUseUnifiedBinding(false);
        setSelectedEquipmentForUpload(null);
        setSelectedModelForUpload(null);
        setSelectedDecimalForUpload(null);
        setModelSearchInput('');
        setDecimalSearchInput('');
        setApplyToAllModel(false);
        setApplyToAllDecimal(false);
        setEquipmentSearchInput('');
        setUploadDescription('');
        setUploadDocType('SCHEMA');
        fetchDocuments();
        fetchBindingTargets();
      } else {
        enqueueSnackbar(json.error || 'Ошибка загрузки документов', { variant: 'error' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка сети при загрузке документов';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    (docTypeFilter ? 1 : 0) +
    (equipmentFilter ? 1 : 0);

  const canUpload = hasPermission(PERMISSIONS.EPS_DOCUMENTS_UPLOAD);
  const canEdit = hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT);
  const canDelete = hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT) || user?.roles.includes('admin');
  interface DocumentColumnDef {
    id: string;
    label: string;
    defaultVisible: boolean;
  }

  const DOCUMENT_COLUMNS: DocumentColumnDef[] = [
    { id: 'name', label: 'Наименование файла', defaultVisible: true },
    { id: 'equipment', label: 'Технологическая единица оборудования', defaultVisible: true },
    { id: 'docType', label: 'Вид документа (ЕСКД / ТР ТС)', defaultVisible: true },
    { id: 'description', label: 'Аннотация / Описание документа', defaultVisible: true },
    { id: 'size', label: 'Объем файла', defaultVisible: true },
    { id: 'uploadedBy', label: 'Автор загрузки (ФИО)', defaultVisible: true },
    { id: 'date', label: 'Дата регистрации', defaultVisible: true },
    { id: 'actions', label: 'Операции', defaultVisible: true },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    DOCUMENT_COLUMNS.map((c) => c.id)
  );

  if (!canAccessDocs) {
    return (
      <Box sx={{ pb: 4 }}>
        <PageHeader
          title="Электронный архив технической документации"
          subtitle="Конструкторская и эксплуатационная документация (ЕСКД): паспорта, чертежи, схемы, руководства по эксплуатации (РЭ) и акты"
          breadcrumbs={[
            { label: 'Главная', href: '/' },
            { label: 'Реестр оборудования', href: '/eps' },
            { label: 'Электронный архив документации' },
          ]}
        />
        <EmptyState
          title="Доступ ограничен"
          description="У вашей учетной записи нет полномочий для доступа к технической документации (требуется право eps.documents.view или eps.documents.upload)."
          icon={<DescriptionOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Электронный архив технической документации"
        subtitle="Конструкторская и эксплуатационная документация (ЕСКД): паспорта, чертежи, схемы, руководства по эксплуатации (РЭ) и акты"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Реестр оборудования', href: '/eps' },
          { label: 'Электронный архив документации' },
        ]}
        actions={
          canUpload && (
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={() => setUploadModalOpen(true)}
              sx={{
                height: 38,
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
                px: 2.25,
                boxSizing: 'border-box',
                backgroundColor: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              }}
            >
              Загрузить документ
            </Button>
          )
        }
      />

      {/* KPI Metric Cards */}
      <Grid container spacing={1.75} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Всего документов"
            value={stats.totalDocuments}
            subtitle="Файлов в архиве"
            icon={<DescriptionOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="action.hover"
            iconColor="primary.main"
            accentColor="primary.main"
            active={docTypeFilter === ''}
            onClick={() => handleKpiFilter('')}
            loading={loading && stats.totalDocuments === 0}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Общий объём"
            value={formatBytes(stats.totalSizeBytes)}
            subtitle="Занято на сервере"
            icon={<FolderZipOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="action.hover"
            iconColor="text.secondary"
            accentColor="text.secondary"
            loading={loading && stats.totalDocuments === 0}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Схемы и чертежи"
            value={stats.byTypeCounts.SCHEMA || 0}
            subtitle="Принципиальные схемы"
            icon={<SchemaOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="action.hover"
            iconColor="primary.main"
            accentColor="primary.main"
            active={docTypeFilter === 'SCHEMA'}
            onClick={() => handleKpiFilter('SCHEMA')}
            loading={loading && stats.totalDocuments === 0}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Инструкции"
            value={stats.byTypeCounts.MANUAL || 0}
            subtitle="Руководства и регламенты"
            icon={<MenuBookOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="action.hover"
            iconColor="success.main"
            accentColor="success.main"
            active={docTypeFilter === 'MANUAL'}
            onClick={() => handleKpiFilter('MANUAL')}
            loading={loading && stats.totalDocuments === 0}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Сертификаты и акты"
            value={(stats.byTypeCounts.CERTIFICATE || 0) + (stats.byTypeCounts.ACT || 0)}
            subtitle="Юридические документы"
            icon={<VerifiedOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="action.hover"
            iconColor="secondary.main"
            accentColor="secondary.main"
            active={docTypeFilter === 'CERTIFICATE'}
            onClick={() => handleKpiFilter('CERTIFICATE')}
            loading={loading && stats.totalDocuments === 0}
          />
        </Grid>
      </Grid>

      {/* Main Table */}
      <DataTableWrapper
        loading={loading}
        page={page - 1}
        pageSize={pageSize}
        total={total}
        onPageChange={(_, newPage) => setPage(newPage + 1)}
        onPageSizeChange={(e) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(1);
        }}
        storageKey="eps_documents_table"
        columns={DOCUMENT_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        stickyHeader
        gridContent={
          <Grid container spacing={2}>
            {sortedItems.map((doc) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '10px',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 16px -4px rgba(15, 23, 42, 0.08)',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2, flex: '1 1 auto' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DescriptionOutlinedIcon color="primary" sx={{ fontSize: 22 }} />
                        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ maxWidth: 170 }}>
                          {doc.originalName}
                        </Typography>
                      </Box>
                      <StatusBadge
                        status={doc.docType}
                        label={DOCUMENT_TYPE_MAP[doc.docType] || doc.docType}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    {doc.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, minHeight: 32 }}>
                        {doc.description}
                      </Typography>
                    )}

                    <Divider sx={{ my: 1 }} />

                    <Typography variant="caption" color="text.secondary" display="block">
                      Оборудование: <strong>{doc.equipment ? doc.equipment.name : 'Общий документ'}</strong>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Размер: <strong>{formatBytes(doc.fileSize)}</strong> • Версия: <strong>v{doc.version}</strong>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Загружен: {formatDate(doc.createdAt)} ({doc.uploadedBy?.displayName || 'Система'})
                    </Typography>
                  </CardContent>

                  <Box sx={{ p: 1, px: 2, bgcolor: 'background.default', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      color="primary"
                      component="a"
                      href={doc.filePath.startsWith('/') ? doc.filePath : `/${doc.filePath}`}
                      download={doc.originalName}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Скачать ${doc.originalName}`}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                    {canDelete && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteDialogDoc({ id: doc.id, name: doc.originalName })}
                        aria-label={`Удалить ${doc.originalName}`}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        }
        empty={items.length === 0 && !loading}
        emptyState={
          <EmptyState
            icon={<DescriptionOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
            title="Документы не найдены"
            description={
              activeFilterCount > 0
                ? 'По заданным параметрам документы не найдены. Попробуйте сбросить фильтры.'
                : 'В электронном архиве пока нет загруженных документов.'
            }
            actionText={activeFilterCount > 0 ? 'Сбросить фильтры' : (canUpload ? 'Загрузить документ' : undefined)}
            onAction={activeFilterCount > 0 ? handleResetFilters : (canUpload ? () => setUploadModalOpen(true) : undefined)}
          />
        }
        toolbar={
          <FilterToolbar
            variant="embedded"
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
            actions={
              <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  select
                  size="small"
                  value={docTypeFilter}
                  onChange={(e) => {
                    setDocTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  SelectProps={{
                    displayEmpty: true,
                  }}
                  sx={{
                    minWidth: 160,
                    backgroundColor: 'background.paper',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      height: 36,
                      '& fieldset': { borderColor: 'divider' },
                      '&:hover fieldset': { borderColor: 'grey.400' },
                    },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все типы</MenuItem>
                  {Object.entries(DOCUMENT_TYPE_MAP).map(([key, label]) => (
                    <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  value={equipmentFilter}
                  onChange={(e) => {
                    setEquipmentFilter(e.target.value);
                    setPage(1);
                  }}
                  SelectProps={{
                    displayEmpty: true,
                  }}
                  sx={{
                    minWidth: 200,
                    backgroundColor: 'background.paper',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      height: 36,
                      '& fieldset': { borderColor: 'divider' },
                      '&:hover fieldset': { borderColor: 'grey.400' },
                    },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все оборудование</MenuItem>
                  {equipmentList.map((eq) => (
                    <MenuItem key={eq.id} value={eq.id} sx={{ fontSize: '0.8125rem' }}>
                      {eq.inventoryNumber ? `[${eq.inventoryNumber}] ` : ''}{eq.name}{eq.model ? ` — ${eq.model}` : ''}
                    </MenuItem>
                  ))}
                </TextField>

                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(_, mode) => mode && setViewMode(mode)}
                  size="small"
                  sx={{ height: 36 }}
                >
                  <ToggleButton value="table" aria-label="табличный вид" sx={{ px: 1, py: 0.5, borderRadius: '8px' }}>
                    <Tooltip title="Табличный вид">
                      <ViewListIcon fontSize="small" />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="grid" aria-label="сетка карточек" sx={{ px: 1, py: 0.5, borderRadius: '8px' }}>
                    <Tooltip title="Сетка карточек">
                      <ViewModuleIcon fontSize="small" />
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            }
          >
            <Box sx={{ minWidth: { xs: '100%', sm: 260, md: 320 }, flexGrow: 1 }}>
              <SearchInput
                value={search}
                placeholder="Поиск по названию файла, описанию, инв. №..."
                onSearch={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
              />
            </Box>
          </FilterToolbar>
        }
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.paper' }}>
              {visibleColumns.includes('name') && (
                <TableCell sx={{ minWidth: 200 }}>
                  <TableSortLabel
                    active={sortField === 'name'}
                    direction={sortField === 'name' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    Имя файла
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('equipment') && (
                <TableCell sx={{ minWidth: 180 }}>
                  <TableSortLabel
                    active={sortField === 'equipment'}
                    direction={sortField === 'equipment' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('equipment')}
                  >
                    Оборудование
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('docType') && (
                <TableCell sx={{ minWidth: 160 }}>
                  <TableSortLabel
                    active={sortField === 'docType'}
                    direction={sortField === 'docType' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('docType')}
                  >
                    Тип документа
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('description') && (
                <TableCell sx={{ minWidth: 160 }}>
                  <TableSortLabel
                    active={sortField === 'description'}
                    direction={sortField === 'description' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('description')}
                  >
                    Описание
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('size') && (
                <TableCell sx={{ minWidth: 110 }}>
                  <TableSortLabel
                    active={sortField === 'size'}
                    direction={sortField === 'size' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('size')}
                  >
                    Размер
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('uploadedBy') && (
                <TableCell sx={{ minWidth: 140 }}>
                  <TableSortLabel
                    active={sortField === 'uploadedBy'}
                    direction={sortField === 'uploadedBy' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('uploadedBy')}
                  >
                    Загрузил
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('date') && (
                <TableCell sx={{ minWidth: 120 }}>
                  <TableSortLabel
                    active={sortField === 'date'}
                    direction={sortField === 'date' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('date')}
                  >
                    Дата
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('actions') && (
                <TableCell align="right" sx={{ minWidth: 100 }}>
                  Действия
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedItems.map((doc) => (
              <TableRow key={doc.id} hover>
                {visibleColumns.includes('name') && (
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionOutlinedIcon color="primary" sx={{ fontSize: 18 }} />
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.8125rem' }}>
                          {doc.originalName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Версия {doc.version}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                )}

                {visibleColumns.includes('equipment') && (
                  <TableCell>
                    {doc.equipment ? (
                      <Box
                        onClick={() => router.push(`/eps/${doc.equipment.id}`)}
                        sx={{
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 0.35,
                          '&:hover .equipment-name': { color: 'primary.main', textDecoration: 'underline' },
                        }}
                      >
                        <Typography
                          className="equipment-name"
                          variant="body2"
                          fontWeight={600}
                          sx={{ fontSize: '0.8125rem', color: 'text.primary', lineHeight: 1.35 }}
                        >
                          {doc.equipment.name}
                        </Typography>
                        <Paper
                          variant="outlined"
                          sx={{
                            px: 0.75,
                            py: 0.1,
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            bgcolor: 'background.default',
                            fontSize: '0.6875rem',
                            borderRadius: '4px',
                            color: 'text.secondary',
                            borderColor: 'grey.400',
                            lineHeight: 1.3,
                          }}
                        >
                          {doc.equipment.inventoryNumber || 'Б/Н'}
                        </Paper>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                          Модель: {doc.equipment.model || '—'}
                        </Typography>
                        {getEquipmentDecimalNumber(doc.equipment) ? (
                          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                            Дец. №: {getEquipmentDecimalNumber(doc.equipment)}
                          </Typography>
                        ) : null}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Общий документ
                      </Typography>
                    )}
                  </TableCell>
                )}

                {visibleColumns.includes('docType') && (
                  <TableCell>
                    <StatusBadge
                      status={doc.docType}
                      label={DOCUMENT_TYPE_MAP[doc.docType] || doc.docType}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                )}

                {visibleColumns.includes('description') && (
                  <TableCell sx={{ fontSize: '0.8125rem', color: doc.description ? 'inherit' : 'text.secondary' }}>
                    {doc.description || '—'}
                  </TableCell>
                )}

                {visibleColumns.includes('size') && (
                  <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                    {formatBytes(doc.fileSize)}
                  </TableCell>
                )}

                {visibleColumns.includes('uploadedBy') && (
                  <TableCell sx={{ fontSize: '0.8125rem' }}>
                    {doc.uploadedBy?.displayName || 'Система'}
                  </TableCell>
                )}

                {visibleColumns.includes('date') && (
                  <TableCell sx={{ fontSize: '0.8125rem' }}>
                    {formatDate(doc.createdAt)}
                  </TableCell>
                )}

                {visibleColumns.includes('actions') && (
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title="Скачать / Просмотреть">
                        <IconButton
                          size="small"
                          color="primary"
                          component="a"
                          href={`/api/files/${doc.filePath}`}
                          target="_blank"
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {canEdit && (
                        <Tooltip title="Удалить документ">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialogDoc({ id: doc.id, name: doc.originalName })}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteDialogDoc)}
        title="Удаление документа"
        message={`Вы действительно хотите удалить документ «${deleteDialogDoc?.name}» из архива? Это действие необратимо.`}
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteDialogDoc(null)}
      />

      {/* Upload Document Modal Dialog */}
      <FormDialog
        open={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setSelectedFiles([]);
          setAutoMatchResult(null);
        }}
        title="Загрузка документов в архив EPS"
        icon={<UploadFileIcon color="primary" />}
        maxWidth="sm"
        loading={uploading}
        submitLabel={
          uploading
            ? 'Загрузка...'
            : selectedFiles.length > 1
            ? `Загрузить в архив (${selectedFiles.length})`
            : 'Загрузить в архив'
        }
        onSubmit={handleUploadSubmit}
        submitDisabled={
          uploading ||
          selectedFiles.length === 0 ||
          (selectedFiles.length > 1 && !useUnifiedBinding
            ? !isMultiAutoReady && (!selectedEquipmentForUpload && !selectedModelForUpload?.trim() && !selectedDecimalForUpload?.trim())
            : (bindingMode === 'EQUIPMENT' && !selectedEquipmentForUpload) ||
              (bindingMode === 'MODEL' && !selectedModelForUpload?.trim()) ||
              (bindingMode === 'DECIMAL' && !selectedDecimalForUpload?.trim()))
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25, pt: 1 }}>
          {/* File Picker at Top */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              1. Выберите файлы для загрузки:
            </Typography>
            <FileUploadDropzone
              multiple
              files={selectedFiles}
              onChange={(files) => handleFilesChange(files)}
              compact
              maxSizeMb={50}
              title="Перетащите файлы документов или выберите"
              description="PDF, Word, Excel, чертежи и схемы (до 50 МБ на файл)"
            />
          </Box>

          {/* Batch Auto-match List Section */}
          {selectedFiles.length > 1 && batchFileItems.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: '10px',
                border: '1px solid',
                borderColor: 'primary.light',
                bgcolor: 'action.hover',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesomeIcon color="primary" sx={{ fontSize: 18 }} />
                  <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                    Групповое автосопоставление ({batchFileItems.filter((b) => b.model || b.decimalNumber || b.equipmentId).length} из {selectedFiles.length})
                  </Typography>
                </Box>
                <Chip
                  label={`${selectedFiles.length} файлов`}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 700, fontSize: '0.6875rem', height: 20 }}
                />
              </Box>

              <Box sx={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {batchFileItems.map((item, idx) => (
                  <Paper
                    key={idx}
                    variant="outlined"
                    sx={{
                      p: 1.25,
                      borderRadius: '8px',
                      bgcolor: 'background.paper',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.8125rem', maxWidth: 320 }}>
                        {item.file.name}
                      </Typography>
                      <Chip
                        label={DOCUMENT_TYPE_MAP[item.docType] || item.docType}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600 }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      {item.decimalNumber ? (
                        <Chip
                          label={`Дец. №: ${item.decimalNumber}`}
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600 }}
                        />
                      ) : item.model ? (
                        <Chip
                          label={`Модель: ${item.model}`}
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600 }}
                        />
                      ) : item.equipmentName ? (
                        <Chip
                          label={`Обор: ${item.equipmentName}`}
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600 }}
                        />
                      ) : (
                        <Chip
                          label="По общим параметрам ниже"
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.6875rem', color: 'text.secondary' }}
                        />
                      )}

                      {item.match.matchingEquipmentCount > 0 && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
                          → {item.match.matchingEquipmentCount} ед. в реестре
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                ))}
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={useUnifiedBinding}
                    onChange={(e) => setUseUnifiedBinding(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    Применить единую привязку ко всем файлам вместо индивидуального сопоставления
                  </Typography>
                }
              />
            </Paper>
          )}

          {/* Single File Smart Auto-match Suggestion Banner */}
          {selectedFiles.length === 1 && autoMatchResult && autoMatchResult.confidence !== 'none' && (
            <Paper
              elevation={0}
              sx={{
                p: 1.75,
                borderRadius: '10px',
                border: '1px solid',
                borderColor: 'primary.light',
                bgcolor: 'action.hover',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesomeIcon color="primary" sx={{ fontSize: 18 }} />
                <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                  Автоматическое сопоставление по имени файла
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.primary' }}>
                {autoMatchResult.matchReason}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip
                  label={`Тип: ${autoMatchResult.detectedDocTypeLabel}`}
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 600, height: 22, fontSize: '0.75rem' }}
                />
                {autoMatchResult.matchedModel && (
                  <Chip
                    label={`Модель: ${autoMatchResult.matchedModel}`}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 600, height: 22, fontSize: '0.75rem' }}
                  />
                )}
                {autoMatchResult.matchedDecimalNumber && (
                  <Chip
                    label={`Дец. №: ${autoMatchResult.matchedDecimalNumber}`}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 600, height: 22, fontSize: '0.75rem' }}
                  />
                )}
                {autoMatchResult.matchingEquipmentCount > 0 && (
                  <Chip
                    label={`В реестре: ${autoMatchResult.matchingEquipmentCount} ед.`}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600, height: 22, fontSize: '0.75rem' }}
                  />
                )}
              </Box>
            </Paper>
          )}

          {/* Binding Mode Selector */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              {selectedFiles.length > 1 && !useUnifiedBinding
                ? '2. Общие параметры привязки (для нераспознанных файлов):'
                : '2. Способ привязки документа к реестру:'}
            </Typography>
            <ToggleButtonGroup
              value={bindingMode}
              exclusive
              onChange={(_, val) => val && setBindingMode(val)}
              size="small"
              fullWidth
              sx={{
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  py: 0.6,
                },
              }}
            >
              <ToggleButton value="EQUIPMENT">По единице оборудования</ToggleButton>
              <ToggleButton value="MODEL">По модели</ToggleButton>
              <ToggleButton value="DECIMAL">По децимальному номеру</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Mode 1: EQUIPMENT */}
          {bindingMode === 'EQUIPMENT' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Autocomplete
                options={uploadEquipmentOptionsWithSelected}
                getOptionLabel={(option) => `${option.inventoryNumber ? `[${option.inventoryNumber}] ` : ''}${option.name}${option.model ? ` — ${option.model}` : ''}${option.decimalNumber ? ` (дец. № ${option.decimalNumber})` : ''}`}
                filterOptions={(options, state) => filterEquipmentOptions(options, state.inputValue || equipmentSearchInput)}
                value={selectedEquipmentForUpload}
                onChange={(_, val) => {
                  setSelectedEquipmentForUpload(val);
                  setApplyToAllModel(false);
                  setApplyToAllDecimal(false);
                }}
                inputValue={equipmentSearchInput}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input' || reason === 'clear') {
                    setUploadEquipmentOptions([]);
                  }
                  setEquipmentSearchInput(value);
                }}
                loading={uploadEquipmentLoading}
                noOptionsText="Оборудование не найдено"
                renderOption={(props, option) => (
                  <Box component="li" {...props} key={option.id}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {option.inventoryNumber ? `[${option.inventoryNumber}] ` : ''}{option.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 0.25 }}>
                        {option.model && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            Модель: <strong>{option.model}</strong>
                          </Typography>
                        )}
                        {option.decimalNumber && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            Дец. №: <strong>{option.decimalNumber}</strong>
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Оборудование"
                    placeholder="Поиск по инв. номеру, наименованию или модели, децимальному номеру"
                    size="small"
                    fullWidth
                    required
                  />
                )}
              />

              {selectedEquipmentForUpload?.model && (
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={applyToAllModel}
                      onChange={(e) => setApplyToAllModel(e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>
                      Привязать также ко всем единицам модели «<strong>{selectedEquipmentForUpload.model}</strong>»
                    </Typography>
                  }
                />
              )}
              {selectedEquipmentForUpload?.decimalNumber && (
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={applyToAllDecimal}
                      onChange={(e) => setApplyToAllDecimal(e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>
                      Привязать также ко всем единицам с децимальным номером «<strong>{selectedEquipmentForUpload.decimalNumber}</strong>»
                    </Typography>
                  }
                />
              )}
            </Box>
          )}

          {/* Mode 2: MODEL */}
          {bindingMode === 'MODEL' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Autocomplete
                freeSolo
                options={availableBindingTargets.models.map((m) => m.model)}
                value={selectedModelForUpload}
                onChange={(_, val) => setSelectedModelForUpload(val)}
                inputValue={modelSearchInput}
                onInputChange={(_, val) => {
                  setModelSearchInput(val);
                  setSelectedModelForUpload(val);
                }}
                renderOption={(props, option) => {
                  const info = availableBindingTargets.models.find((m) => m.model === option);
                  return (
                    <Box component="li" {...props} key={option}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{option}</Typography>
                        {info && (
                          <Chip
                            label={`${info.count} ед.`}
                            size="small"
                            sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600 }}
                          />
                        )}
                      </Box>
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Модель / Типоразмер оборудования"
                    placeholder="Выберите модель из списка или введите название"
                    size="small"
                    fullWidth
                    required
                  />
                )}
              />

              {selectedModelForUpload && (
                <Alert severity="info" sx={{ py: 0.5, fontSize: '0.75rem' }}>
                  Документ будет автоматически привязан ко всему оборудованию модели «<strong>{selectedModelForUpload}</strong>»
                  {(() => {
                    const info = availableBindingTargets.models.find(
                      (m) => m.model.toLowerCase() === selectedModelForUpload.toLowerCase()
                    );
                    return info ? ` (${info.count} ед. оборудования в реестре)` : '';
                  })()}
                </Alert>
              )}
            </Box>
          )}

          {/* Mode 3: DECIMAL */}
          {bindingMode === 'DECIMAL' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Autocomplete
                freeSolo
                options={availableBindingTargets.decimalNumbers.map((d) => d.decimalNumber)}
                value={selectedDecimalForUpload}
                onChange={(_, val) => setSelectedDecimalForUpload(val)}
                inputValue={decimalSearchInput}
                onInputChange={(_, val) => {
                  setDecimalSearchInput(val);
                  setSelectedDecimalForUpload(val);
                }}
                renderOption={(props, option) => {
                  const info = availableBindingTargets.decimalNumbers.find((d) => d.decimalNumber === option);
                  return (
                    <Box component="li" {...props} key={option}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{option}</Typography>
                        {info && (
                          <Chip
                            label={`${info.count} ед.`}
                            size="small"
                            sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600 }}
                          />
                        )}
                      </Box>
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Децимальный номер"
                    placeholder="Выберите децимальный номер из списка или введите"
                    size="small"
                    fullWidth
                    required
                  />
                )}
              />

              {selectedDecimalForUpload && (
                <Alert severity="info" sx={{ py: 0.5, fontSize: '0.75rem' }}>
                  Документ будет автоматически привязан ко всему оборудованию с децимальным номером «<strong>{selectedDecimalForUpload}</strong>»
                  {(() => {
                    const info = availableBindingTargets.decimalNumbers.find(
                      (d) => d.decimalNumber.toLowerCase() === selectedDecimalForUpload.toLowerCase()
                    );
                    return info ? ` (${info.count} ед. оборудования в реестре)` : '';
                  })()}
                </Alert>
              )}
            </Box>
          )}

          {/* Document Type */}
          <TextField
            select
            size="small"
            label="Тип документа"
            value={uploadDocType}
            onChange={(e) => setUploadDocType(e.target.value)}
            fullWidth
            required
          >
            {Object.entries(DOCUMENT_TYPE_MAP).map(([k, label]) => (
              <MenuItem key={k} value={k}>
                {label}
              </MenuItem>
            ))}
          </TextField>

          {/* Description */}
          <TextField
            label="Описание / Примечание к документам"
            value={uploadDescription}
            onChange={(e) => setUploadDescription(e.target.value)}
            multiline
            rows={3}
            size="small"
            fullWidth
            placeholder="Укажите номер чертежа, редакцию, дату утверждения или краткое содержание..."
          />
        </Box>
      </FormDialog>
    </Box>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка архива документов оборудования..." />}>
      <DocumentsListContent />
    </Suspense>
  );
}

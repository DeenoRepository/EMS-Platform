import { TableColumnOption } from '@/components/ui';

export interface ApprovalItem {
  id: string;
  equipmentId: string;
  type: string;
  status: string;
  title: string;
  description: string | null;
  proposedData: any | null;
  requesterId: string;
  reviewerId: string | null;
  reviewedAt: string | null;
  resolutionComment: string | null;
  createdAt: string;
  updatedAt: string;
  equipment: {
    id: string;
    name: string;
    inventoryNumber: string | null;
    manufacturer?: string | null;
    model?: string | null;
    location?: string | null;
    status?: string;
  } | null;
  requester: {
    id: string;
    displayName: string;
    ldapLogin: string;
  };
  reviewer: {
    id: string;
    displayName: string;
    ldapLogin: string;
  } | null;
}

export interface ApprovalKpiStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  toReview: number;
  myPending: number;
}

export const APPROVALS_COLUMNS: TableColumnOption[] = [
  { id: 'title', label: 'Тема и описание заявки', defaultVisible: true, required: true },
  { id: 'type', label: 'Тип операции', defaultVisible: true },
  { id: 'status', label: 'Статус рассмотрения', defaultVisible: true },
  { id: 'equipment', label: 'Оборудование', defaultVisible: true },
  { id: 'requester', label: 'Инициатор', defaultVisible: true },
  { id: 'reviewer', label: 'Рецензент', defaultVisible: true },
  { id: 'createdAt', label: 'Дата подачи', defaultVisible: true },
  { id: 'actions', label: 'Действия', defaultVisible: true, required: true },
];

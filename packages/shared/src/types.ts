import {
  FeedbackType,
  FeedbackModule,
  FeedbackPriority,
  FeedbackStatus,
} from './constants';

// ==========================================
// JWT СЕССИЯ И ТИПЫ ПОЛЬЗОВАТЕЛЕЙ
// ==========================================

export interface JwtUserPayload {
  userId: string;
  ldapLogin: string;
  displayName: string;
  email?: string | null;
  roles: string[];
  permissions: string[];
}

// ==========================================
// ТИПЫ API ОТВЕТОВ
// ==========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==========================================
// ТЕХНИЧЕСКОЕ ОБСЛУЖИВАНИЕ (MAINTENANCE)
// ==========================================

export interface SystemMaintenanceConfig {
  enabled: boolean;
  message?: string;
  estimatedUntil?: string | null;
  allowedRoles?: string[];
}

export interface ModuleMaintenanceConfig {
  enabled: boolean;
  message?: string;
  estimatedUntil?: string | null;
}

export interface PlatformMaintenanceStatus {
  system: SystemMaintenanceConfig;
  modules: {
    eps: ModuleMaintenanceConfig;
    wms: ModuleMaintenanceConfig;
    srm: ModuleMaintenanceConfig;
    mro: ModuleMaintenanceConfig;
    prm: ModuleMaintenanceConfig;
  };
}

// ==========================================
// СИСТЕМА ОБРАТНОЙ СВЯЗИ (FEEDBACK HUB)
// ==========================================

export interface FeedbackCommentDto {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    ldapLogin: string;
  };
}

export interface FeedbackAttachmentDto {
  id: string;
  ticketId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedById: string;
  createdAt: string;
}

export interface FeedbackTicketDto {
  id: string;
  ticketNumber: string;
  type: FeedbackType;
  module: FeedbackModule;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  title: string;
  description: string;
  pageUrl?: string | null;
  browserInfo?: {
    userAgent?: string;
    screenResolution?: string;
    os?: string;
    browser?: string;
    language?: string;
  } | null;
  resolution?: string | null;
  resolvedAt?: string | null;
  createdById: string;
  assignedToId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    displayName: string;
    ldapLogin: string;
    email?: string | null;
  };
  assignedTo?: {
    id: string;
    displayName: string;
    ldapLogin: string;
  } | null;
  commentsCount?: number;
  attachmentsCount?: number;
  comments?: FeedbackCommentDto[];
  attachments?: FeedbackAttachmentDto[];
}

// ==========================================
// ДОМЕННЫЕ ТИПЫ: SRM (Service Request Mgmt)
// ==========================================

export interface SrmIssueDto {
  id: string;
  issueKey?: string;
  key?: string;
  summary?: string;
  title?: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  failureCategory?: string | null;
  source?: string | null;
  externalKey?: string | null;
  externalUrl?: string | null;
  equipmentId?: string | null;
  equipment?: {
    id: string;
    name: string;
    inventoryNumber?: string | null;
    model?: string | null;
    manufacturer?: string | null;
    location?: string | null;
    status?: string | null;
  } | null;
  reportedBy?: {
    displayName: string;
    ldapLogin: string;
  } | null;
  assignedTo?: {
    displayName: string;
    ldapLogin: string;
  } | null;
  assignee?: string | null;
  reporterName?: string | null;
  contractorName?: string | null;
  resolutionNotes?: string | null;
  downtimeMinutes?: number | null;
  slaDeadline?: string | null;
  slaBreached?: boolean;
  warrantyClaim?: boolean;
  mroScheduleId?: string | null;
  integration?: {
    id: string;
    name: string;
    providerType: string;
  } | null;
  rawData?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string | null;
  jiraIssues?: Array<{ status: string; key?: string; [key: string]: unknown }>;
  maintenancePlans?: Array<{ id: string; status: string; [key: string]: unknown }>;
  repairDescription?: string | null;
}

export interface SrmReliabilityAnalyticsDto {
  totalIncidents?: number;
  resolvedCount?: number;
  totalDowntimeHours?: number;
  mttrHours?: number | null;
  mtbfDays?: number | null;
  availabilityPercent?: number | null;
  slaComplianceRate?: number | null;
  mttr?: number | null;
  mtbf?: number | null;
  slaCompliance?: number | null;
  totalIssues?: number;
  openIssues?: number;
  resolvedIssues?: number;
  failureCategoryCounts?: Record<string, number>;
  statusCounts?: Record<string, number>;
  priorityCounts?: Record<string, number>;
  sourceCounts?: Record<string, number>;
  warrantyIncidentsCount?: number;
  paretoAnalysis?: Array<{
    category: string;
    count: number;
    cumulativePercent: number;
    equipmentId?: string;
    equipmentName?: string;
    failureCount?: number;
    totalDowntime?: number;
  }>;
  topEquipment?: Array<{
    id?: string;
    name: string;
    count: number;
    downtimeHours: number;
    failureCount?: number;
    mttr?: number | null;
    mtbf?: number | null;
  }>;
}

// ==========================================
// ДОМЕННЫЕ ТИПЫ: EPS (Equipment Park System)
// ==========================================

export interface EpsProposedChangeDto {
  fieldKey: string;
  oldValue: unknown;
  newValue: unknown;
  label?: string;
}

// ==========================================
// ДОМЕННЫЕ ТИПЫ: Admin / Audit
// ==========================================

export interface AuditChangeDto {
  [key: string]: unknown;
}

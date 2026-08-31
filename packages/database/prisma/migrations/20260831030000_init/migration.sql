-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MAINTENANCE_UPCOMING', 'MAINTENANCE_MISSED', 'LOW_STOCK', 'SLA_BREACH', 'EQUIPMENT_CHANGED', 'SYSTEM', 'FEEDBACK_CREATED', 'FEEDBACK_STATUS_CHANGED', 'FEEDBACK_REPLY');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('ACTIVE', 'UNDER_REPAIR', 'DECOMMISSIONED', 'IN_STORAGE', 'DRAFT', 'INACTIVE');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SCHEMA', 'MANUAL', 'CERTIFICATE', 'PASSPORT', 'ACT', 'OTHER');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('EQUIPMENT_CREATE', 'EQUIPMENT_UPDATE', 'EQUIPMENT_DELETE', 'DOCUMENT_CREATE', 'DOCUMENT_DELETE', 'COMMISSIONING', 'DECOMMISSIONING', 'STATUS_CHANGE', 'PARAMETER_CHANGE', 'DOCUMENT_APPROVAL');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('RECEIPT', 'ISSUE', 'ISSUE_EMPLOYEE', 'ISSUE_WRITE_OFF', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "StockTransferStatus" AS ENUM ('REQUESTED', 'IN_TRANSIT', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SrmProviderType" AS ENUM ('JIRA', 'REDMINE', 'GITLAB_ISSUES', 'REST_GENERIC', 'SERVICE_NOW', 'CUSTOM_WEBHOOK');

-- CreateEnum
CREATE TYPE "SrmAuthType" AS ENUM ('BASIC', 'BEARER', 'API_KEY', 'CUSTOM_HEADERS', 'NONE');

-- CreateEnum
CREATE TYPE "MaintenanceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChecklistItemType" AS ENUM ('BOOLEAN', 'NUMERIC', 'TEXT');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'FEATURE_REQUEST', 'QUESTION', 'OTHER');

-- CreateEnum
CREATE TYPE "FeedbackModule" AS ENUM ('EPS', 'WMS', 'SRM', 'MRO', 'ADMIN', 'GENERAL');

-- CreateEnum
CREATE TYPE "FeedbackPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'IN_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'DUPLICATE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "ldapLogin" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportTemplate" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL DEFAULT 'eps',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inventoryNumber" TEXT,
    "serialNumber" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "location" TEXT,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "commissionDate" TIMESTAMP(3),
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentTag" (
    "equipmentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "EquipmentTag_pkey" PRIMARY KEY ("equipmentId","tagId")
);

-- CreateTable
CREATE TABLE "CustomSection" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fieldType" "FieldType" NOT NULL,
    "unit" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "options" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "docType" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentApproval" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT,
    "type" "ApprovalType" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "proposedData" JSONB,
    "requesterId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resolutionComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "location" TEXT,
    "responsibleUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageZone" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageCell" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageCell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomenclatureCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NomenclatureCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nomenclature" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "article" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'шт',
    "categoryId" TEXT,
    "description" TEXT,
    "minStock" DECIMAL(65,30) DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Nomenclature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "nomenclatureId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cellId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockOperation" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "type" "OperationType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "counterparty" TEXT,
    "document" TEXT,
    "comment" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockOperationItem" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "nomenclatureId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "equipmentId" TEXT,

    CONSTRAINT "StockOperationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentSparePart" (
    "equipmentId" TEXT NOT NULL,
    "nomenclatureId" TEXT NOT NULL,

    CONSTRAINT "EquipmentSparePart_pkey" PRIMARY KEY ("equipmentId","nomenclatureId")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "InventoryStatus" NOT NULL DEFAULT 'DRAFT',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,
    "createdById" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "nomenclatureId" TEXT NOT NULL,
    "expectedQty" DECIMAL(65,30) NOT NULL,
    "actualQty" DECIMAL(65,30),
    "diffQty" DECIMAL(65,30),
    "comment" TEXT,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "sourceWarehouseId" TEXT NOT NULL,
    "targetWarehouseId" TEXT NOT NULL,
    "status" "StockTransferStatus" NOT NULL DEFAULT 'IN_TRANSIT',
    "createdById" TEXT NOT NULL,
    "requestReason" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "dispatchedById" TEXT,
    "receivedAt" TIMESTAMP(3),
    "receivedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransferItem" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "nomenclatureId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "targetCellId" TEXT,

    CONSTRAINT "StockTransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SrmIntegration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerType" "SrmProviderType" NOT NULL DEFAULT 'JIRA',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "baseUrl" TEXT NOT NULL,
    "authType" "SrmAuthType" NOT NULL DEFAULT 'BASIC',
    "authConfig" JSONB NOT NULL,
    "queryConfig" JSONB NOT NULL,
    "mappingConfig" JSONB,
    "syncInterval" INTEGER NOT NULL DEFAULT 60,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SrmIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JiraIssueCache" (
    "id" TEXT NOT NULL,
    "issueKey" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'JIRA',
    "failureCategory" TEXT,
    "downtimeMinutes" INTEGER,
    "slaDeadline" TIMESTAMP(3),
    "slaBreached" BOOLEAN DEFAULT false,
    "resolutionNotes" TEXT,
    "warrantyClaim" BOOLEAN DEFAULT false,
    "contractorName" TEXT,
    "mroScheduleId" TEXT,
    "assignee" TEXT,
    "reporter" TEXT,
    "createdById" TEXT,
    "createdDate" TIMESTAMP(3) NOT NULL,
    "resolvedDate" TIMESTAMP(3),
    "equipmentId" TEXT,
    "integrationId" TEXT,
    "rawData" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JiraIssueCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenancePlan" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "MaintenanceFrequency" NOT NULL,
    "intervalDays" INTEGER,
    "checklistId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceSchedule" (
    "id" TEXT NOT NULL,
    "planId" TEXT,
    "equipmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'PLANNED',
    "completedDate" TIMESTAMP(3),
    "completedById" TEXT,
    "notes" TEXT,
    "jiraIssueKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "itemType" "ChecklistItemType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChecklistTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistResult" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "completedById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceUsedPart" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "nomenclatureId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "MaintenanceUsedPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL DEFAULT 'BUG',
    "module" "FeedbackModule" NOT NULL DEFAULT 'GENERAL',
    "priority" "FeedbackPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pageUrl" TEXT,
    "browserInfo" JSONB,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FeedbackTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackAttachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_ldapLogin_key" ON "User"("ldapLogin");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "ReportTemplate_module_idx" ON "ReportTemplate"("module");

-- CreateIndex
CREATE INDEX "ReportTemplate_createdById_idx" ON "ReportTemplate"("createdById");

-- CreateIndex
CREATE INDEX "ReportTemplate_createdAt_idx" ON "ReportTemplate"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_inventoryNumber_key" ON "Equipment"("inventoryNumber");

-- CreateIndex
CREATE INDEX "Equipment_status_idx" ON "Equipment"("status");

-- CreateIndex
CREATE INDEX "Equipment_name_idx" ON "Equipment"("name");

-- CreateIndex
CREATE INDEX "Equipment_manufacturer_idx" ON "Equipment"("manufacturer");

-- CreateIndex
CREATE INDEX "Equipment_createdById_idx" ON "Equipment"("createdById");

-- CreateIndex
CREATE INDEX "Equipment_createdAt_idx" ON "Equipment"("createdAt");

-- CreateIndex
CREATE INDEX "Equipment_deletedAt_idx" ON "Equipment"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "EquipmentTag_tagId_idx" ON "EquipmentTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomSection_code_key" ON "CustomSection"("code");

-- CreateIndex
CREATE INDEX "CustomSection_sortOrder_idx" ON "CustomSection"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_key_key" ON "CustomFieldDefinition"("key");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_sectionId_idx" ON "CustomFieldDefinition"("sectionId");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_sortOrder_idx" ON "CustomFieldDefinition"("sortOrder");

-- CreateIndex
CREATE INDEX "Document_equipmentId_idx" ON "Document"("equipmentId");

-- CreateIndex
CREATE INDEX "Document_docType_idx" ON "Document"("docType");

-- CreateIndex
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");

-- CreateIndex
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");

-- CreateIndex
CREATE INDEX "Document_deletedAt_idx" ON "Document"("deletedAt");

-- CreateIndex
CREATE INDEX "Photo_equipmentId_idx" ON "Photo"("equipmentId");

-- CreateIndex
CREATE INDEX "EquipmentApproval_equipmentId_idx" ON "EquipmentApproval"("equipmentId");

-- CreateIndex
CREATE INDEX "EquipmentApproval_status_idx" ON "EquipmentApproval"("status");

-- CreateIndex
CREATE INDEX "EquipmentApproval_type_idx" ON "EquipmentApproval"("type");

-- CreateIndex
CREATE INDEX "EquipmentApproval_requesterId_idx" ON "EquipmentApproval"("requesterId");

-- CreateIndex
CREATE INDEX "EquipmentApproval_createdAt_idx" ON "EquipmentApproval"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE INDEX "Warehouse_responsibleUserId_idx" ON "Warehouse"("responsibleUserId");

-- CreateIndex
CREATE INDEX "Warehouse_deletedAt_idx" ON "Warehouse"("deletedAt");

-- CreateIndex
CREATE INDEX "StorageZone_warehouseId_idx" ON "StorageZone"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "StorageZone_warehouseId_code_key" ON "StorageZone"("warehouseId", "code");

-- CreateIndex
CREATE INDEX "StorageCell_zoneId_idx" ON "StorageCell"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "StorageCell_zoneId_code_key" ON "StorageCell"("zoneId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Nomenclature_article_key" ON "Nomenclature"("article");

-- CreateIndex
CREATE INDEX "Nomenclature_name_idx" ON "Nomenclature"("name");

-- CreateIndex
CREATE INDEX "Nomenclature_article_idx" ON "Nomenclature"("article");

-- CreateIndex
CREATE INDEX "Nomenclature_deletedAt_idx" ON "Nomenclature"("deletedAt");

-- CreateIndex
CREATE INDEX "StockItem_cellId_idx" ON "StockItem"("cellId");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_warehouseId_nomenclatureId_key" ON "StockItem"("warehouseId", "nomenclatureId");

-- CreateIndex
CREATE INDEX "StockOperation_warehouseId_idx" ON "StockOperation"("warehouseId");

-- CreateIndex
CREATE INDEX "StockOperation_date_idx" ON "StockOperation"("date");

-- CreateIndex
CREATE INDEX "StockOperationItem_operationId_idx" ON "StockOperationItem"("operationId");

-- CreateIndex
CREATE INDEX "StockOperationItem_nomenclatureId_idx" ON "StockOperationItem"("nomenclatureId");

-- CreateIndex
CREATE INDEX "StockOperationItem_equipmentId_idx" ON "StockOperationItem"("equipmentId");

-- CreateIndex
CREATE INDEX "EquipmentSparePart_nomenclatureId_idx" ON "EquipmentSparePart"("nomenclatureId");

-- CreateIndex
CREATE INDEX "Inventory_warehouseId_idx" ON "Inventory"("warehouseId");

-- CreateIndex
CREATE INDEX "Inventory_status_idx" ON "Inventory"("status");

-- CreateIndex
CREATE INDEX "Inventory_createdById_idx" ON "Inventory"("createdById");

-- CreateIndex
CREATE INDEX "Inventory_date_idx" ON "Inventory"("date");

-- CreateIndex
CREATE INDEX "InventoryItem_nomenclatureId_idx" ON "InventoryItem"("nomenclatureId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_inventoryId_nomenclatureId_key" ON "InventoryItem"("inventoryId", "nomenclatureId");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_transferNumber_key" ON "StockTransfer"("transferNumber");

-- CreateIndex
CREATE INDEX "StockTransfer_sourceWarehouseId_idx" ON "StockTransfer"("sourceWarehouseId");

-- CreateIndex
CREATE INDEX "StockTransfer_targetWarehouseId_idx" ON "StockTransfer"("targetWarehouseId");

-- CreateIndex
CREATE INDEX "StockTransfer_status_idx" ON "StockTransfer"("status");

-- CreateIndex
CREATE INDEX "StockTransfer_createdAt_idx" ON "StockTransfer"("createdAt");

-- CreateIndex
CREATE INDEX "StockTransferItem_transferId_idx" ON "StockTransferItem"("transferId");

-- CreateIndex
CREATE INDEX "StockTransferItem_nomenclatureId_idx" ON "StockTransferItem"("nomenclatureId");

-- CreateIndex
CREATE UNIQUE INDEX "JiraIssueCache_issueKey_key" ON "JiraIssueCache"("issueKey");

-- CreateIndex
CREATE INDEX "JiraIssueCache_status_idx" ON "JiraIssueCache"("status");

-- CreateIndex
CREATE INDEX "JiraIssueCache_priority_idx" ON "JiraIssueCache"("priority");

-- CreateIndex
CREATE INDEX "JiraIssueCache_failureCategory_idx" ON "JiraIssueCache"("failureCategory");

-- CreateIndex
CREATE INDEX "JiraIssueCache_equipmentId_idx" ON "JiraIssueCache"("equipmentId");

-- CreateIndex
CREATE INDEX "JiraIssueCache_integrationId_idx" ON "JiraIssueCache"("integrationId");

-- CreateIndex
CREATE INDEX "JiraIssueCache_source_idx" ON "JiraIssueCache"("source");

-- CreateIndex
CREATE INDEX "JiraIssueCache_createdDate_idx" ON "JiraIssueCache"("createdDate");

-- CreateIndex
CREATE INDEX "JiraIssueCache_slaDeadline_idx" ON "JiraIssueCache"("slaDeadline");

-- CreateIndex
CREATE INDEX "MaintenancePlan_equipmentId_idx" ON "MaintenancePlan"("equipmentId");

-- CreateIndex
CREATE INDEX "MaintenancePlan_checklistId_idx" ON "MaintenancePlan"("checklistId");

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_scheduledDate_idx" ON "MaintenanceSchedule"("scheduledDate");

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_status_idx" ON "MaintenanceSchedule"("status");

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_equipmentId_idx" ON "MaintenanceSchedule"("equipmentId");

-- CreateIndex
CREATE INDEX "ChecklistTemplateItem_templateId_idx" ON "ChecklistTemplateItem"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistResult_scheduleId_key" ON "ChecklistResult"("scheduleId");

-- CreateIndex
CREATE INDEX "ChecklistResult_completedById_idx" ON "ChecklistResult"("completedById");

-- CreateIndex
CREATE INDEX "MaintenanceUsedPart_scheduleId_idx" ON "MaintenanceUsedPart"("scheduleId");

-- CreateIndex
CREATE INDEX "MaintenanceUsedPart_nomenclatureId_idx" ON "MaintenanceUsedPart"("nomenclatureId");

-- CreateIndex
CREATE INDEX "MaintenanceUsedPart_warehouseId_idx" ON "MaintenanceUsedPart"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackTicket_ticketNumber_key" ON "FeedbackTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "FeedbackTicket_type_idx" ON "FeedbackTicket"("type");

-- CreateIndex
CREATE INDEX "FeedbackTicket_module_idx" ON "FeedbackTicket"("module");

-- CreateIndex
CREATE INDEX "FeedbackTicket_status_idx" ON "FeedbackTicket"("status");

-- CreateIndex
CREATE INDEX "FeedbackTicket_priority_idx" ON "FeedbackTicket"("priority");

-- CreateIndex
CREATE INDEX "FeedbackTicket_createdById_idx" ON "FeedbackTicket"("createdById");

-- CreateIndex
CREATE INDEX "FeedbackTicket_assignedToId_idx" ON "FeedbackTicket"("assignedToId");

-- CreateIndex
CREATE INDEX "FeedbackTicket_createdAt_idx" ON "FeedbackTicket"("createdAt");

-- CreateIndex
CREATE INDEX "FeedbackTicket_deletedAt_idx" ON "FeedbackTicket"("deletedAt");

-- CreateIndex
CREATE INDEX "FeedbackComment_ticketId_idx" ON "FeedbackComment"("ticketId");

-- CreateIndex
CREATE INDEX "FeedbackComment_userId_idx" ON "FeedbackComment"("userId");

-- CreateIndex
CREATE INDEX "FeedbackComment_createdAt_idx" ON "FeedbackComment"("createdAt");

-- CreateIndex
CREATE INDEX "FeedbackAttachment_ticketId_idx" ON "FeedbackAttachment"("ticketId");

-- CreateIndex
CREATE INDEX "FeedbackAttachment_uploadedById_idx" ON "FeedbackAttachment"("uploadedById");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentTag" ADD CONSTRAINT "EquipmentTag_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentTag" ADD CONSTRAINT "EquipmentTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "CustomSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentApproval" ADD CONSTRAINT "EquipmentApproval_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentApproval" ADD CONSTRAINT "EquipmentApproval_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentApproval" ADD CONSTRAINT "EquipmentApproval_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageZone" ADD CONSTRAINT "StorageZone_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageCell" ADD CONSTRAINT "StorageCell_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "StorageZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NomenclatureCategory" ADD CONSTRAINT "NomenclatureCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NomenclatureCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nomenclature" ADD CONSTRAINT "Nomenclature_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "NomenclatureCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "Nomenclature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "StorageCell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOperation" ADD CONSTRAINT "StockOperation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOperation" ADD CONSTRAINT "StockOperation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOperationItem" ADD CONSTRAINT "StockOperationItem_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "StockOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOperationItem" ADD CONSTRAINT "StockOperationItem_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "Nomenclature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOperationItem" ADD CONSTRAINT "StockOperationItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentSparePart" ADD CONSTRAINT "EquipmentSparePart_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentSparePart" ADD CONSTRAINT "EquipmentSparePart_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "Nomenclature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "Nomenclature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_sourceWarehouseId_fkey" FOREIGN KEY ("sourceWarehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_targetWarehouseId_fkey" FOREIGN KEY ("targetWarehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_dispatchedById_fkey" FOREIGN KEY ("dispatchedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "Nomenclature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_targetCellId_fkey" FOREIGN KEY ("targetCellId") REFERENCES "StorageCell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraIssueCache" ADD CONSTRAINT "JiraIssueCache_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "SrmIntegration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MaintenancePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplateItem" ADD CONSTRAINT "ChecklistTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistResult" ADD CONSTRAINT "ChecklistResult_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "MaintenanceSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistResult" ADD CONSTRAINT "ChecklistResult_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceUsedPart" ADD CONSTRAINT "MaintenanceUsedPart_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "MaintenanceSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceUsedPart" ADD CONSTRAINT "MaintenanceUsedPart_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "Nomenclature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceUsedPart" ADD CONSTRAINT "MaintenanceUsedPart_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackTicket" ADD CONSTRAINT "FeedbackTicket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackTicket" ADD CONSTRAINT "FeedbackTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackComment" ADD CONSTRAINT "FeedbackComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "FeedbackTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackComment" ADD CONSTRAINT "FeedbackComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackAttachment" ADD CONSTRAINT "FeedbackAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "FeedbackTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackAttachment" ADD CONSTRAINT "FeedbackAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


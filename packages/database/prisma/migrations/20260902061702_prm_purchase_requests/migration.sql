-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'IN_PROGRESS', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PurchaseRequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'PURCHASE_REQUEST_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'PURCHASE_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'PURCHASE_REQUEST_REJECTED';

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "PurchaseRequestPriority" NOT NULL DEFAULT 'MEDIUM',
    "targetWarehouseId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resolutionComment" TEXT,
    "justification" TEXT,
    "supplierName" TEXT,
    "requiredByDate" TIMESTAMP(3),
    "equipmentId" TEXT,
    "maintenanceScheduleId" TEXT,
    "estimatedTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "nomenclatureId" TEXT NOT NULL,
    "requestedQty" DECIMAL(65,30) NOT NULL,
    "estimatedPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "actualPrice" DECIMAL(65,30),
    "receivedQty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "comment" TEXT,

    CONSTRAINT "PurchaseRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequest_requestNumber_key" ON "PurchaseRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "PurchaseRequest_status_idx" ON "PurchaseRequest"("status");

-- CreateIndex
CREATE INDEX "PurchaseRequest_targetWarehouseId_idx" ON "PurchaseRequest"("targetWarehouseId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_requesterId_idx" ON "PurchaseRequest"("requesterId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_equipmentId_idx" ON "PurchaseRequest"("equipmentId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_maintenanceScheduleId_idx" ON "PurchaseRequest"("maintenanceScheduleId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_createdAt_idx" ON "PurchaseRequest"("createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRequestItem_requestId_idx" ON "PurchaseRequestItem"("requestId");

-- CreateIndex
CREATE INDEX "PurchaseRequestItem_nomenclatureId_idx" ON "PurchaseRequestItem"("nomenclatureId");

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_targetWarehouseId_fkey" FOREIGN KEY ("targetWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_maintenanceScheduleId_fkey" FOREIGN KEY ("maintenanceScheduleId") REFERENCES "MaintenanceSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "Nomenclature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

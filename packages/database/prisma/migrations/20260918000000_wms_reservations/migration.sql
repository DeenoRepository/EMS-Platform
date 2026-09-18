-- WMS additive migration. Review against the production baseline before applying.
-- This migration never deletes or rewrites existing WMS rows.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'StockTransferStatus'
      AND e.enumlabel = 'PENDING_RESPONSIBLE_CONFIRMATION'
  ) THEN
    ALTER TYPE "StockTransferStatus" ADD VALUE 'PENDING_RESPONSIBLE_CONFIRMATION';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockReservationStatus') THEN
    CREATE TYPE "StockReservationStatus" AS ENUM ('ACTIVE', 'RECEIVED', 'RELEASED', 'CANCELLED');
  END IF;
END $$;

ALTER TABLE "StockItem"
  ADD COLUMN IF NOT EXISTS "reservedQuantity" DECIMAL(20,6) NOT NULL DEFAULT 0;

ALTER TABLE "StockTransferItem"
  ADD COLUMN IF NOT EXISTS "sourceCellId" TEXT;

ALTER TABLE "StorageZone"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "StorageCell"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "StockReservation" (
  "id" TEXT NOT NULL,
  "transferId" TEXT NOT NULL,
  "sourceWarehouseId" TEXT NOT NULL,
  "targetWarehouseId" TEXT NOT NULL,
  "nomenclatureId" TEXT NOT NULL,
  "quantity" DECIMAL(20,6) NOT NULL,
  "status" "StockReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "requiresResponsibleConfirmation" BOOLEAN NOT NULL DEFAULT false,
  "confirmedById" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StockCellBalance" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "cellId" TEXT NOT NULL,
  "nomenclatureId" TEXT NOT NULL,
  "quantity" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockCellBalance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StockReservation_transferId_nomenclatureId_key"
  ON "StockReservation" ("transferId", "nomenclatureId");
CREATE INDEX IF NOT EXISTS "StockReservation_sourceWarehouseId_nomenclatureId_status_idx"
  ON "StockReservation" ("sourceWarehouseId", "nomenclatureId", "status");
CREATE INDEX IF NOT EXISTS "StockReservation_targetWarehouseId_status_idx"
  ON "StockReservation" ("targetWarehouseId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "StockCellBalance_warehouseId_cellId_nomenclatureId_key"
  ON "StockCellBalance" ("warehouseId", "cellId", "nomenclatureId");
CREATE INDEX IF NOT EXISTS "StockCellBalance_warehouseId_nomenclatureId_idx"
  ON "StockCellBalance" ("warehouseId", "nomenclatureId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockTransferItem_sourceCellId_fkey') THEN
    ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_sourceCellId_fkey"
      FOREIGN KEY ("sourceCellId") REFERENCES "StorageCell"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockReservation_transferId_fkey') THEN
    ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_transferId_fkey"
      FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockReservation_sourceWarehouseId_fkey') THEN
    ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_sourceWarehouseId_fkey"
      FOREIGN KEY ("sourceWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockReservation_targetWarehouseId_fkey') THEN
    ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_targetWarehouseId_fkey"
      FOREIGN KEY ("targetWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockReservation_nomenclatureId_fkey') THEN
    ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_nomenclatureId_fkey"
      FOREIGN KEY ("nomenclatureId") REFERENCES "Nomenclature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockReservation_confirmedById_fkey') THEN
    ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_confirmedById_fkey"
      FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockCellBalance_warehouseId_fkey') THEN
    ALTER TABLE "StockCellBalance" ADD CONSTRAINT "StockCellBalance_warehouseId_fkey"
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockCellBalance_cellId_fkey') THEN
    ALTER TABLE "StockCellBalance" ADD CONSTRAINT "StockCellBalance_cellId_fkey"
      FOREIGN KEY ("cellId") REFERENCES "StorageCell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockCellBalance_nomenclatureId_fkey') THEN
    ALTER TABLE "StockCellBalance" ADD CONSTRAINT "StockCellBalance_nomenclatureId_fkey"
      FOREIGN KEY ("nomenclatureId") REFERENCES "Nomenclature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "StockItem"
  ADD CONSTRAINT "StockItem_reservedQuantity_nonnegative" CHECK ("reservedQuantity" >= 0) NOT VALID;
ALTER TABLE "StockReservation"
  ADD CONSTRAINT "StockReservation_quantity_positive" CHECK ("quantity" > 0) NOT VALID,
  ADD CONSTRAINT "StockReservation_distinct_warehouses" CHECK ("sourceWarehouseId" <> "targetWarehouseId") NOT VALID;
ALTER TABLE "StockCellBalance"
  ADD CONSTRAINT "StockCellBalance_quantity_nonnegative" CHECK ("quantity" >= 0) NOT VALID;

-- DRAFT ONLY. Never execute against VPS or any existing production database.
-- Validate the target schema and existing data on an isolated database first.

CREATE TABLE "WmsStockMovement" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "nomenclatureId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "deltaQuantity" DECIMAL(20,6) NOT NULL,
  "transferId" TEXT,
  "inventoryId" TEXT,
  "idempotencyKey" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WmsStockMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WmsStockMovement_delta_nonnegative_event" CHECK (
    ("eventType" IN ('RECEIPT', 'TRANSFER_IN') AND "deltaQuantity" > 0)
    OR ("eventType" IN ('ISSUE', 'TRANSFER_OUT') AND "deltaQuantity" < 0)
    OR ("eventType" = 'ADJUSTMENT' AND "deltaQuantity" <> 0)
  )
);

CREATE UNIQUE INDEX "WmsStockMovement_idempotencyKey_key"
  ON "WmsStockMovement"("idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

CREATE INDEX "WmsStockMovement_balance_idx"
  ON "WmsStockMovement"("warehouseId", "nomenclatureId", "createdAt");

CREATE TABLE "WmsStockReservation" (
  "id" TEXT NOT NULL,
  "transferId" TEXT NOT NULL,
  "sourceWarehouseId" TEXT NOT NULL,
  "targetWarehouseId" TEXT NOT NULL,
  "nomenclatureId" TEXT NOT NULL,
  "quantity" DECIMAL(20,6) NOT NULL,
  "status" TEXT NOT NULL,
  "requiresResponsibleConfirmation" BOOLEAN NOT NULL DEFAULT false,
  "confirmedById" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMP(3),
  CONSTRAINT "WmsStockReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WmsStockReservation_quantity_positive" CHECK ("quantity" > 0),
  CONSTRAINT "WmsStockReservation_distinct_warehouses" CHECK ("sourceWarehouseId" <> "targetWarehouseId")
);

CREATE UNIQUE INDEX "WmsStockReservation_transfer_item_active_key"
  ON "WmsStockReservation"("transferId", "nomenclatureId")
  WHERE "status" = 'ACTIVE';

CREATE INDEX "WmsStockReservation_source_available_idx"
  ON "WmsStockReservation"("sourceWarehouseId", "nomenclatureId", "status");

CREATE TABLE "WmsCellStock" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "cellId" TEXT NOT NULL,
  "nomenclatureId" TEXT NOT NULL,
  "quantity" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WmsCellStock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WmsCellStock_quantity_nonnegative" CHECK ("quantity" >= 0)
);

CREATE UNIQUE INDEX "WmsCellStock_warehouse_cell_nomenclature_key"
  ON "WmsCellStock"("warehouseId", "cellId", "nomenclatureId");

CREATE INDEX "WmsCellStock_balance_idx"
  ON "WmsCellStock"("warehouseId", "nomenclatureId");

-- Add foreign keys only after validating the actual table and column names:
-- ALTER TABLE "WmsStockMovement" ADD CONSTRAINT ... REFERENCES "Warehouse"("id");
-- ALTER TABLE "WmsStockMovement" ADD CONSTRAINT ... REFERENCES "Nomenclature"("id");

-- Future data-integrity constraints. Apply only after a read-only violation report:
-- ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_quantity_nonnegative" CHECK ("quantity" >= 0);
-- ALTER TABLE "StockOperationItem" ADD CONSTRAINT "StockOperationItem_quantity_positive" CHECK ("quantity" > 0);
-- ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_quantity_positive" CHECK ("quantity" > 0);
-- ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_distinct_warehouses" CHECK ("sourceWarehouseId" <> "targetWarehouseId");
-- ALTER TABLE "StockTransfer" ALTER COLUMN "status" DROP DEFAULT;
-- CREATE UNIQUE INDEX "Inventory_one_active_per_warehouse_key"
--   ON "Inventory"("warehouseId")
--   WHERE "status" IN ('DRAFT', 'IN_PROGRESS');

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

-- Add foreign keys only after validating the actual table and column names:
-- ALTER TABLE "WmsStockMovement" ADD CONSTRAINT ... REFERENCES "Warehouse"("id");
-- ALTER TABLE "WmsStockMovement" ADD CONSTRAINT ... REFERENCES "Nomenclature"("id");

-- Future data-integrity constraints. Apply only after a read-only violation report:
-- ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_quantity_nonnegative" CHECK ("quantity" >= 0);
-- ALTER TABLE "StockOperationItem" ADD CONSTRAINT "StockOperationItem_quantity_positive" CHECK ("quantity" > 0);
-- ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_quantity_positive" CHECK ("quantity" > 0);
-- ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_distinct_warehouses" CHECK ("sourceWarehouseId" <> "targetWarehouseId");
-- ALTER TABLE "StockTransfer" ALTER COLUMN "status" DROP DEFAULT;

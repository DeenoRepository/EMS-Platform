-- CreateTable
CREATE TABLE "PurchaseDelivery" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplierName" TEXT,
    "document" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "stockOperationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseDeliveryItem" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "requestItemId" TEXT NOT NULL,
    "receivedQty" DECIMAL(65,30) NOT NULL,
    "actualPrice" DECIMAL(65,30),

    CONSTRAINT "PurchaseDeliveryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseDelivery_idempotencyKey_key" ON "PurchaseDelivery"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseDelivery_stockOperationId_key" ON "PurchaseDelivery"("stockOperationId");

-- CreateIndex
CREATE INDEX "PurchaseDelivery_requestId_idx" ON "PurchaseDelivery"("requestId");

-- CreateIndex
CREATE INDEX "PurchaseDelivery_warehouseId_idx" ON "PurchaseDelivery"("warehouseId");

-- CreateIndex
CREATE INDEX "PurchaseDelivery_createdById_idx" ON "PurchaseDelivery"("createdById");

-- CreateIndex
CREATE INDEX "PurchaseDelivery_deliveryDate_idx" ON "PurchaseDelivery"("deliveryDate");

-- CreateIndex
CREATE INDEX "PurchaseDeliveryItem_requestItemId_idx" ON "PurchaseDeliveryItem"("requestItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseDeliveryItem_deliveryId_requestItemId_key" ON "PurchaseDeliveryItem"("deliveryId", "requestItemId");

-- AddForeignKey
ALTER TABLE "PurchaseDelivery" ADD CONSTRAINT "PurchaseDelivery_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDelivery" ADD CONSTRAINT "PurchaseDelivery_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDelivery" ADD CONSTRAINT "PurchaseDelivery_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDelivery" ADD CONSTRAINT "PurchaseDelivery_stockOperationId_fkey" FOREIGN KEY ("stockOperationId") REFERENCES "StockOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDeliveryItem" ADD CONSTRAINT "PurchaseDeliveryItem_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "PurchaseDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDeliveryItem" ADD CONSTRAINT "PurchaseDeliveryItem_requestItemId_fkey" FOREIGN KEY ("requestItemId") REFERENCES "PurchaseRequestItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

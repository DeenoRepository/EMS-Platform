-- AlterTable
ALTER TABLE "PurchaseRequest" ADD COLUMN "closedAt" TIMESTAMP(3),
ADD COLUMN "closedById" TEXT;

-- CreateIndex
CREATE INDEX "PurchaseRequest_closedById_idx" ON "PurchaseRequest"("closedById");

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

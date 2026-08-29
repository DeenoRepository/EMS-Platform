import type { OperationLineItem, OperationType } from './WmsOperationWizardDialog';

export interface OperationSubmitInput {
  operationType: OperationType;
  warehouseId: string;
  targetWarehouseId: string;
  equipmentId: string;
  recipientName: string;
  comment: string;
  lineItems: OperationLineItem[];
}

export function buildOperationSubmitPayload(input: OperationSubmitInput) {
  if (input.operationType === 'TRANSFER') {
    return {
      sourceWarehouseId: input.warehouseId,
      targetWarehouseId: input.targetWarehouseId,
      isRequest: false,
      requestReason: input.comment.trim() || undefined,
      items: input.lineItems.map((item) => ({
        nomenclatureId: item.nomenclatureId,
        quantity: item.quantity,
      })),
    };
  }

  return {
    type: input.operationType,
    warehouseId: input.warehouseId,
    targetWarehouseId: undefined,
    equipmentId: input.operationType === 'ISSUE_WRITE_OFF' && input.equipmentId ? input.equipmentId : undefined,
    recipientName: input.operationType === 'ISSUE_EMPLOYEE' ? input.recipientName.trim() : undefined,
    comment: input.comment.trim() || undefined,
    items: input.lineItems.map((item) => ({
      nomenclatureId: item.nomenclatureId,
      quantity: item.quantity,
      equipmentId: item.equipmentId || undefined,
    })),
  };
}

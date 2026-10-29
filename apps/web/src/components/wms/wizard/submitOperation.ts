import { OperationType, OperationLineItem } from './types';

interface SubmitWizardOperationParams {
  operationType: OperationType;
  warehouseId: string;
  targetWarehouseId?: string;
  comment?: string;
  recipientName?: string;
  equipmentId?: string;
  lineItems: OperationLineItem[];
}

export async function submitWmsWizardOperation(params: SubmitWizardOperationParams): Promise<{
  success: boolean;
  operationId?: string;
  message?: string;
  error?: string;
}> {
  const {
    operationType,
    warehouseId,
    targetWarehouseId,
    comment,
    recipientName,
    equipmentId,
    lineItems,
  } = params;

  if (operationType === 'TRANSFER') {
    const res = await fetch('/api/wms/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceWarehouseId: warehouseId,
        targetWarehouseId,
        isRequest: false,
        requestReason: comment?.trim() || undefined,
        items: lineItems.map((item) => ({
          nomenclatureId: item.nomenclatureId,
          quantity: item.quantity,
        })),
      }),
    });

    const json = await res.json();
    if (res.ok && json.success) {
      return {
        success: true,
        operationId: json.data?.id,
        message: json.message || 'Перемещение успешно оформлено и ожидает приемки получателем',
      };
    }
    return { success: false, error: json.error || 'Ошибка оформления перемещения' };
  }

  const res = await fetch('/api/wms/operations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: operationType,
      warehouseId,
      targetWarehouseId: undefined,
      equipmentId: operationType === 'ISSUE_WRITE_OFF' && equipmentId ? equipmentId : undefined,
      recipientName: operationType === 'ISSUE_EMPLOYEE' ? recipientName?.trim() : undefined,
      comment: comment?.trim() || undefined,
      items: lineItems.map((item) => ({
        nomenclatureId: item.nomenclatureId,
        quantity: item.quantity,
        equipmentId: item.equipmentId || undefined,
        cellId: item.cellId || undefined,
      })),
    }),
  });

  const json = await res.json();
  if (res.ok && json.success) {
    return {
      success: true,
      operationId: json.data?.id,
      message: 'Складская операция успешно проведена',
    };
  }
  return { success: false, error: json.error || 'Ошибка проведения операции' };
}

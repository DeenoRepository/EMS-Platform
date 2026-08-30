import type { OperationLineItem, OperationType } from './WmsOperationWizardDialog';

export interface OperationSubmitRequest {
  url: string;
  payload: ReturnType<typeof buildOperationSubmitPayload>;
}

export interface OperationSubmitOutcome {
  kind: 'success' | 'api-error';
  operationId?: string;
  message: string;
  variant: 'success' | 'error';
}

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

export function buildOperationSubmitRequest(input: OperationSubmitInput): OperationSubmitRequest {
  return {
    url: input.operationType === 'TRANSFER' ? '/api/wms/transfers' : '/api/wms/operations',
    payload: buildOperationSubmitPayload(input),
  };
}

export async function submitOperationRequest(
  input: OperationSubmitInput,
  fetcher: typeof fetch = fetch,
): Promise<OperationSubmitOutcome> {
  const request = buildOperationSubmitRequest(input);
  const response = await fetcher(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request.payload),
  });
  const json = await response.json() as { success?: boolean; message?: string; error?: string; data?: { id?: string } };

  if (response.ok && json.success && json.data?.id) {
    return {
      kind: 'success',
      operationId: json.data.id,
      message: input.operationType === 'TRANSFER'
        ? json.message || 'Перемещение успешно оформлено и ожидает приемки получателем'
        : 'Складская операция успешно проведена',
      variant: 'success',
    };
  }

  return {
    kind: 'api-error',
    message: json.error || (input.operationType === 'TRANSFER' ? 'Ошибка оформления перемещения' : 'Ошибка проведения операции'),
    variant: 'error',
  };
}

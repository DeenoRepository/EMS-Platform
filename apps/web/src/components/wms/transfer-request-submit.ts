export interface TransferRequestSubmitInput {
  sourceWarehouseId: string;
  targetWarehouseId: string;
  requestReason: string;
  lineItems: Array<{ nomenclatureId: string; quantity: number }>;
}

export function validateTransferRequest(input: TransferRequestSubmitInput): string | null {
  if (!input.sourceWarehouseId) return 'Выберите склад-донор, у которого запрашиваются ТМЦ';
  if (!input.targetWarehouseId) return 'Не определен ваш целевой склад';
  if (input.lineItems.length === 0) return 'Добавьте хотя бы одну позицию ТМЦ в заявку';
  return null;
}

export function buildTransferRequestPayload(input: TransferRequestSubmitInput) {
  return {
    sourceWarehouseId: input.sourceWarehouseId,
    targetWarehouseId: input.targetWarehouseId,
    isRequest: true,
    requestReason: input.requestReason.trim() || undefined,
    items: input.lineItems.map((item) => ({
      nomenclatureId: item.nomenclatureId,
      quantity: item.quantity,
    })),
  };
}

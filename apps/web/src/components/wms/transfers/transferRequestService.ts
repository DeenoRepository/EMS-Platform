import { RequestLineItem } from './TransferRequestSubcomponents';

export interface SubmitTransferParams {
  sourceWarehouseId: string;
  targetWarehouseId: string;
  requestReason?: string;
  items: RequestLineItem[];
}

export interface SubmitTransferResult {
  success: boolean;
  error?: string;
}

export async function submitTransferRequest(params: SubmitTransferParams): Promise<SubmitTransferResult> {
  try {
    const res = await fetch('/api/wms/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceWarehouseId: params.sourceWarehouseId,
        targetWarehouseId: params.targetWarehouseId,
        isRequest: true,
        requestReason: params.requestReason?.trim() || undefined,
        items: params.items.map((it) => ({
          nomenclatureId: it.nomenclatureId,
          quantity: it.quantity,
        })),
      }),
    });

    const json = await res.json();
    if (res.ok && json.success) {
      return { success: true };
    }
    return { success: false, error: json.error || 'Ошибка создания заявки' };
  } catch {
    return { success: false, error: 'Ошибка сети при отправке заявки' };
  }
}

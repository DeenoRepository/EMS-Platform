import { OperationType, PurchaseRequestStatus } from '@ems/database';

export interface DeliveryRequestItemState {
  id: string;
  nomenclatureId: string;
  requestedQty: number | string;
  receivedQty: number | string;
}

export interface DeliveryItemInput {
  requestItemId: string;
  nomenclatureId: string;
  receivedQty: number;
  actualPrice?: number | null;
}

export interface ReceiptPayloadItem {
  nomenclatureId: string;
  quantity: number;
}

export interface ReceiptOperationPayload {
  type: OperationType;
  warehouseId: string;
  createdById: string;
  counterparty?: string | null;
  document?: string | null;
  comment?: string | null;
  items: ReceiptPayloadItem[];
}

export interface DeliveryValidationResult {
  valid: boolean;
  error?: string;
}

const EXECUTABLE_REQUEST_STATUSES = new Set<PurchaseRequestStatus>([
  PurchaseRequestStatus.APPROVED,
  PurchaseRequestStatus.IN_PROGRESS,
  PurchaseRequestStatus.PARTIALLY_DELIVERED,
]);

/**
 * Determines the execution status from cumulative received quantities.
 * CLOSED is intentionally excluded: it is an explicit business action, not
 * an automatic result of quantity reconciliation.
 */
export function calculateDeliveryStatus(
  items: Array<Pick<DeliveryRequestItemState, 'requestedQty' | 'receivedQty'>>,
): PurchaseRequestStatus {
  if (items.length === 0) return PurchaseRequestStatus.IN_PROGRESS;

  const received = items.map((item) => Number(item.receivedQty));
  const requested = items.map((item) => Number(item.requestedQty));
  const hasReceived = received.some((quantity) => quantity > 0);
  const isDelivered = requested.every((quantity, index) => received[index] >= quantity);

  if (isDelivered) return PurchaseRequestStatus.DELIVERED;
  if (hasReceived) return PurchaseRequestStatus.PARTIALLY_DELIVERED;
  return PurchaseRequestStatus.IN_PROGRESS;
}

/**
 * Validates one delivery request against the current request status and the
 * remaining quantity of every request item. The function is pure so the API
 * route can validate before starting its transaction.
 */
export function validateDeliveryInput(params: {
  requestStatus: PurchaseRequestStatus;
  requestItems: DeliveryRequestItemState[];
  deliveryItems: DeliveryItemInput[];
}): DeliveryValidationResult {
  const { requestStatus, requestItems, deliveryItems } = params;
  if (!EXECUTABLE_REQUEST_STATUSES.has(requestStatus)) {
    return { valid: false, error: `Приёмка недоступна для заявки в статусе «${requestStatus}»` };
  }
  if (deliveryItems.length === 0) {
    return { valid: false, error: 'Добавьте хотя бы одну позицию приёмки' };
  }

  const requestItemsById = new Map(requestItems.map((item) => [item.id, item]));
  const seen = new Set<string>();

  for (const item of deliveryItems) {
    if (seen.has(item.requestItemId)) {
      return { valid: false, error: 'Одна позиция заявки указана в приёмке повторно' };
    }
    seen.add(item.requestItemId);

    if (!Number.isFinite(item.receivedQty) || item.receivedQty <= 0) {
      return { valid: false, error: 'Количество приёмки должно быть больше нуля' };
    }

    const requestItem = requestItemsById.get(item.requestItemId);
    if (!requestItem) {
      return { valid: false, error: 'Позиция приёмки не принадлежит заявке' };
    }

    const remaining = Number(requestItem.requestedQty) - Number(requestItem.receivedQty);
    if (item.receivedQty > remaining) {
      return {
        valid: false,
        error: `Приёмка превышает остаток по позиции: доступно ${remaining}, принято ${item.receivedQty}`,
      };
    }

    if (item.actualPrice !== undefined && item.actualPrice !== null && (!Number.isFinite(item.actualPrice) || item.actualPrice < 0)) {
      return { valid: false, error: 'Фактическая цена не может быть отрицательной' };
    }
  }

  return { valid: true };
}

/**
 * Builds the exact WMS receipt operation payload for a validated delivery.
 * No database calls or mutation happen here.
 */
export function buildReceiptOperationPayload(params: {
  warehouseId: string;
  createdById: string;
  supplierName?: string | null;
  document?: string | null;
  requestNumber: string;
  items: DeliveryItemInput[];
}): ReceiptOperationPayload {
  const { warehouseId, createdById, supplierName, document, requestNumber, items } = params;

  return {
    type: OperationType.RECEIPT,
    warehouseId,
    createdById,
    counterparty: supplierName?.trim() || null,
    document: document?.trim() || null,
    comment: `Приёмка по заявке PRM ${requestNumber}`,
    items: items.map((item) => ({
      nomenclatureId: item.nomenclatureId,
      quantity: item.receivedQty,
    })),
  };
}

export function calculateReceivedQuantity(
  currentReceivedQty: number | string,
  deliveryQuantity: number,
): number {
  return Number(currentReceivedQty) + deliveryQuantity;
}

export interface TransferRequestLineItem {
  nomenclatureId: string;
  nomenclatureName: string;
  nomenclatureArticle?: string;
  unit: string;
  quantity: number;
}

export interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  responsibleUserId?: string | null;
  responsibleUser?: { displayName: string } | null;
}

/**
 * Determines the destination (my) and default donor warehouse IDs when the
 * dialog opens, from the raw warehouse list and current user ID. Mirrors the
 * original inline `.find()` fallback chain exactly.
 */
export function resolveInitialWarehouseSelection(
  warehouses: WarehouseOption[],
  currentUserId?: string
): { targetWarehouseId: string; sourceWarehouseId: string } {
  const myWarehouse = warehouses.find((w) => w.responsibleUserId === currentUserId) || warehouses[0];
  if (!myWarehouse) return { targetWarehouseId: '', sourceWarehouseId: '' };
  const firstDonor = warehouses.find((w) => w.id !== myWarehouse.id);
  return {
    targetWarehouseId: myWarehouse.id,
    sourceWarehouseId: firstDonor ? firstDonor.id : '',
  };
}

/**
 * Adds a line item to the request, merging quantity into an existing row for
 * the same nomenclature instead of duplicating it. Extracted from
 * `handleAddItem` to isolate the merge-or-append branch from component state.
 */
export function addOrMergeLineItem(
  items: TransferRequestLineItem[],
  newItem: TransferRequestLineItem
): TransferRequestLineItem[] {
  const existingIdx = items.findIndex((it) => it.nomenclatureId === newItem.nomenclatureId);
  if (existingIdx >= 0) {
    const updated = [...items];
    updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + newItem.quantity };
    return updated;
  }
  return [...items, newItem];
}

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

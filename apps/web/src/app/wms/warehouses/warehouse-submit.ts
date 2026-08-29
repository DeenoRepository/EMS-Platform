export interface WarehouseSubmitInput {
  editingId: string | null;
  name: string;
  code: string;
  location: string;
  responsibleUserId: string;
  isActive: boolean;
}

export function validateWarehouseName(name: string): string | null {
  return name.trim() ? null : 'Укажите наименование склада';
}

export function buildWarehouseSubmitRequest(input: WarehouseSubmitInput) {
  return {
    url: input.editingId ? `/api/wms/warehouses/${input.editingId}` : '/api/wms/warehouses',
    method: input.editingId ? 'PATCH' : 'POST',
    body: {
      name: input.name.trim(),
      code: input.code.trim() || undefined,
      location: input.location.trim() || undefined,
      responsibleUserId: input.responsibleUserId ? input.responsibleUserId.trim() : null,
      isActive: input.isActive,
    },
  };
}

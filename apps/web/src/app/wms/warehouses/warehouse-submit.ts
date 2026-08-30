export interface WarehouseSubmitInput {
  editingId: string | null;
  name: string;
  code: string;
  location: string;
  responsibleUserId: string;
  isActive: boolean;
}

export interface WarehouseSubmitResponse {
  ok: boolean;
  json: () => Promise<{ success?: boolean; error?: string }>;
}

export interface WarehouseSubmitResponseHandlers {
  onSuccess: (message: string) => void;
  onApiError: (message: string) => void;
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

export async function submitWarehouseRequest(input: WarehouseSubmitInput): Promise<Response> {
  const request = buildWarehouseSubmitRequest(input);
  return fetch(request.url, {
    method: request.method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request.body),
  });
}

export async function handleWarehouseSubmitResponse(
  response: WarehouseSubmitResponse,
  editingId: string | null,
  handlers: WarehouseSubmitResponseHandlers,
): Promise<void> {
  const json = await response.json();
  if (response.ok && json.success) {
    handlers.onSuccess(editingId ? 'Склад обновлен' : 'Склад успешно создан');
    return;
  }

  handlers.onApiError(json.error || 'Ошибка сохранения склада');
}

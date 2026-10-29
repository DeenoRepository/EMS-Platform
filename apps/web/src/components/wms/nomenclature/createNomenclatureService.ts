export interface CreateNomenclaturePayload {
  name: string;
  article?: string;
  unit: string;
  categoryId?: string;
  minStock?: number;
  description?: string;
}

export interface CreateNomenclatureApiResult {
  success: boolean;
  data?: any;
  error?: string;
}

export async function submitCreateNomenclature(
  payload: CreateNomenclaturePayload
): Promise<CreateNomenclatureApiResult> {
  try {
    const res = await fetch('/api/wms/nomenclature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (res.ok && json.success) {
      return { success: true, data: json.data };
    }
    return { success: false, error: json.error || 'Ошибка создания номенклатуры' };
  } catch {
    return { success: false, error: 'Ошибка сети при создании номенклатуры' };
  }
}

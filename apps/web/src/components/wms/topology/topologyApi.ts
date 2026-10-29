import { StorageZone } from './types';

export async function fetchWarehouseZones(warehouseId: string): Promise<StorageZone[]> {
  const res = await fetch(`/api/wms/warehouses/${warehouseId}/zones`);
  if (!res.ok) throw new Error('Не удалось загрузить топологию склада');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Ошибка загрузки зон');
  return json.data;
}

export async function fetchCellDetails(cellId: string): Promise<any> {
  const res = await fetch(`/api/wms/cells/${cellId}`);
  if (!res.ok) throw new Error('Не удалось получить данные о ТМЦ в ячейке');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Ошибка загрузки содержимого ячейки');
  return json.data;
}

export async function createZoneApi(warehouseId: string, name: string, code: string, description?: string) {
  const res = await fetch(`/api/wms/warehouses/${warehouseId}/zones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || undefined,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Ошибка создания зоны');
  return json.data;
}

export async function deleteZoneApi(zoneId: string) {
  const res = await fetch(`/api/wms/zones/${zoneId}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Ошибка удаления зоны');
  return json;
}

export async function createCellApi(zoneId: string, code: string, name?: string) {
  const res = await fetch(`/api/wms/zones/${zoneId}/cells`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: code.trim().toUpperCase(),
      name: name?.trim() || undefined,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Ошибка добавления ячейки');
  return json.data;
}

export async function deleteCellApi(zoneId: string, cellId: string) {
  const res = await fetch(`/api/wms/zones/${zoneId}/cells?cellId=${cellId}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Ошибка удаления ячейки');
  return json;
}

export async function batchCreateCellsApi(zoneId: string, codes: string[], existingCodes: Set<string>): Promise<number> {
  let createdCount = 0;
  for (const code of codes) {
    if (existingCodes.has(code)) continue;
    const res = await fetch(`/api/wms/zones/${zoneId}/cells`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (res.ok) createdCount++;
  }
  return createdCount;
}

export interface QuickDispatchResult {
  success: boolean;
  error?: string;
}

interface QuickDispatchResponse {
  success?: unknown;
  error?: unknown;
}

export async function dispatchWmsTransfer(transferId: string): Promise<QuickDispatchResult> {
  const response = await fetch(`/api/wms/transfers/${transferId}/dispatch`, {
    method: 'POST',
  });
  const payload = (await response.json()) as QuickDispatchResponse;

  return {
    success: response.ok && payload.success === true,
    error: typeof payload.error === 'string' ? payload.error : undefined,
  };
}

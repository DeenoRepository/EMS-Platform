import { ApiResponse } from '@ems/shared';

export async function fetchApi<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || `HTTP Error ${res.status}`,
      };
    }
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Ошибка подключения к серверу',
    };
  }
}

import { ApiResponse } from '@ems/shared';

export async function fetchApi<T = unknown>(
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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Ошибка подключения к серверу';
    return {
      success: false,
      error: msg,
    };
  }
}

export async function fetchApiForm<T = unknown>(
  url: string,
  formData: FormData,
  options?: Omit<RequestInit, 'body'>
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      method: options?.method || 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || `HTTP Error ${res.status}`,
      };
    }
    return data;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Ошибка подключения к серверу';
    return {
      success: false,
      error: msg,
    };
  }
}


import type { ZoneOption } from './page';

interface ZoneResponse {
  success?: boolean;
  data?: unknown;
}

export function parseZoneResponse(response: ZoneResponse): ZoneOption[] | null {
  if (!response.success || !Array.isArray(response.data)) return null;
  return response.data as ZoneOption[];
}

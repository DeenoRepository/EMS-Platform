import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export type OutboundUrlScheme = 'http:' | 'https:' | 'ldap:' | 'ldaps:';

type HostLookup = (hostname: string) => Promise<string[]>;

export interface OutboundUrlValidationOptions {
  allowedSchemes: readonly OutboundUrlScheme[];
  allowedHosts?: readonly string[];
  lookup?: HostLookup;
}

export type OutboundUrlValidationResult =
  | { ok: true; url: URL }
  | { ok: false; error: string };

const DEFAULT_ALLOWED_HOSTS_ENV = 'OUTBOUND_ALLOWED_HOSTS';

function getConfiguredAllowedHosts(): string[] {
  return (process.env[DEFAULT_ALLOWED_HOSTS_ENV] || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return true;
  }

  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168)) ||
    (first === 198 && (second === 18 || second === 19))
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('::ffff:') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb') ||
    normalized.startsWith('ff')
  );
}

export function isBlockedOutboundIp(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return true;
}

async function lookupHostAddresses(hostname: string): Promise<string[]> {
  const records = await dnsLookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

function normalizeAllowedHosts(allowedHosts?: readonly string[]): Set<string> {
  return new Set(
    (allowedHosts ?? getConfiguredAllowedHosts())
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Validates a server-side outbound URL before network access.
 *
 * Private targets are denied by default. Internal services must be listed in
 * OUTBOUND_ALLOWED_HOSTS as a comma-separated exact hostname or IP allowlist.
 */
export async function validateOutboundUrl(
  rawUrl: string,
  options: OutboundUrlValidationOptions
): Promise<OutboundUrlValidationResult> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: 'Укажите корректный URL внешнего сервиса' };
  }

  if (!options.allowedSchemes.includes(url.protocol as OutboundUrlScheme)) {
    return { ok: false, error: 'Недопустимая схема URL для внешнего сервиса' };
  }

  if (url.username || url.password) {
    return { ok: false, error: 'URL не должен содержать учетные данные' };
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!hostname) {
    return { ok: false, error: 'URL должен содержать имя хоста' };
  }

  const allowedHosts = normalizeAllowedHosts(options.allowedHosts);
  if (allowedHosts.has(hostname)) {
    return { ok: true, url };
  }

  if (isIP(hostname)) {
    return isBlockedOutboundIp(hostname)
      ? { ok: false, error: 'Подключения к внутренним и служебным IP-адресам запрещены' }
      : { ok: true, url };
  }

  try {
    const lookup = options.lookup ?? lookupHostAddresses;
    const addresses = await lookup(hostname);
    if (addresses.length === 0 || addresses.some(isBlockedOutboundIp)) {
      return { ok: false, error: 'Имя хоста разрешается во внутренний или служебный IP-адрес' };
    }
  } catch {
    return { ok: false, error: 'Не удалось безопасно разрешить имя хоста' };
  }

  return { ok: true, url };
}

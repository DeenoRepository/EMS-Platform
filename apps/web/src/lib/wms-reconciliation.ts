export type LedgerEventType = 'RECEIPT' | 'ISSUE' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'ADJUSTMENT';

export interface LedgerMovement {
  id: string;
  warehouseId: string;
  nomenclatureId: string;
  eventType: LedgerEventType;
  deltaQuantity: string;
}

export interface ReconciliationBalance {
  warehouseId: string;
  nomenclatureId: string;
  ledgerQuantity: string;
}

export interface ReconciliationViolation {
  movementId: string;
  reason: 'NEGATIVE_INTERMEDIATE_BALANCE' | 'INVALID_DELTA' | 'UNSUPPORTED_EVENT';
}

export interface ReconciliationResult {
  balances: ReconciliationBalance[];
  violations: ReconciliationViolation[];
}

function parseDecimal(value: string): bigint | null {
  const normalized = value.trim();
  if (!/^-?\d+(\.\d{1,6})?$/.test(normalized)) return null;
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ''] = unsigned.split('.');
  const scaled = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
  return negative ? -scaled : scaled;
}

function formatDecimal(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 1_000_000n;
  const fraction = String(absolute % 1_000_000n).padStart(6, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

export function reconcileLedger(movements: LedgerMovement[]): ReconciliationResult {
  const balances = new Map<string, bigint>();
  const violations: ReconciliationViolation[] = [];

  for (const movement of movements) {
    if (!['RECEIPT', 'ISSUE', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT'].includes(movement.eventType)) {
      violations.push({ movementId: movement.id, reason: 'UNSUPPORTED_EVENT' });
      continue;
    }

    const delta = parseDecimal(movement.deltaQuantity);
    if (delta === null) {
      violations.push({ movementId: movement.id, reason: 'INVALID_DELTA' });
      continue;
    }

    const key = `${movement.warehouseId}:${movement.nomenclatureId}`;
    const next = (balances.get(key) ?? 0n) + delta;
    if (next < 0n) {
      violations.push({ movementId: movement.id, reason: 'NEGATIVE_INTERMEDIATE_BALANCE' });
      continue;
    }
    balances.set(key, next);
  }

  return {
    balances: [...balances.entries()].map(([key, ledgerQuantity]) => {
      const [warehouseId, nomenclatureId] = key.split(':');
      return { warehouseId, nomenclatureId, ledgerQuantity: formatDecimal(ledgerQuantity) };
    }),
    violations,
  };
}

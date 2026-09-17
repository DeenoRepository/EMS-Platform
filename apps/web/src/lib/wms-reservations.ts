export type ReservationStatus = 'ACTIVE' | 'RECEIVED' | 'RELEASED' | 'CANCELLED';

export interface ReservationBalance {
  available: number;
  reserved: number;
}

export function ownedQuantity(balance: ReservationBalance): number {
  return balance.available + balance.reserved;
}

export function reserveQuantity(balance: ReservationBalance, quantity: number): ReservationBalance | null {
  if (!Number.isFinite(quantity) || quantity <= 0 || balance.available < quantity) return null;
  return { available: balance.available - quantity, reserved: balance.reserved + quantity };
}

export function releaseReservation(balance: ReservationBalance, quantity: number): ReservationBalance | null {
  if (!Number.isFinite(quantity) || quantity <= 0 || balance.reserved < quantity) return null;
  return { available: balance.available + quantity, reserved: balance.reserved - quantity };
}

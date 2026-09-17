import { z } from 'zod';

const MAX_DECIMAL_SCALE = 6;

function hasValidScale(value: number | string): boolean {
  const decimalPart = String(value).trim().split('.')[1];
  return !decimalPart || decimalPart.length <= MAX_DECIMAL_SCALE;
}

const decimalInputSchema = z.union([z.number(), z.string()]).refine(
  (value) => {
    const raw = String(value).trim();
    return raw !== '' && Number.isFinite(Number(raw)) && hasValidScale(value);
  },
  'Укажите корректное конечное число с допустимой точностью'
);

export const movementQuantitySchema = decimalInputSchema
  .transform(Number)
  .refine((value) => value > 0, 'Количество должно быть больше нуля');

export const stockQuantitySchema = decimalInputSchema
  .transform(Number)
  .refine((value) => value >= 0, 'Количество не может быть отрицательным');

export function parseMovementQuantity(value: unknown): number | null {
  const result = movementQuantitySchema.safeParse(value);
  return result.success ? result.data : null;
}

export function parseStockQuantity(value: unknown): number | null {
  const result = stockQuantitySchema.safeParse(value);
  return result.success ? result.data : null;
}

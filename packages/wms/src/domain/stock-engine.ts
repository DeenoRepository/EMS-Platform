import { OperationType } from '@ems/database';

export interface StockBalance {
  warehouseId: string;
  nomenclatureId: string;
  quantity: number;
}

export interface StockIssueCalculationResult {
  newQuantity: number;
  isLowStock: boolean;
}

/**
 * Validates that an operation quantity is a valid, positive, finite number.
 */
export function validatePositiveQuantity(qty: unknown): number {
  const num = Number(qty);
  if (typeof num !== 'number' || isNaN(num) || !isFinite(num) || num <= 0) {
    throw new Error('Количество позиции должно быть больше нуля');
  }
  return num;
}

/**
 * Calculates stock balance after an issue or write-off with strict overdraft prevention.
 */
export function calculateStockIssue(
  currentQuantity: number,
  deductQuantity: number,
  minStockThreshold?: number | null
): StockIssueCalculationResult {
  const validDeduct = validatePositiveQuantity(deductQuantity);

  if (currentQuantity < validDeduct) {
    throw new Error(`Недостаточно остатка: доступно ${currentQuantity}, требуется ${validDeduct}`);
  }

  const newQuantity = currentQuantity - validDeduct;
  const isLowStock =
    minStockThreshold !== null &&
    minStockThreshold !== undefined &&
    newQuantity <= minStockThreshold;

  return {
    newQuantity,
    isLowStock,
  };
}

/**
 * Determines whether a given stock operation type increases or decreases inventory.
 */
export function isDeductingOperation(type: OperationType): boolean {
  return (
    type === OperationType.ISSUE ||
    type === OperationType.ISSUE_EMPLOYEE ||
    type === OperationType.ISSUE_WRITE_OFF ||
    type === OperationType.TRANSFER
  );
}

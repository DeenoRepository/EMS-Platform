import { StockTransferStatus } from '@ems/database';

export interface TransferState {
  id: string;
  status: StockTransferStatus;
  sourceWarehouseStock: number;
  targetWarehouseStock: number;
  transferQty: number;
}

/**
 * Dispatches a transfer from source warehouse.
 * Moves status to IN_TRANSIT and decrements source warehouse stock.
 */
export function dispatchTransfer(state: TransferState): TransferState {
  if (state.status !== StockTransferStatus.REQUESTED) {
    throw new Error(`Недопустимый переход: отгрузка невозможна из статуса ${state.status}`);
  }

  if (state.sourceWarehouseStock < state.transferQty) {
    throw new Error('Недостаточно остатка на складе-отправителе для отгрузки перемещения');
  }

  return {
    ...state,
    status: StockTransferStatus.IN_TRANSIT,
    sourceWarehouseStock: state.sourceWarehouseStock - state.transferQty,
  };
}

/**
 * Receives a transfer at target warehouse.
 * Moves status to COMPLETED and increments target warehouse stock.
 */
export function receiveTransfer(state: TransferState): TransferState {
  if (state.status !== StockTransferStatus.IN_TRANSIT) {
    throw new Error(`Недопустимый переход: приемка невозможна из статуса ${state.status}`);
  }

  return {
    ...state,
    status: StockTransferStatus.COMPLETED,
    targetWarehouseStock: state.targetWarehouseStock + state.transferQty,
  };
}

/**
 * Rejects a transfer.
 * If in IN_TRANSIT, rolls back stock to the source warehouse.
 */
export function rejectTransfer(state: TransferState, reason?: string): TransferState {
  if (state.status === StockTransferStatus.COMPLETED) {
    throw new Error('Нельзя отклонить уже завершенное перемещение');
  }
  if (state.status === StockTransferStatus.REJECTED) {
    throw new Error('Перемещение уже отклонено');
  }

  const rolledBackSourceStock =
    state.status === StockTransferStatus.IN_TRANSIT
      ? state.sourceWarehouseStock + state.transferQty
      : state.sourceWarehouseStock;

  return {
    ...state,
    status: StockTransferStatus.REJECTED,
    sourceWarehouseStock: rolledBackSourceStock,
  };
}

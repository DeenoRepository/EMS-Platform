import { OperationType, OperationLineItem, NomenclatureOption, EquipmentOption } from './types';

export interface FormatLineItemParams {
  nomenclature: NomenclatureOption;
  qty: number;
  isOutflow: boolean;
  availableStock: number;
  operationType: OperationType;
  itemWriteOffType: 'EQUIPMENT' | 'DEFECT' | 'SCRAP' | 'OTHER';
  equipment?: EquipmentOption;
  cellId?: string | null;
}

export function buildWriteOffDetails(
  itemWriteOffType: 'EQUIPMENT' | 'DEFECT' | 'SCRAP' | 'OTHER',
  equipment?: EquipmentOption
): { equipmentId?: string; equipmentName?: string; writeOffReason?: string } {
  if (itemWriteOffType === 'EQUIPMENT') {
    if (equipment) {
      return {
        equipmentId: equipment.id,
        equipmentName: `${equipment.name} (${equipment.inventoryNumber})`,
        writeOffReason: `Оборудование: ${equipment.name} (${equipment.inventoryNumber})`,
      };
    }
    return { writeOffReason: 'Общее списание на оборудование' };
  }
  if (itemWriteOffType === 'DEFECT') return { writeOffReason: 'Списание в брак / дефект' };
  if (itemWriteOffType === 'SCRAP') return { writeOffReason: 'Списание в неликвид' };
  return { writeOffReason: 'Утилизация / износ' };
}

export function validateAndFormatLineItem(
  params: FormatLineItemParams
): { error?: string; lineItem?: OperationLineItem } {
  const { nomenclature, qty, isOutflow, availableStock, operationType, itemWriteOffType, equipment, cellId } = params;

  if (isNaN(qty) || qty <= 0) {
    return { error: 'Укажите корректное количество (> 0)' };
  }

  if (isOutflow) {
    if (availableStock <= 0) {
      return { error: `Позиция «${nomenclature.name}» отсутствует на складе (остаток 0)` };
    }
    if (qty > availableStock) {
      return {
        error: `Недостаточно остатка для «${nomenclature.name}». Доступно: ${availableStock} ${nomenclature.unit}, запрошено: ${qty}`,
      };
    }
  }

  const writeOff = operationType === 'ISSUE_WRITE_OFF'
    ? buildWriteOffDetails(itemWriteOffType, equipment)
    : {};

  return {
    lineItem: {
      nomenclatureId: nomenclature.id,
      nomenclatureName: nomenclature.name,
      nomenclatureArticle: nomenclature.article || undefined,
      unit: nomenclature.unit,
      quantity: qty,
      cellId: operationType === 'RECEIPT' ? cellId || null : null,
      ...writeOff,
    },
  };
}

export function validateStepZero(
  warehouseId: string,
  operationType: OperationType,
  targetWarehouseId: string
): { isValid: boolean; error?: string } {
  if (!warehouseId) {
    return { isValid: false, error: 'Не определен закрепленный склад сотрудника' };
  }
  if (operationType === 'TRANSFER' && (!targetWarehouseId || targetWarehouseId === warehouseId)) {
    return { isValid: false, error: 'Выберите склад-получатель, отличный от закрепленного склада' };
  }
  return { isValid: true };
}

export function validateStepOne(
  items: OperationLineItem[],
  isOutflow: boolean,
  getWarehouseStock: (id: string) => number
): { isValid: boolean; error?: string } {
  if (items.length === 0) {
    return { isValid: false, error: 'Добавьте хотя бы одну позицию ТМЦ' };
  }

  for (const item of items) {
    if (!item.quantity || item.quantity <= 0 || isNaN(item.quantity)) {
      return { isValid: false, error: `Укажите корректное количество (> 0) для «${item.nomenclatureName}»` };
    }
  }

  if (isOutflow) {
    for (const item of items) {
      const rawStock = getWarehouseStock(item.nomenclatureId);
      const totalRequested = items
        .filter((it) => it.nomenclatureId === item.nomenclatureId)
        .reduce((sum, it) => sum + it.quantity, 0);
      if (totalRequested > rawStock) {
        return {
          isValid: false,
          error: `Превышен остаток для «${item.nomenclatureName}». На складе: ${rawStock} ${item.unit}, в операции: ${totalRequested} ${item.unit}`,
        };
      }
    }
  }

  return { isValid: true };
}

import type { EquipmentOption, NomenclatureOption, OperationLineItem, OperationType } from './WmsOperationWizardDialog';

export type ItemWriteOffType = 'EQUIPMENT' | 'DEFECT' | 'SCRAP' | 'OTHER';

export interface AddOperationItemInput {
  selectedNomenclature: NomenclatureOption | null;
  itemQty: string;
  isOutflow: boolean;
  getAvailableStock: (nomenclatureId: string) => number;
  operationType: OperationType;
  itemEquipmentId: string;
  itemWriteOffType: ItemWriteOffType;
  equipmentList: EquipmentOption[];
}

export type AddOperationItemResult =
  | { kind: 'error'; message: string; variant: 'warning' | 'error' }
  | { kind: 'item'; item: OperationLineItem };

export function buildOperationLineItem(input: AddOperationItemInput): AddOperationItemResult {
  const { selectedNomenclature } = input;
  if (!selectedNomenclature) {
    return { kind: 'error', message: 'Выберите номенклатурную позицию или создайте новую', variant: 'warning' };
  }

  const quantity = parseFloat(input.itemQty);
  if (Number.isNaN(quantity) || quantity <= 0) {
    return { kind: 'error', message: 'Укажите корректное количество (> 0)', variant: 'warning' };
  }

  if (input.isOutflow) {
    const available = input.getAvailableStock(selectedNomenclature.id);
    if (available <= 0) {
      return { kind: 'error', message: `Позиция «${selectedNomenclature.name}» отсутствует на складе (остаток 0)`, variant: 'error' };
    }
    if (quantity > available) {
      return { kind: 'error', message: `Недостаточно остатка для «${selectedNomenclature.name}». Доступно: ${available} ${selectedNomenclature.unit}, запрошено: ${quantity}`, variant: 'error' };
    }
  }

  const equipment = input.equipmentList.find((item) => item.id === input.itemEquipmentId);
  const writeOff = getWriteOffDetails(input.operationType, input.itemWriteOffType, equipment);
  return {
    kind: 'item',
    item: {
      nomenclatureId: selectedNomenclature.id,
      nomenclatureName: selectedNomenclature.name,
      nomenclatureArticle: selectedNomenclature.article || undefined,
      unit: selectedNomenclature.unit,
      quantity,
      ...writeOff,
    },
  };
}

function getWriteOffDetails(operationType: OperationType, writeOffType: ItemWriteOffType, equipment?: EquipmentOption) {
  if (operationType !== 'ISSUE_WRITE_OFF') return {};
  if (writeOffType === 'EQUIPMENT') {
    if (equipment) {
      const equipmentLabel = `${equipment.name} (${equipment.inventoryNumber})`;
      return { equipmentId: equipment.id, equipmentName: equipmentLabel, writeOffReason: `Оборудование: ${equipmentLabel}` };
    }
    return { writeOffReason: 'Общее списание на оборудование' };
  }
  const reasons: Record<Exclude<ItemWriteOffType, 'EQUIPMENT'>, string> = {
    DEFECT: 'Списание в брак / дефект',
    SCRAP: 'Списание в неликвид',
    OTHER: 'Утилизация / износ',
  };
  return { writeOffReason: reasons[writeOffType] };
}

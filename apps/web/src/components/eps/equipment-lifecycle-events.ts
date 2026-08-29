import { AUDIT_ACTION_MAP } from '@ems/shared';
import type { LifecycleEvent } from '@/components/ui';
import type { EquipmentDetails } from '@/app/eps/[id]/page';

export function buildEquipmentLifecycleEvents(
  equipment: EquipmentDetails,
  auditLogs: Record<string, unknown>[]
): LifecycleEvent[] {
  const events: LifecycleEvent[] = [];

  if (equipment.commissionDate) {
    events.push({
      id: `commissioning-${equipment.id}`,
      type: 'COMMISSIONING',
      title: 'Ввод единицы оборудования в эксплуатацию',
      description: `Оборудование «${equipment.name}» (инв. № ${equipment.inventoryNumber || 'Б/Н'}) введено в эксплуатацию на площадке ${equipment.location || 'Основная'}.`,
      date: equipment.commissionDate,
      author: 'Главный механик',
    });
  }

  equipment.maintenancePlans.forEach((maintenancePlan) => {
    events.push({
      id: `mro-${maintenancePlan.id}`,
      type: 'MAINTENANCE',
      title: `Регламент ТО: ${maintenancePlan.name || 'Периодическое обслуживание'}`,
      description: `Периодичность: ${maintenancePlan.frequency || 'Регламент'}.`,
      date: equipment.createdAt,
    });
  });

  equipment.spareParts.forEach((sparePart, index) => {
    events.push({
      id: `wms-${sparePart.nomenclature?.id || index}`,
      type: 'PARTS_REPLACED',
      title: `Установка комплектующих: ${sparePart.nomenclature?.name || 'ТМЦ'}`,
      description: `Артикул: ${sparePart.nomenclature?.article || 'Б/А'}. Ед. изм.: ${sparePart.nomenclature?.unit || 'шт.'}.`,
      date: equipment.createdAt,
    });
  });

  (equipment.jiraIssues || []).forEach((issue) => {
    events.push({
      id: `srm-${issue.id}`,
      type: 'INCIDENT',
      title: `Инцидент ServiceDesk: [${issue.issueKey}] ${issue.summary}`,
      description: `Приоритет: ${issue.priority}. Статус: ${issue.status}.`,
      date: issue.createdDate,
    });
  });

  auditLogs.forEach((log, index) => {
    const actionKey = String(log.action || 'UPDATE') as keyof typeof AUDIT_ACTION_MAP;
    events.push({
      id: `audit-${String(log.id || index)}`,
      type: actionKey === 'CREATE' ? 'COMMISSIONING' : 'AUDIT',
      title: `Аудит: ${AUDIT_ACTION_MAP[actionKey]?.label || actionKey} данных паспорта`,
      date: String(log.createdAt || equipment.updatedAt),
      description: 'Зафиксированы изменения в структуре паспорта или атрибутов оборудования.',
    });
  });

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

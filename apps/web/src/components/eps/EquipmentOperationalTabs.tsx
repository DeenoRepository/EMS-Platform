'use client';

import React from 'react';
import { type LifecycleEvent } from '@/components/ui';
import type { EquipmentDetails } from '@/app/eps/[id]/page';
import { EquipmentAuditHistoryTab, type EquipmentAuditLog } from '@/components/eps/EquipmentAuditHistoryTab';
import { EquipmentMaintenanceTab } from '@/components/eps/EquipmentMaintenanceTab';
import { EquipmentSparePartsTab } from '@/components/eps/EquipmentSparePartsTab';
import { EquipmentSrmIncidentsTab } from '@/components/eps/EquipmentSrmIncidentsTab';
import { EquipmentPrmTab } from '@/components/eps/EquipmentPrmTab';

interface EquipmentOperationalTabsProps {
  activeTab: number;
  equipment: EquipmentDetails;
  lifecycleEvents: LifecycleEvent[];
  auditLogs: EquipmentAuditLog[];
  loadingAudit: boolean;
  onCreateSrmRequest: () => void;
}

export function EquipmentOperationalTabs({
  activeTab,
  equipment,
  lifecycleEvents,
  auditLogs,
  loadingAudit,
  onCreateSrmRequest,
}: EquipmentOperationalTabsProps) {
  if (activeTab === 3) {
    return <EquipmentSparePartsTab equipment={equipment} />;
  }

  if (activeTab === 4) {
    return <EquipmentMaintenanceTab equipment={equipment} />;
  }

  if (activeTab === 5) {
    return <EquipmentPrmTab equipment={equipment} />;
  }

  if (activeTab === 6) {
    return <EquipmentSrmIncidentsTab equipment={equipment} onCreateSrmRequest={onCreateSrmRequest} />;
  }

  if (activeTab === 7) {
    return (
      <EquipmentAuditHistoryTab
        lifecycleEvents={lifecycleEvents}
        auditLogs={auditLogs}
        loadingAudit={loadingAudit}
      />
    );
  }

  return null;
}

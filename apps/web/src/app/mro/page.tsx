'use client';

import React from 'react';
import { ModuleMaintenanceState } from '@/components/ui';

export default function MroRetiredPage() {
  return (
    <ModuleMaintenanceState
      moduleName="ТО и Ремонт (MRO)"
      message="Прототип модуля MRO выведен из активной эксплуатации в соответствии с архитектурным планом перехода на модульный монолит EPS/WMS. Исторические регламенты и планы обслуживания доступны для просмотра в паспортах оборудования (EPS)."
    />
  );
}

'use client';

import React from 'react';
import { ModuleMaintenanceState } from '@/components/ui';

export default function SrmRetiredPage() {
  return (
    <ModuleMaintenanceState
      moduleName="Система подачи заявок (SRM)"
      message="Прототип модуля SRM выведен из активной эксплуатации в соответствии с архитектурным планом перехода на модульный монолит EPS/WMS. Исторические инциденты и сервисные заявки доступны для просмотра в паспортах оборудования (EPS)."
    />
  );
}

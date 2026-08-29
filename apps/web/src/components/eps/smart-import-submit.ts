import type { MissingFieldResolution, ValidatedRow } from './SmartImportWizard';

export interface SmartImportSubmitInput {
  rows: ValidatedRow[];
  columnMapping: Record<string, string>;
  resolutions: Record<string, MissingFieldResolution>;
  conflictStrategy: 'UPSERT' | 'SKIP';
}

export interface SmartImportSubmitPayload {
  rows: ValidatedRow[];
  columnMapping: Record<string, string>;
  newFieldDefinitions: Array<{
    header: string;
    key: string;
    name: string;
    fieldType: MissingFieldResolution['fieldType'];
    unit?: string;
    sectionId?: string;
    sectionName?: string;
    sectionCode?: string;
  }>;
  ignoredHeaders: string[];
  conflictStrategy: 'UPSERT' | 'SKIP';
}

export function buildSmartImportSubmitPayload({
  rows,
  columnMapping,
  resolutions,
  conflictStrategy,
}: SmartImportSubmitInput): SmartImportSubmitPayload {
  const newFieldDefinitions = Object.values(resolutions)
    .filter((resolution) => resolution.action === 'CREATE')
    .map((resolution) => ({
      header: resolution.header,
      key: resolution.key,
      name: resolution.name,
      fieldType: resolution.fieldType,
      unit: resolution.unit || undefined,
      sectionId: resolution.sectionId || undefined,
      sectionName: resolution.sectionName || undefined,
      sectionCode: resolution.sectionCode || undefined,
    }));

  const ignoredHeaders = Object.values(resolutions)
    .filter((resolution) => resolution.action === 'IGNORE')
    .map((resolution) => resolution.header);

  return {
    rows,
    columnMapping,
    newFieldDefinitions,
    ignoredHeaders,
    conflictStrategy,
  };
}

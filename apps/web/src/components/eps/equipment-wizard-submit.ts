export interface EquipmentWizardSubmitInput {
  name: string;
  inventoryNumber: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  location: string;
  status: string;
  commissionDate: string;
  tagIds: string[];
  customFields: Record<string, unknown>;
  submitForApproval: boolean;
}

export interface EquipmentWizardPayload {
  name: string;
  inventoryNumber?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  location?: string;
  status: string;
  commissionDate: string;
  tagIds: string[];
  customFields: Record<string, unknown>;
  asDraft: boolean;
  submitForApproval: boolean;
}

export function validateEquipmentWizardInput(input: Pick<EquipmentWizardSubmitInput, 'name'>): string | null {
  return input.name.trim() ? null : 'Наименование оборудования обязательно';
}

export function buildEquipmentWizardPayload(input: EquipmentWizardSubmitInput): EquipmentWizardPayload {
  return {
    name: input.name.trim(),
    inventoryNumber: input.inventoryNumber.trim() || undefined,
    serialNumber: input.serialNumber.trim() || undefined,
    manufacturer: input.manufacturer.trim() || undefined,
    model: input.model.trim() || undefined,
    location: input.location.trim() || undefined,
    status: input.status,
    commissionDate: input.commissionDate,
    tagIds: input.tagIds,
    customFields: input.customFields,
    asDraft: !input.submitForApproval,
    submitForApproval: input.submitForApproval,
  };
}


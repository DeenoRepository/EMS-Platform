import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen } from '../ui/__tests__/test-utils';
import { EquipmentWizardStepReview } from './EquipmentWizardStepReview';

describe('EquipmentWizardStepReview', () => {
  it('renders the equipment summary and custom field values', () => {
    renderWithProviders(
      <EquipmentWizardStepReview
        name="Main pump"
        inventoryNumber="INV-1"
        serialNumber="SN-1"
        manufacturer="Acme"
        model="PX-10"
        location="Workshop"
        status="ACTIVE"
        commissionDate="2026-09-01"
        sections={[{
          id: 'technical',
          code: 'TECH',
          name: 'Technical data',
          description: null,
          icon: null,
          sortOrder: 1,
          fields: [{ id: 'power', sectionId: 'technical', key: 'power', name: 'Power', fieldType: 'NUMBER', unit: 'kW', isRequired: false, defaultValue: null }],
        }]}
        customFieldValues={{ power: 7 }}
      />,
    );
    expect(screen.getByText('Main pump')).toBeInTheDocument();
    expect(screen.getByText('INV-1')).toBeInTheDocument();
    expect(screen.getByText('Technical data')).toBeInTheDocument();
    expect(screen.getByText(/7/)).toBeInTheDocument();
  });
});

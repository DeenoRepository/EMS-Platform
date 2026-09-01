import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '../ui/__tests__/test-utils';
import { EquipmentWizardStepTechnical } from './EquipmentWizardStepTechnical';

const onCustomFieldChange = vi.fn();

const sections = [{
  id: 'technical',
  code: 'TECH',
  name: 'Technical data',
  description: null,
  icon: null,
  sortOrder: 1,
  fields: [{ id: 'power', sectionId: 'technical', key: 'power', name: 'Power', fieldType: 'NUMBER' as const, unit: 'kW', isRequired: false, defaultValue: null }],
}];

beforeEach(() => vi.clearAllMocks());

describe('EquipmentWizardStepTechnical', () => {
  it('renders custom sections and forwards field value changes', () => {
    renderWithProviders(
      <EquipmentWizardStepTechnical
        sections={sections}
        unassignedFields={[]}
        customFieldValues={{ power: 5 }}
        onCustomFieldChange={onCustomFieldChange}
      />,
    );
    expect(screen.getByText('Technical data')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('5'), { target: { value: '7' } });
    expect(onCustomFieldChange).toHaveBeenCalledWith('power', '7');
  });

  it('renders the empty technical structure state', () => {
    renderWithProviders(<EquipmentWizardStepTechnical sections={[]} unassignedFields={[]} customFieldValues={{}} onCustomFieldChange={onCustomFieldChange} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/динамические секции и кастомные поля/i);
  });
});

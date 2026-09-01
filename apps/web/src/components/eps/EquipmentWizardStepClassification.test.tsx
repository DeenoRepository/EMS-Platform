import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '../ui/__tests__/test-utils';
import { EquipmentWizardStepClassification } from './EquipmentWizardStepClassification';

const props = {
  status: 'ACTIVE',
  commissionDate: '2026-09-01',
  tags: [
    { id: 'tag-1', name: 'Critical', color: null },
    { id: 'tag-2', name: 'Rotating', color: '#2563eb' },
  ],
  selectedTagIds: [],
  onStatusChange: vi.fn(),
  onCommissionDateChange: vi.fn(),
  onToggleTag: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe('EquipmentWizardStepClassification', () => {
  it('renders lifecycle controls and toggles a tag', () => {
    renderWithProviders(<EquipmentWizardStepClassification {...props} />);
    expect(screen.getByText('Статус жизненного цикла и метки классификации')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Critical'));
    expect(props.onToggleTag).toHaveBeenCalledWith('tag-1');
  });

  it('renders the empty tags state', () => {
    renderWithProviders(<EquipmentWizardStepClassification {...props} tags={[]} />);
    expect(screen.getByText('Теги пока не созданы в справочнике')).toBeInTheDocument();
  });
});

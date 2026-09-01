import { describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '../ui/__tests__/test-utils';
import { EquipmentEditDialog } from './EquipmentEditDialog';

const equipment = { id: 'eq-1', name: 'Pump' } as never;
const sections = [{
  id: 'technical',
  code: 'TECH',
  name: 'Technical data',
  description: null,
  icon: null,
  sortOrder: 1,
  fields: [{ id: 'mode', sectionId: 'technical', key: 'mode', name: 'Mode', fieldType: 'SELECT' as const, unit: null, isRequired: false, defaultValue: null, options: ['Auto', 'Manual'] }],
}];

describe('EquipmentEditDialog', () => {
  it('renders edit fields, custom fields, and save actions', () => {
    const onFormChange = vi.fn();
    const onCustomFieldChange = vi.fn();
    const onSave = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <EquipmentEditDialog
        open
        equipment={equipment}
        sections={sections}
        unassignedFields={[]}
        editForm={{ name: 'Pump', status: 'ACTIVE' }}
        editCustomFields={{ mode: 'Auto' }}
        onClose={onClose}
        onSave={onSave}
        onFormChange={onFormChange}
        onCustomFieldChange={onCustomFieldChange}
      />,
    );

    expect(screen.getByText('Редактирование паспорта оборудования')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('Pump'), { target: { value: 'Updated pump' } });
    expect(onFormChange).toHaveBeenCalledWith({ name: 'Updated pump', status: 'ACTIVE' });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить в черновик' }));
    fireEvent.click(screen.getByRole('button', { name: 'Отправить на согласование' }));
    expect(onSave).toHaveBeenNthCalledWith(1, false);
    expect(onSave).toHaveBeenNthCalledWith(2, true);
  });
});

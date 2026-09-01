import { describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '../ui/__tests__/test-utils';
import { EquipmentWizardStepIdentification } from './EquipmentWizardStepIdentification';

describe('EquipmentWizardStepIdentification', () => {
  it('renders identification fields and forwards edited values', () => {
    const handlers = {
      onNameChange: vi.fn(),
      onInventoryNumberChange: vi.fn(),
      onSerialNumberChange: vi.fn(),
      onManufacturerChange: vi.fn(),
      onModelChange: vi.fn(),
      onLocationChange: vi.fn(),
    };

    renderWithProviders(
      <EquipmentWizardStepIdentification
        name="Pump"
        inventoryNumber="INV-1"
        serialNumber="SN-1"
        manufacturer="Acme"
        model="PX-10"
        location="Workshop"
        {...handlers}
      />,
    );

    expect(screen.getByText('Основные реквизиты единицы оборудования')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('например: Центробежный насос подачи охлаждающей воды'), { target: { value: 'New pump' } });
    fireEvent.change(screen.getByPlaceholderText('например: EQ-2024-001'), { target: { value: 'INV-2' } });
    fireEvent.change(screen.getByPlaceholderText('например: Компрессорный цех, поз. К-2'), { target: { value: 'Line 2' } });
    expect(handlers.onNameChange).toHaveBeenCalledWith('New pump');
    expect(handlers.onInventoryNumberChange).toHaveBeenCalledWith('INV-2');
    expect(handlers.onLocationChange).toHaveBeenCalledWith('Line 2');
  });
});

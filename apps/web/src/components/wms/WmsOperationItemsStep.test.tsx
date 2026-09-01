import { describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '../ui/__tests__/test-utils';
import { WmsOperationItemsStep, type WmsOperationItemsStepProps } from './WmsOperationItemsStep';

const nomenclature = {
  id: 'nom-1',
  name: 'Filter',
  article: 'F-1',
  unit: 'pcs',
  category: { name: 'Spare parts' },
};

const equipment = {
  id: 'eq-1',
  name: 'Main pump',
  inventoryNumber: 'INV-1',
  model: 'PX-10',
  location: 'Workshop',
};

function buildProps(overrides: Partial<WmsOperationItemsStepProps> = {}): WmsOperationItemsStepProps {
  return {
    operationType: 'RECEIPT',
    currentOpMeta: {
      type: 'RECEIPT',
      title: 'Receipt',
      description: 'Receive stock',
      icon: <span>R</span>,
      color: 'success.main',
      bgcolor: 'success.light',
    },
    currentWarehouse: { id: 'wh-1', name: 'Main warehouse', code: 'MAIN' },
    targetWarehouseId: '',
    warehouses: [{ id: 'wh-1', name: 'Main warehouse', code: 'MAIN' }],
    recipientName: '',
    itemWriteOffType: 'EQUIPMENT',
    equipmentList: [equipment],
    selectedItemEquipment: null,
    nomenclatures: [nomenclature],
    selectedNomenclature: null,
    searchInputValue: '',
    itemQty: '1',
    lineItems: [],
    isOutflow: false,
    getWarehouseStock: vi.fn(() => 4),
    getAvailableStock: vi.fn(() => 4),
    getCurrentOpBannerTitle: vi.fn(() => 'Receipt'),
    onItemWriteOffTypeChange: vi.fn(),
    onSelectedItemEquipmentChange: vi.fn(),
    onSearchInputValueChange: vi.fn(),
    onSelectedNomenclatureChange: vi.fn(),
    onOpenCreateNomenclatureDialog: vi.fn(),
    onItemQuantityChange: vi.fn(),
    onAddItem: vi.fn(),
    onRemoveItem: vi.fn(),
    onBack: vi.fn(),
    onNext: vi.fn(),
    ...overrides,
  };
}

describe('WmsOperationItemsStep', () => {
  it('renders an empty operation and keeps next disabled until an item exists', () => {
    const props = buildProps();
    renderWithProviders(<WmsOperationItemsStep {...props} />);

    expect(screen.getByText('Позиции в операции (0):')).toBeInTheDocument();
    expect(screen.getByText('В операцию еще не добавлено ни одной позиции. Воспользуйтесь поиском выше.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /далее/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /новая номенклатура/i })).toBeInTheDocument();
  });

  it('emits quantity changes, create actions, and next navigation', () => {
    const props = buildProps({ selectedNomenclature: nomenclature, itemQty: '2' });
    renderWithProviders(<WmsOperationItemsStep {...props} />);

    fireEvent.change(screen.getByLabelText('Кол-во (pcs)'), { target: { value: '3' } });
    expect(props.onItemQuantityChange).toHaveBeenCalledWith('3');

    fireEvent.click(screen.getByRole('button', { name: /новая номенклатура/i }));
    expect(props.onOpenCreateNomenclatureDialog).toHaveBeenCalledWith('');

    fireEvent.click(screen.getByRole('button', { name: /далее/i }));
    expect(props.onNext).not.toHaveBeenCalled();
  });

  it('shows outflow reason controls and prevents adding when available stock is exhausted', () => {
    const props = buildProps({
      operationType: 'ISSUE_WRITE_OFF',
      isOutflow: true,
      currentOpMeta: {
        type: 'ISSUE_WRITE_OFF',
        title: 'Write-off',
        description: 'Write off stock',
        icon: <span>W</span>,
        color: 'warning.main',
        bgcolor: 'warning.light',
      },
      selectedNomenclature: nomenclature,
      getAvailableStock: vi.fn(() => 0),
    });
    renderWithProviders(<WmsOperationItemsStep {...props} />);

    expect(screen.getByText('Причина / основание списания:')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Брак / Дефект' }));
    expect(props.onItemWriteOffTypeChange).toHaveBeenCalledWith('DEFECT');
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled();
  });

  it('renders existing line items and delegates removal', () => {
    const props = buildProps({
      lineItems: [{
        nomenclatureId: 'nom-1',
        nomenclatureName: 'Filter',
        nomenclatureArticle: 'F-1',
        unit: 'pcs',
        quantity: 2,
      }],
    });
    renderWithProviders(<WmsOperationItemsStep {...props} />);

    expect(screen.getByText('Позиции в операции (1):')).toBeInTheDocument();
    expect(screen.getByText('Filter')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button').find((button) => button.querySelector('[data-testid="DeleteOutlineIcon"]'))!);
    expect(props.onRemoveItem).toHaveBeenCalledWith(0);
    expect(screen.getByRole('button', { name: /далее/i })).not.toBeDisabled();
  });
});

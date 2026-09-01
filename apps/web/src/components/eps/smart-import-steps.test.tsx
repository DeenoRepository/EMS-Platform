import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '../ui/__tests__/test-utils';
import { SmartImportUploadStep } from './SmartImportUploadStep';
import { SmartImportMappingStep } from './SmartImportMappingStep';
import { SmartImportPreviewStep } from './SmartImportPreviewStep';

const callbacks = {
  onFileChange: vi.fn(),
  onAnalyze: vi.fn(),
  onDownloadTemplate: vi.fn(),
  onUpdateResolution: vi.fn(),
  onBack: vi.fn(),
  onProceed: vi.fn(),
  onConflictStrategyChange: vi.fn(),
  onPreviewFilterChange: vi.fn(),
  onExecute: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe('Smart import step components', () => {
  it('keeps analysis disabled without a file and exposes template action', () => {
    renderWithProviders(<SmartImportUploadStep selectedFile={null} analyzing={false} {...callbacks} />);
    expect(screen.getByRole('button', { name: 'Анализировать структуру файла' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Скачать шаблон Excel/i }));
    expect(callbacks.onDownloadTemplate).toHaveBeenCalledTimes(1);
  });

  it('renders missing-field resolution and reports action changes', () => {
    renderWithProviders(
      <SmartImportMappingStep
        fileHeaders={['Power']}
        columnMapping={{ Power: 'power' }}
        missingFields={[{ header: 'Power', suggestedName: 'Мощность', suggestedKey: 'power', suggestedType: 'NUMBER', suggestedUnit: '', sampleValues: ['5'] }]}
        resolutions={{}}
        availableSections={[{ id: 'technical', name: 'Technical' }]}
        onUpdateResolution={callbacks.onUpdateResolution}
        onBack={callbacks.onBack}
        onProceed={callbacks.onProceed}
      />,
    );
    expect(screen.getByText(/Разрешение недостающих полей/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Игнорировать'));
    expect(callbacks.onUpdateResolution).toHaveBeenCalledWith('Power', { action: 'IGNORE' });
    fireEvent.click(screen.getByRole('button', { name: /Продолжить к проверке коллизий/i }));
    expect(callbacks.onProceed).toHaveBeenCalledTimes(1);
  });

  it('switches collision strategy and filters preview rows', () => {
    renderWithProviders(
      <SmartImportPreviewStep
        conflictStrategy="UPSERT"
        previewFilter="ALL"
        filteredRows={[{ rowIndex: 2, status: 'NEW', data: { name: 'Pump', inventoryNumber: 'INV-1' } } as never]}
        totalRowsCount={1}
        newCount={1}
        collisionCount={0}
        errorCount={0}
        executingImport={false}
        onConflictStrategyChange={callbacks.onConflictStrategyChange}
        onPreviewFilterChange={callbacks.onPreviewFilterChange}
        onBack={callbacks.onBack}
        onExecute={callbacks.onExecute}
      />,
    );
    expect(screen.getByText('Pump')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Пропустить дубликаты/));
    expect(callbacks.onConflictStrategyChange).toHaveBeenCalledWith('SKIP');
    fireEvent.click(screen.getByText(/Новые \(1\)/));
    expect(callbacks.onPreviewFilterChange).toHaveBeenCalledWith('NEW');
    fireEvent.click(screen.getByRole('button', { name: /Импортировать 1 записей/i }));
    expect(callbacks.onExecute).toHaveBeenCalledTimes(1);
  });
});

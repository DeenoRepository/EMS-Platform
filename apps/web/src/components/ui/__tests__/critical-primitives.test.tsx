import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen } from './test-utils';
import { PermissionGate } from '../PermissionGate';
import { FilterToolbar } from '../FilterToolbar';
import { DynamicFieldRenderer } from '../DynamicFieldRenderer';
import { FileUploadDropzone } from '../FileUploadDropzone';
import { ErrorBoundary } from '../ErrorBoundary';
import { FormDialog } from '../FormDialog';

const authState = {
  hasPermission: vi.fn<(permission: string) => boolean>(),
  hasAnyPermission: vi.fn<(permissions: string[]) => boolean>(),
  isLoading: false,
};

vi.mock('@/lib/auth-client', () => ({
  useAuth: () => authState,
}));

beforeEach(() => {
  authState.hasPermission.mockReset();
  authState.hasAnyPermission.mockReset();
  authState.isLoading = false;
});

describe('PermissionGate', () => {
  it('renders children only when all required permissions are present', () => {
    authState.hasPermission.mockReturnValueOnce(true).mockReturnValueOnce(false);
    renderWithProviders(
      <PermissionGate permission={['equipment.view', 'equipment.edit']} fallback={<span>Denied</span>}>
        <span>Allowed</span>
      </PermissionGate>,
    );

    expect(screen.queryByText('Allowed')).not.toBeInTheDocument();
    expect(screen.getByText('Denied')).toBeInTheDocument();
    expect(authState.hasPermission).toHaveBeenCalledWith('equipment.view');
    expect(authState.hasPermission).toHaveBeenCalledWith('equipment.edit');
  });

  it('uses any-permission mode and renders nothing while auth is loading', () => {
    authState.hasAnyPermission.mockReturnValue(true);
    renderWithProviders(
      <PermissionGate permission={['equipment.view', 'equipment.edit']} match="any">
        <span>Allowed</span>
      </PermissionGate>,
    );
    expect(screen.getByText('Allowed')).toBeInTheDocument();
    expect(authState.hasAnyPermission).toHaveBeenCalledWith(['equipment.view', 'equipment.edit']);

    authState.isLoading = true;
    const { container } = renderWithProviders(<PermissionGate permission="equipment.view"><span>Hidden</span></PermissionGate>);
    expect(container).not.toHaveTextContent('Hidden');
  });
});

describe('FilterToolbar', () => {
  it('renders embedded controls, actions, and a reset button only for active filters', () => {
    const onReset = vi.fn();
    renderWithProviders(
      <FilterToolbar activeFilterCount={2} onResetFilters={onReset} variant="embedded" actions={<button>Export</button>}>
        <label htmlFor="search">Search</label><input id="search" />
      </FilterToolbar>,
    );

    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Сбросить \(2\)/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('does not show reset when there are no active filters', () => {
    renderWithProviders(<FilterToolbar activeFilterCount={0}><span>Filters</span></FilterToolbar>);
    expect(screen.queryByRole('button', { name: /Сбросить/i })).not.toBeInTheDocument();
  });
});

describe('DynamicFieldRenderer', () => {
  it('renders view values for boolean, number, select, date, and empty fields', () => {
    const { rerender } = renderWithProviders(
      <DynamicFieldRenderer field={{ label: 'Enabled', fieldType: 'BOOLEAN' }} value={true} mode="view" />,
    );
    expect(screen.getByText('Да')).toBeInTheDocument();

    rerender(<DynamicFieldRenderer field={{ label: 'Count', fieldType: 'NUMBER', unit: 'шт' }} value={12} mode="view" />);
    expect(screen.getByText(/12/)).toHaveTextContent('шт');

    rerender(<DynamicFieldRenderer field={{ label: 'State', fieldType: 'SELECT' }} value="Active" mode="view" />);
    expect(screen.getByText('Active')).toBeInTheDocument();

    rerender(<DynamicFieldRenderer field={{ label: 'Missing', fieldType: 'TEXT' }} value={null} mode="view" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('emits typed edit values and parses select options from JSON and CSV', () => {
    const onChange = vi.fn();
    const { rerender } = renderWithProviders(
      <DynamicFieldRenderer field={{ label: 'Amount', fieldType: 'NUMBER' }} value={1} onChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '7' } });
    expect(onChange).toHaveBeenLastCalledWith(7);

    rerender(<DynamicFieldRenderer field={{ label: 'Mode', fieldType: 'SELECT', options: 'One, Two' }} value="" onChange={onChange} />);
    fireEvent.mouseDown(screen.getByLabelText('Mode'));
    expect(screen.getByRole('option', { name: 'One' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Two' })).toBeInTheDocument();

    rerender(<DynamicFieldRenderer field={{ label: 'Enabled', fieldType: 'BOOLEAN' }} value={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Enabled/i }));
    expect(onChange).toHaveBeenLastCalledWith(true);
  });
});

describe('FileUploadDropzone', () => {
  it('accepts valid files, calls both callbacks, and removes selected files', () => {
    const onChange = vi.fn();
    const onFileSelect = vi.fn();
    const file = new File(['pdf'], 'manual.pdf', { type: 'application/pdf' });
    const { container } = renderWithProviders(
      <FileUploadDropzone files={[file]} onChange={onChange} onFileSelect={onFileSelect} />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelect).toHaveBeenCalledWith(file);
    expect(onChange).toHaveBeenCalledWith([file]);
    expect(screen.getByText('manual.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Удалить файл' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('shows validation errors for unsupported and oversized files', () => {
    const { container, rerender } = renderWithProviders(<FileUploadDropzone accept=".pdf" />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['text'], 'notes.txt', { type: 'text/plain' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent(/не поддерживается/i);

    rerender(<FileUploadDropzone maxSizeMb={1} />);
    const large = new File([new Uint8Array(2 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [large] } });
    expect(screen.getByRole('alert')).toHaveTextContent(/превышает лимит/i);
  });
});

function BrokenComponent(): never {
  throw new Error('private stack details');
}

describe('ErrorBoundary', () => {
  it('renders a custom fallback and reports the original error', () => {
    const onError = vi.fn();
    renderWithProviders(
      <ErrorBoundary onError={onError} fallback={<span>Recoverable error</span>}>
        <BrokenComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Recoverable error')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({ message: 'private stack details' });
  });
});

describe('FormDialog', () => {
  it('submits a form and closes cleanly when it is not dirty', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(
      <FormDialog open title="Edit equipment" onSubmit={onSubmit} onClose={onClose}>
        <label htmlFor="name">Name</label><input id="name" />
      </FormDialog>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('requires confirmation before closing a dirty form and disables submit while loading', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(
      <FormDialog open title="Edit equipment" isDirty loading onSubmit={onSubmit} onClose={onClose}>
        <span>Form body</span>
      </FormDialog>,
    );

    expect(screen.getByRole('button', { name: 'Сохранение...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeDisabled();

    // A separate dirty instance exercises the confirmation branch.
    const { unmount } = renderWithProviders(
      <FormDialog open title="Dirty form" isDirty onClose={onClose}>
        <span>Dirty body</span>
      </FormDialog>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.getByText('Несохраненные изменения')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть без сохранения' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });
});

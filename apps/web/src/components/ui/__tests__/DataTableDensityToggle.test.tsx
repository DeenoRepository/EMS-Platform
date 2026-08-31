import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from './test-utils';
import { DensityToggle } from '../DataTableDensityToggle';

describe('DensityToggle', () => {
  it('invokes onChange with compact when the first button is clicked', () => {
    const onChange = vi.fn();
    renderWithProviders(<DensityToggle currentDensity="standard" onChange={onChange} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onChange).toHaveBeenCalledWith('compact');
  });

  it('invokes onChange with standard when the second button is clicked', () => {
    const onChange = vi.fn();
    renderWithProviders(<DensityToggle currentDensity="compact" onChange={onChange} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    expect(onChange).toHaveBeenCalledWith('standard');
  });
});

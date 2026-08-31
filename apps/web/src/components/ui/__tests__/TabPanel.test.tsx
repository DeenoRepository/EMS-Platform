import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from './test-utils';
import { NavTabsContainer, TabPanel, type TabItem } from '../TabPanel';

const tabs: TabItem[] = [
  { label: 'Первая', value: 'first' },
  { label: 'Вторая', value: 'second', badge: 3 },
];

describe('NavTabsContainer', () => {
  it('renders all tab labels and a badge for the badged tab', () => {
    renderWithProviders(<NavTabsContainer tabs={tabs} value="first" onChange={vi.fn()} />);
    expect(screen.getByText('Первая')).toBeInTheDocument();
    expect(screen.getByText('Вторая')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('invokes onChange with the new tab value when clicked', () => {
    const onChange = vi.fn();
    renderWithProviders(<NavTabsContainer tabs={tabs} value="first" onChange={onChange} />);
    fireEvent.click(screen.getByText('Вторая'));
    expect(onChange).toHaveBeenCalledWith('second');
  });
});

describe('TabPanel', () => {
  it('renders children when value matches currentValue', () => {
    renderWithProviders(
      <TabPanel value="a" currentValue="a">
        <span>Panel content</span>
      </TabPanel>,
    );
    expect(screen.getByText('Panel content')).toBeInTheDocument();
  });

  it('returns null when not selected and keepMounted is false', () => {
    renderWithProviders(
      <TabPanel value="a" currentValue="b">
        <span>Hidden content</span>
      </TabPanel>,
    );
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
  });

  it('renders a hidden panel when not selected but keepMounted is true', () => {
    renderWithProviders(
      <TabPanel value="a" currentValue="b" keepMounted>
        <span>Kept content</span>
      </TabPanel>,
    );
    const panel = screen.getByText('Kept content').closest('[role="tabpanel"]');
    expect(panel).toHaveAttribute('hidden');
  });
});

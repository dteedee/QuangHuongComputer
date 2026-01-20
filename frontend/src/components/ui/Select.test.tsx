import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('Select', () => {
  it('renders correctly', () => {
    render(<Select options={mockOptions} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Select label="Choose option" options={mockOptions} />);
    expect(screen.getByLabelText('Choose option')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<Select options={mockOptions} />);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('renders with error message', () => {
    render(
      <Select label="Category" options={mockOptions} error="Required field" />
    );
    expect(screen.getByText('Required field')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('sets aria-invalid when error is present', () => {
    render(
      <Select label="Category" options={mockOptions} error="Invalid selection" />
    );
    const select = screen.getByLabelText('Category');
    expect(select).toHaveAttribute('aria-invalid', 'true');
  });

  it('handles user selection', async () => {
    const user = userEvent.setup();
    render(<Select label="Category" options={mockOptions} />);

    const select = screen.getByLabelText('Category');
    await user.selectOptions(select, 'option2');

    expect(select).toHaveValue('option2');
  });

  it('can be disabled', () => {
    render(<Select disabled options={mockOptions} />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('respects defaultValue', () => {
    render(<Select options={mockOptions} defaultValue="option2" />);
    expect(screen.getByRole('combobox')).toHaveValue('option2');
  });
});

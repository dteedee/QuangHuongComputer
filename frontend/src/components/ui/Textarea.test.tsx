import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('renders correctly', () => {
    render(<Textarea placeholder="Enter description" />);
    expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Textarea label="Description" placeholder="Enter description" />);
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('renders with error message', () => {
    render(
      <Textarea label="Description" error="Description is required" />
    );
    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('sets aria-invalid when error is present', () => {
    render(
      <Textarea label="Description" error="Description is too short" />
    );
    const textarea = screen.getByLabelText('Description');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
  });

  it('handles user input', async () => {
    const user = userEvent.setup();
    render(<Textarea placeholder="Enter text" />);

    const textarea = screen.getByPlaceholderText('Enter text');
    await user.type(textarea, 'Hello World');

    expect(textarea).toHaveValue('Hello World');
  });

  it('can be disabled', () => {
    render(<Textarea disabled placeholder="Disabled" />);
    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled();
  });

  it('respects rows attribute', () => {
    render(<Textarea rows={5} placeholder="Text" />);
    expect(screen.getByPlaceholderText('Text')).toHaveAttribute('rows', '5');
  });

  it('links error message with textarea via aria-describedby', () => {
    render(
      <Textarea label="Description" error="Description is required" />
    );
    const textarea = screen.getByLabelText('Description');
    const errorId = textarea.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    expect(screen.getByText('Description is required')).toHaveAttribute(
      'id',
      errorId!
    );
  });
});

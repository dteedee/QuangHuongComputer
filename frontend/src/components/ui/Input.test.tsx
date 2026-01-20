import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';
import { Mail } from 'lucide-react';

describe('Input', () => {
  it('renders correctly', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Input label="Email" placeholder="Enter email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders with error message', () => {
    render(<Input label="Email" error="Email is required" />);
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('sets aria-invalid when error is present', () => {
    render(<Input label="Email" error="Invalid email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders with icon on left', () => {
    render(<Input icon={Mail} iconPosition="left" placeholder="Email" />);
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
  });

  it('renders with icon on right', () => {
    render(<Input icon={Mail} iconPosition="right" placeholder="Email" />);
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
  });

  it('handles user input', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Enter text" />);

    const input = screen.getByPlaceholderText('Enter text');
    await user.type(input, 'Hello World');

    expect(input).toHaveValue('Hello World');
  });

  it('can be disabled', () => {
    render(<Input disabled placeholder="Disabled" />);
    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled();
  });

  it('respects type attribute', () => {
    render(<Input type="password" placeholder="Password" />);
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute(
      'type',
      'password'
    );
  });

  it('links error message with input via aria-describedby', () => {
    render(<Input label="Email" error="Email is required" />);
    const input = screen.getByLabelText('Email');
    const errorId = input.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    expect(screen.getByText('Email is required')).toHaveAttribute('id', errorId!);
  });
});

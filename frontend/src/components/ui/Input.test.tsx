import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';
import { Mail } from 'lucide-react';

describe('Input Component', () => {
  it('renders correctly with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with icon on left', () => {
    render(<Input label="Email" icon={Mail} iconPosition="left" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('pl-12');
  });

  it('renders with icon on right', () => {
    render(<Input label="Email" icon={Mail} iconPosition="right" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('pr-12');
  });

  it('shows error message', () => {
    render(<Input label="Email" error="Email is required" />);
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toHaveClass('text-red-500');
  });

  it('applies error styles', () => {
    render(<Input label="Email" error="Email is required" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500');
  });

  it('handles user input', () => {
    render(<Input label="Email" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(input.value).toBe('test@example.com');
  });

  it('generates id from label', () => {
    render(<Input label="Email Address" />);
    const input = screen.getByRole('textbox');
    expect(input.id).toBe('email-address');
  });

  it('uses custom id if provided', () => {
    render(<Input label="Email" id="custom-id" />);
    const input = screen.getByRole('textbox');
    expect(input.id).toBe('custom-id');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input label="Email" disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Input label="Email" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('renders without label', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.queryByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByLabelText(/./)).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Input label="Email" className="custom-class" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  it('passes through additional props', () => {
    render(<Input label="Email" type="email" placeholder="Enter email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'Enter email');
  });

  it('handles focus events', () => {
    render(<Input label="Email" />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    expect(input).toHaveFocus();
  });

  it('handles change events', () => {
    const handleChange = vi.fn();
    render(<Input label="Email" onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'a' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('is accessible with label association', () => {
    render(<Input label="Email Address" />);
    const input = screen.getByRole('textbox');
    const label = screen.getByText('Email Address');
    expect(label.tagName).toBe('LABEL');
    expect(input.id).toBe('email-address');
  });
});

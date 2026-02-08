import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
import { Plus, Mail } from 'lucide-react';

describe('Button Component', () => {
  it('renders correctly with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders with primary variant by default', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-[#D70018]');
  });

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-[#D70018]');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('border-2', 'border-[#D70018]');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');

    rerender(<Button variant="success">Success</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-green-600');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-sm');

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-base');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-lg');
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveClass('disabled:opacity-50');
  });

  it('shows spinner when loading', () => {
    render(<Button loading>Loading</Button>);
    const spinner = screen.getByText('Loading').previousElementSibling;
    expect(spinner).toHaveClass('animate-spin');
  });

  it('renders with disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not show icon when loading', () => {
    render(<Button loading icon={Plus}>Add</Button>);
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
  });

  it('renders with icon on left', () => {
    render(
      <Button icon={Plus} iconPosition="left">
        Add
      </Button>
    );
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('renders with icon on right', () => {
    render(
      <Button icon={Plus} iconPosition="right">
        Add
      </Button>
    );
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Click</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('passes through additional props', () => {
    render(
      <Button type="submit" form="my-form" disabled>
        Submit
      </Button>
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('form', 'my-form');
  });

  it('has correct accessibility attributes', () => {
    render(<Button>Accessible Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeEnabled();
  });

  it('is focusable', () => {
    render(<Button>Focusable</Button>);
    const button = screen.getByRole('button');
    button.focus();
    expect(document.activeElement).toBe(button);
  });

  it('handles keyboard events', () => {
    const handleKeyDown = vi.fn();
    render(<Button onKeyDown={handleKeyDown}>Press</Button>);
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(handleKeyDown).toHaveBeenCalled();
  });

  it('prevents click when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    await user.click(screen.getByText('Disabled'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('prevents click when loading', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button loading onClick={handleClick}>Loading</Button>);
    await user.click(screen.getByText('Loading'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Button ref={ref}>Ref Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

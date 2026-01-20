import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
import { Plus } from 'lucide-react';

describe('Button', () => {
  it('renders correctly with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with loading state', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders with disabled state', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
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

  it('renders primary variant', () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary-500');
  });

  it('renders secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-200');
  });

  it('renders danger variant', () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-danger-500');
  });

  it('renders small size', () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-4');
  });

  it('renders large size', () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-8');
  });

  it('does not trigger onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );

    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not trigger onClick when loading', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button loading onClick={handleClick}>
        Loading
      </Button>
    );

    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});

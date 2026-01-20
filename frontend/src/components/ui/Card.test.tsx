import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { Card } from './Card';

describe('Card', () => {
  it('renders correctly', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders default variant', () => {
    render(<Card variant="default">Default card</Card>);
    const card = screen.getByText('Default card');
    expect(card).toHaveClass('border', 'border-gray-100');
  });

  it('renders premium variant', () => {
    render(<Card variant="premium">Premium card</Card>);
    const card = screen.getByText('Premium card');
    expect(card).toHaveClass('hover:shadow-lg', 'hover:-translate-y-1');
  });

  it('renders flat variant', () => {
    render(<Card variant="flat">Flat card</Card>);
    const card = screen.getByText('Flat card');
    expect(card).toHaveClass('border-gray-50');
  });

  it('renders with no padding', () => {
    render(<Card padding="none">No padding</Card>);
    const card = screen.getByText('No padding');
    expect(card).toHaveClass('p-0');
  });

  it('renders with small padding', () => {
    render(<Card padding="sm">Small padding</Card>);
    const card = screen.getByText('Small padding');
    expect(card).toHaveClass('p-4');
  });

  it('renders with large padding', () => {
    render(<Card padding="lg">Large padding</Card>);
    const card = screen.getByText('Large padding');
    expect(card).toHaveClass('p-8');
  });

  it('accepts custom className', () => {
    render(<Card className="custom-class">Custom</Card>);
    const card = screen.getByText('Custom');
    expect(card).toHaveClass('custom-class');
  });

  it('renders children correctly', () => {
    render(
      <Card>
        <h2>Title</h2>
        <p>Description</p>
      </Card>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });
});

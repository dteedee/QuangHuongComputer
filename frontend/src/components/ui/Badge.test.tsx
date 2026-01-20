import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders correctly', () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText('Label')).toBeInTheDocument();
  });

  it('renders default variant', () => {
    render(<Badge variant="default">Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-500');
  });

  it('renders primary variant', () => {
    render(<Badge variant="primary">Primary</Badge>);
    const badge = screen.getByText('Primary');
    expect(badge).toHaveClass('bg-primary-50', 'text-primary-600');
  });

  it('renders success variant', () => {
    render(<Badge variant="success">Success</Badge>);
    const badge = screen.getByText('Success');
    expect(badge).toHaveClass('bg-success-50', 'text-success-600');
  });

  it('renders warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = screen.getByText('Warning');
    expect(badge).toHaveClass('bg-warning-50', 'text-warning-600');
  });

  it('renders danger variant', () => {
    render(<Badge variant="danger">Danger</Badge>);
    const badge = screen.getByText('Danger');
    expect(badge).toHaveClass('bg-danger-50', 'text-danger-600');
  });

  it('renders small size', () => {
    render(<Badge size="sm">Small</Badge>);
    const badge = screen.getByText('Small');
    expect(badge).toHaveClass('px-2');
  });

  it('renders large size', () => {
    render(<Badge size="lg">Large</Badge>);
    const badge = screen.getByText('Large');
    expect(badge).toHaveClass('px-3');
  });

  it('accepts custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>);
    const badge = screen.getByText('Custom');
    expect(badge).toHaveClass('custom-class');
  });
});

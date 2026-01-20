import { describe, it, expect } from 'vitest';
import { render } from '../test/utils';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders without crashing', () => {
    const { container } = render(<HomePage />);
    // Just verify the component renders without throwing an error
    expect(container).toBeTruthy();
  });
});

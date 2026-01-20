# Testing Guide - Quang Hưởng Computer Frontend

## Overview

Dự án sử dụng **Vitest** và **React Testing Library** cho unit testing và integration testing.

## Tech Stack

- **Vitest** v4 - Fast unit test framework
- **React Testing Library** v16 - Testing React components
- **@testing-library/jest-dom** - Custom matchers
- **@testing-library/user-event** - User interaction simulation
- **jsdom** - Browser environment simulation

## Running Tests

```bash
# Run all tests (once)
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- LoginPage

# Run tests matching pattern
npm run test -- --grep="Button"
```

## Test File Organization

```
src/
├── components/
│   └── ui/
│       ├── Button.tsx
│       ├── Button.test.tsx       # Component tests
│       ├── Input.tsx
│       └── Input.test.tsx
├── pages/
│   ├── LoginPage.tsx
│   └── LoginPage.test.tsx        # Page tests
└── test/
    ├── setup.ts                   # Test environment setup
    └── utils.tsx                  # Test utilities
```

## Test Utilities

### Custom Render with Providers

```tsx
import { render, screen } from '../test/utils';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

Tự động wrap components với:
- `QueryClientProvider` (React Query)
- `BrowserRouter` (React Router)

### User Event

```tsx
import userEvent from '@testing-library/user-event';

test('handles click', async () => {
  const user = userEvent.setup();
  render(<Button>Click me</Button>);

  await user.click(screen.getByRole('button'));
});
```

## Testing Patterns

### Component Tests

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/utils';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Form Tests

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText('Email là bắt buộc')).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    // Assertions...
  });
});
```

### Mocking

#### Mock Functions

```tsx
import { vi } from 'vitest';

const handleClick = vi.fn();

test('calls handler', async () => {
  render(<Button onClick={handleClick}>Click</Button>);
  await user.click(screen.getByRole('button'));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

#### Mock Modules

```tsx
import { vi } from 'vitest';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    login: vi.fn(),
    user: null,
  })),
}));
```

#### Mock React Router

```tsx
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  };
});
```

## Testing Checklist

### UI Components

- [ ] Renders without errors
- [ ] Renders all variants (primary, secondary, etc.)
- [ ] Renders all sizes (sm, md, lg)
- [ ] Handles user interactions (click, type, etc.)
- [ ] Shows loading state
- [ ] Shows disabled state
- [ ] Shows error state
- [ ] Accepts custom className
- [ ] Renders children correctly

### Forms

- [ ] Renders form fields
- [ ] Shows validation errors on submit
- [ ] Shows field-specific validation errors
- [ ] Disables submit button while loading
- [ ] Shows server error messages
- [ ] Clears errors on re-submit
- [ ] Handles successful submission
- [ ] Handles failed submission

### Pages

- [ ] Renders without crashing
- [ ] Renders main heading/title
- [ ] Renders primary buttons with correct labels
- [ ] Links navigate to correct routes
- [ ] Loading state displays correctly
- [ ] Error state displays correctly

## Best Practices

### DO ✅

```tsx
// Use accessible queries
screen.getByRole('button', { name: /login/i })
screen.getByLabelText('Email')

// Use userEvent for interactions
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'text');

// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});

// Clean up mocks
beforeEach(() => {
  vi.clearAllMocks();
});
```

### DON'T ❌

```tsx
// Don't query by className or testId
screen.getByClassName('btn') ❌
screen.getByTestId('submit-button') ❌

// Don't query by text without case-insensitive matching
screen.getByText('Login') ❌ (brittle)
screen.getByRole('button', { name: /login/i }) ✅

// Don't forget to await async operations
user.click(button) ❌
await user.click(button) ✅

// Don't use act() directly (waitFor is better)
act(() => { ... }) ❌
await waitFor(() => { ... }) ✅
```

## Common Patterns

### Testing Modals

```tsx
it('opens and closes modal', async () => {
  const user = userEvent.setup();
  render(<ModalExample />);

  // Modal not visible initially
  expect(screen.queryByText('Modal Title')).not.toBeInTheDocument();

  // Open modal
  await user.click(screen.getByRole('button', { name: /open/i }));
  expect(screen.getByText('Modal Title')).toBeInTheDocument();

  // Close modal
  await user.click(screen.getByLabelText('Close modal'));
  expect(screen.queryByText('Modal Title')).not.toBeInTheDocument();
});
```

### Testing Form Validation

```tsx
it('validates email format', async () => {
  const user = userEvent.setup();
  render(<EmailForm />);

  const emailInput = screen.getByLabelText('Email');
  await user.type(emailInput, 'invalid-email');

  await user.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(screen.getByText('Email không hợp lệ')).toBeInTheDocument();
  });
});
```

### Testing API Calls

```tsx
import { vi } from 'vitest';

const mockLogin = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

it('calls login API', async () => {
  mockLogin.mockResolvedValue({ user: { id: 1 } });

  const user = userEvent.setup();
  render(<LoginPage />);

  await user.type(screen.getByLabelText('Email'), 'test@example.com');
  await user.type(screen.getByLabelText('Password'), 'password');
  await user.click(screen.getByRole('button', { name: /login/i }));

  await waitFor(() => {
    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password');
  });
});
```

## Coverage Goals

- **Overall**: >80%
- **UI Components**: >90% (critical)
- **Pages**: >70% (main flows)
- **Utils**: >80%

```bash
# View coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html
```

## Debugging Tests

### View Component Output

```tsx
import { screen } from '../test/utils';

render(<MyComponent />);
screen.debug(); // Print entire DOM
screen.debug(screen.getByRole('button')); // Print specific element
```

### Run Single Test

```bash
# Run only one test
it.only('specific test', () => { ... });

# Skip a test
it.skip('skip this test', () => { ... });
```

### Vitest UI

```bash
npm run test:ui
```

Opens interactive UI at http://localhost:51204/__vitest__/

## Troubleshooting

### "Unable to find element"

```tsx
// Use queryBy for elements that might not exist
expect(screen.queryByText('Not found')).not.toBeInTheDocument();

// Use waitFor for async elements
await waitFor(() => {
  expect(screen.getByText('Async content')).toBeInTheDocument();
});

// Check what's actually rendered
screen.debug();
```

### "not wrapped in act(...)"

```tsx
// Always await user interactions
await user.click(button);
await user.type(input, 'text');

// Use waitFor for state updates
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument();
});
```

### Tests timing out

```tsx
// Increase timeout
await waitFor(() => {
  expect(something).toBe(true);
}, { timeout: 3000 });

// Check for infinite loops or missing mocks
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm run test

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [User Event API](https://testing-library.com/docs/user-event/intro)

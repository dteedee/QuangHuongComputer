# Design System - Quang Hưởng Computer

## Overview

Hệ thống thiết kế chuẩn cho Quang Hưởng Computer với màu sắc, typography, spacing và components được định nghĩa rõ ràng.

## Color Palette

### Primary (Blue)
Sử dụng cho các interactive elements chính (buttons, links, focus states).

```
primary-50:  #EFF6FF
primary-500: #2563EB (Primary)
primary-600: #1D4ED8 (Hover)
```

### Success (Green)
Sử dụng cho trạng thái thành công, positive actions.

```
success-50:  #ECFDF5
success-500: #10B981 (Success)
success-600: #059669 (Hover)
```

### Warning (Amber)
Sử dụng cho cảnh báo, alerts.

```
warning-50:  #FFFBEB
warning-500: #F59E0B (Warning)
warning-600: #D97706 (Hover)
```

### Danger (Red)
Sử dụng cho errors, destructive actions.

```
danger-50:  #FEF2F2
danger-500: #EF4444 (Danger)
danger-600: #DC2626 (Hover)
```

### Brand (Red - Accent only)
Màu brand Quang Hưởng - chỉ sử dụng làm accent.

```
brand-red:       #D70018
brand-red-dark:  #B50014
brand-red-light: #FFEDED
```

## Typography

### Font Family
```css
font-family: Inter, system-ui, sans-serif
```

### Font Sizes
```
text-xs:   10px (labels, badges)
text-sm:   12px (helper text)
text-base: 14px (body text)
text-lg:   16px (subheadings)
text-xl:   18px (headings)
text-2xl:  24px (large headings)
text-3xl:  30px (hero text)
text-4xl:  36px (display)
```

### Font Weights
```
font-normal: 400
font-medium: 500
font-bold:   700
font-black:  900 (uppercase titles)
```

## Spacing Scale

```
xs:  4px   (0.25rem)
sm:  8px   (0.5rem)
md:  12px  (0.75rem)
lg:  16px  (1rem)
xl:  24px  (1.5rem)
2xl: 32px  (2rem)
3xl: 48px  (3rem)
4xl: 64px  (4rem)
```

## Components

### Button

```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md">
  Click me
</Button>
```

**Variants:**
- `primary` - Main CTA (blue)
- `secondary` - Less emphasis (gray)
- `outline` - Ghost with border
- `danger` - Destructive actions (red)
- `ghost` - Minimal styling
- `brand` - Brand red (accent)

**Sizes:**
- `sm` - Small (px-4 py-2)
- `md` - Medium (px-6 py-3)
- `lg` - Large (px-8 py-4)

**Props:**
- `loading` - Show loading spinner
- `icon` - Lucide icon component
- `iconPosition` - 'left' | 'right'

### Input

```tsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  type="email"
  icon={Mail}
  error={errors.email?.message}
  {...register('email')}
/>
```

**Props:**
- `label` - Field label
- `error` - Error message
- `icon` - Lucide icon
- `iconPosition` - 'left' | 'right'

### Select

```tsx
import { Select } from '@/components/ui';

<Select
  label="Category"
  options={[
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
  ]}
  error={errors.category?.message}
  {...register('category')}
/>
```

### Textarea

```tsx
import { Textarea } from '@/components/ui';

<Textarea
  label="Description"
  rows={4}
  error={errors.description?.message}
  {...register('description')}
/>
```

### Badge

```tsx
import { Badge } from '@/components/ui';

<Badge variant="success" size="md">
  Active
</Badge>
```

**Variants:**
- `default` - Gray
- `primary` - Blue
- `success` - Green
- `warning` - Amber
- `danger` - Red
- `brand` - Brand red

**Sizes:**
- `sm` - Small
- `md` - Medium
- `lg` - Large

### Modal

```tsx
import { Modal, Button } from '@/components/ui';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  description="Optional description"
  footer={
    <>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant="primary" onClick={onSubmit}>Submit</Button>
    </>
  }
>
  <p>Modal content</p>
</Modal>
```

### Card

```tsx
import { Card } from '@/components/ui';

<Card variant="premium" padding="lg">
  <h2>Card Title</h2>
  <p>Card content</p>
</Card>
```

**Variants:**
- `default` - Basic card
- `premium` - With hover effect
- `flat` - Minimal border

**Padding:**
- `none` - p-0
- `sm` - p-4
- `md` - p-6
- `lg` - p-8

## Form Validation

### Zod Schemas

```tsx
import { loginSchema, type LoginFormData } from '@/lib/validation/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
});
```

**Available Schemas:**
- `loginSchema` - Email + Password
- `registerSchema` - Full name, Email, Password, Confirm Password
- `contactSchema` - Name, Phone, Email, Message
- `checkoutSchema` - Shipping Address, Note
- `productSchema` - Product fields (Admin)
- `userSchema` - User fields (Admin)

### Vietnamese Error Messages

All validation messages are in Vietnamese (`lib/validation/messages.ts`):

```typescript
required('Email')      // "Email là bắt buộc"
email                  // "Email không hợp lệ"
minLength('Mật khẩu', 6) // "Mật khẩu phải có ít nhất 6 ký tự"
```

## Responsive Design

### Breakpoints

```
sm:  640px   (Mobile)
md:  768px   (Tablet)
lg:  1024px  (Desktop)
xl:  1280px  (Large Desktop)
2xl: 1536px  (Extra Large)
```

### Mobile-First Approach

```tsx
// Mobile (default)
<div className="w-full">

// Tablet and up
<div className="w-full md:w-1/2">

// Desktop and up
<div className="w-full md:w-1/2 lg:w-1/3">
```

## Accessibility

### ARIA Labels

```tsx
<button aria-label="Close modal">
  <X size={20} />
</button>
```

### Error States

```tsx
<input
  aria-invalid={hasError}
  aria-describedby={hasError ? 'error-id' : undefined}
/>
<p id="error-id" role="alert">Error message</p>
```

### Keyboard Navigation

All interactive elements support:
- Tab navigation
- Enter/Space for activation
- Escape for closing modals

## Usage Guidelines

### DO ✅

- Use semantic colors (primary for CTA, success for positive, danger for errors)
- Keep brand red (#D70018) for accent/highlights only
- Use design tokens from `design-system/tokens.ts`
- Use UI components from `components/ui/`
- Follow responsive breakpoints
- Add ARIA labels for icon buttons
- Use Zod validation for all forms

### DON'T ❌

- Hardcode colors in components
- Use brand red for primary buttons (use blue primary instead)
- Create inline form inputs (use UI components)
- Skip validation on forms
- Forget error states
- Ignore accessibility attributes
- Use inconsistent spacing

## Examples

### Complete Form Example

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Button } from '@/components/ui';
import { loginSchema, type LoginFormData } from '@/lib/validation/schemas';
import { Mail, Lock } from 'lucide-react';

export const LoginForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    // Handle submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Input
        label="Email"
        type="email"
        icon={Mail}
        placeholder="email@example.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Password"
        type="password"
        icon={Lock}
        placeholder="••••••••"
        error={errors.password?.message}
        {...register('password')}
      />

      <Button type="submit" variant="primary" size="lg" className="w-full">
        Login
      </Button>
    </form>
  );
};
```

## Migration Guide

### Từ inline inputs sang UI components:

**Before:**
```tsx
<input
  className="w-full px-5 py-4 bg-gray-50 border rounded-xl"
  placeholder="Email"
/>
{errors.email && <span className="text-red-500">Error</span>}
```

**After:**
```tsx
<Input
  label="Email"
  error={errors.email?.message}
  {...register('email')}
/>
```

### Từ manual validation sang Zod:

**Before:**
```tsx
const [errors, setErrors] = useState({});

const validate = (data) => {
  if (!data.email) setErrors({ email: 'Required' });
};
```

**After:**
```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/validation/schemas';

const { register, formState: { errors } } = useForm({
  resolver: zodResolver(loginSchema),
});
```

## Testing

Tất cả UI components đã có unit tests với Vitest + React Testing Library.

```bash
npm run test              # Run all tests
npm run test:ui           # Open Vitest UI
npm run test:coverage     # Check coverage
```

## Support

Nếu có câu hỏi hoặc issues, vui lòng liên hệ team Frontend.

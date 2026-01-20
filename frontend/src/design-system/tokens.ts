/**
 * Design System Tokens
 * Centralized design tokens for Quang Hưởng Computer
 */

export const colors = {
  // Primary (Blue) - Main CTAs and interactive elements
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#2563EB', // Primary
    600: '#1D4ED8', // Hover
    700: '#1E40AF',
    800: '#1E3A8A',
    900: '#1E3A8A',
  },

  // Success (Green) - Positive actions and confirmations
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981', // Success
    600: '#059669', // Hover
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },

  // Warning (Amber) - Caution and alerts
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B', // Warning
    600: '#D97706', // Hover
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Danger (Red) - Errors and destructive actions
  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444', // Danger
    600: '#DC2626', // Hover
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Brand (Red) - Quang Hưởng brand color (accent only)
  brand: {
    red: '#D70018',
    'red-dark': '#B50014',
    'red-light': '#FFEDED',
  },

  // Neutral (Gray) - Text, backgrounds, borders
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
} as const;

export const spacing = {
  0: '0',
  xs: '4px',   // 0.25rem
  sm: '8px',   // 0.5rem
  md: '12px',  // 0.75rem
  lg: '16px',  // 1rem
  xl: '24px',  // 1.5rem
  '2xl': '32px',  // 2rem
  '3xl': '48px',  // 3rem
  '4xl': '64px',  // 4rem
} as const;

export const fontSize = {
  xs: ['10px', '14px'],     // Small labels, badges
  sm: ['12px', '16px'],     // Body small, helper text
  base: ['14px', '20px'],   // Body text
  lg: ['16px', '24px'],     // Subheadings
  xl: ['18px', '28px'],     // Headings
  '2xl': ['24px', '32px'],  // Large headings
  '3xl': ['30px', '36px'],  // Hero text
  '4xl': ['36px', '40px'],  // Display
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  bold: '700',
  black: '900',
} as const;

export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  red: '0 20px 40px -12px rgba(215, 0, 24, 0.20)',
} as const;

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  smooth: '400ms cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

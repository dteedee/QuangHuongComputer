/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Accent color (dynamic via CSS variables from ThemeContext)
        'accent': 'var(--accent-primary)',
        'accent-hover': 'var(--accent-primary-hover)',
        'accent-light': 'var(--accent-primary-light)',
        'accent-dark': 'var(--accent-primary-dark)',

        // Brand colors — Quang Hưởng Red (source of truth: design-system/brand-tokens.ts)
        'brand': '#D22B2B',
        'brand-dark': '#B02020',
        'brand-light': '#FEF2F2',
        'brand-gray': '#f3f4f6',

        // Primary (Quang Hưởng Red scale)
        primary: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FBBFBF',
          300: '#F49898',
          400: '#E86363',
          500: '#DE3838',
          600: '#D22B2B',
          700: '#B02020',
          800: '#8C1919',
          900: '#701212',
          DEFAULT: '#D22B2B',
        },

        // Neutral ink for typography
        ink: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#1A1A1A',
          DEFAULT: '#1A1A1A',
        },

        // Surface layers
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#FAFAFA',
          subtle: '#F5F5F5',
        },

        // Success (Green)
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#16A34A',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
          DEFAULT: '#16A34A',
        },

        // Warning (Amber)
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
          DEFAULT: '#F59E0B',
        },

        // Danger (Burnt Orange) — INTENTIONALLY separated from brand red
        // so "Delete/Error" reads visually distinct from "Buy/Primary CTA".
        danger: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
          DEFAULT: '#EA580C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'brand': '0 4px 16px rgba(210, 43, 43, 0.15)',
        'brand-lg': '0 8px 32px rgba(210, 43, 43, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

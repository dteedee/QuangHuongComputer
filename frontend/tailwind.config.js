/** @type {import('tailwindcss').Config} */

/* Semantic token helper — every colour below that reads a CSS variable goes
 * through this so `<alpha-value>` keeps working (`bg-surface/60`).
 * Variables are declared in src/styles/tokens.css (design-direction.md §8). */
const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;

export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  /* Classes that only exist in the database (CMS/menu editors) are never seen
   * by the content scanner and used to be purged — e.g. every
   * config."BackofficeMenuGroups"."ColorClass" row holds `text-<colour>-500`,
   * and HomepageSections.CssClass may hold gradient classes. Keep them alive. */
  safelist: [
    { pattern: /^(bg|text|border)-(slate|gray|zinc|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(400|500|600)$/ },
    { pattern: /^bg-gradient-to-(r|l|t|b|tr|tl|br|bl)$/ },
    { pattern: /^(from|via|to)-(slate|gray|red|orange|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|500|600|700)$/ },
  ],
  theme: {
    extend: {
      colors: {
        /* ---------- semantic tokens (design-direction.md §2) -------------- */
        bg: v('bg'),
        sunken: v('sunken'),
        stage: v('stage'),
        line: { DEFAULT: v('line'), strong: v('line-strong') },
        'control-line': v('control-line'),
        'on-ink': v('on-ink'),
        'on-ink-muted': v('on-ink-muted'),
        savings: v('brand-text'),
        rating: v('rating'),
        fg: { DEFAULT: v('fg'), muted: v('fg-muted'), subtle: v('fg-subtle') },
        violet: { DEFAULT: v('violet'), subtle: v('violet-subtle') },

        /* Accent colour (runtime-overridable by ThemeContext) — legacy alias,
         * kept because ~230 call sites use it. New code: use `brand`. */
        'accent': 'var(--accent-primary)',
        'accent-hover': 'var(--accent-primary-hover)',
        'accent-light': 'var(--accent-primary-light)',
        'accent-dark': 'var(--accent-primary-dark)',

        /* Brand red — token-driven. The numeric scale stays for legacy pages. */
        brand: {
          DEFAULT: v('brand'),
          hover: v('brand-hover'),
          subtle: v('brand-subtle'),
          line: v('brand-line'),
          text: v('brand-text'),
        },
        'brand-dark': '#B02020',
        'brand-light': '#FEF2F2',
        'brand-gray': '#f3f4f6',

        // Primary (Quang Hưởng Red scale) — legacy numeric scale.
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
          DEFAULT: v('brand'),
        },

        // Ink = dark panels (flash sale, footer). Numeric scale is legacy.
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
          DEFAULT: v('ink'),
          soft: v('ink-soft'),
          line: v('ink-line'),
        },

        // Surface layers — DEFAULT is the semantic token, alt/subtle legacy.
        surface: {
          DEFAULT: v('surface'),
          alt: '#FAFAFA',
          subtle: '#F5F5F5',
        },

        success: {
          50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7',
          400: '#34D399', 500: '#10B981', 600: '#16A34A', 700: '#047857',
          800: '#065F46', 900: '#064E3B',
          DEFAULT: v('success'), subtle: v('success-subtle'),
        },

        warning: {
          50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D',
          400: '#FBBF24', 500: '#F59E0B', 600: '#D97706', 700: '#B45309',
          800: '#92400E', 900: '#78350F',
          DEFAULT: v('warning'), subtle: v('warning-subtle'),
        },

        // Danger (burnt orange) — INTENTIONALLY separated from brand red so
        // "Delete/Error" reads visually distinct from "Buy/Primary CTA".
        danger: {
          50: '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA', 300: '#FDBA74',
          400: '#FB923C', 500: '#F97316', 600: '#EA580C', 700: '#C2410C',
          800: '#9A3412', 900: '#7C2D12',
          DEFAULT: v('danger'), subtle: v('danger-subtle'),
        },

        info: { DEFAULT: v('info'), subtle: v('info-subtle') },

        // Stock indicator green ("✓ Sẵn hàng") — card anatomy, additive.
        stock: '#2CC067',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Be Vietnam Pro"', 'Inter', 'system-ui', 'sans-serif'],
      },
      /* Type scale (design-direction.md §3). Nothing below 11px. */
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],       // 11/16 badge, meta
        13: ['0.8125rem', { lineHeight: '1.25rem' }],       // 13/20 admin body
        '4xl': ['2.25rem', { lineHeight: '2.75rem' }],      // 36/44 page H1
        '5xl': ['2.875rem', { lineHeight: '3.5rem' }],      // 46/56 hero H1
      },
      borderRadius: {
        sm: '6px',    // spec chip
        md: '8px',    // input, small button, skeleton
        lg: '10px',   // button
        xl: '12px',   // admin card, product image, large button
        '2xl': '16px', // product card, panel
        '3xl': '24px', // hero, large block
        '4xl': '2rem',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        'brand': '0 4px 16px rgba(210, 43, 43, 0.15)',
        'brand-lg': '0 8px 32px rgba(210, 43, 43, 0.2)',
        // legacy layered shadows (kept until wave 3 finishes migrating pages)
        'small': '0 0 5px #00000005, 0 2px 10px #0000000f, 0 0 1px #0000004d',
        'medium': '0 0 15px #00000008, 0 2px 30px #00000014, 0 0 1px #0000004d',
        'large': '0 0 30px #0000000a, 0 30px 60px #0000001f, 0 0 1px #0000004d',
      },
      /* Motion (design-direction.md §7) — four easings, eight durations. */
      transitionTimingFunction: {
        expo: 'cubic-bezier(.16,1,.3,1)',
        out: 'cubic-bezier(.22,1,.36,1)',
        back: 'cubic-bezier(.34,1.56,.64,1)',
        io: 'cubic-bezier(.65,0,.35,1)',
      },
      transitionDuration: {
        140: '140ms', 220: '220ms', 360: '360ms', 420: '420ms',
        480: '480ms', 560: '560ms', 760: '760ms', 1100: '1100ms',
      },
      maxWidth: { shell: '1320px', admin: '1480px' },
      /* Stacking order (design-direction.md §9.4) — no more z-[9999]. */
      zIndex: {
        sticky: '10', topbar: '30', floating: '40',
        scrim: '50', drawer: '60', toast: '70', palette: '80',
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

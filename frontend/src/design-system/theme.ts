// ================================================
// 🎨 DESIGN SYSTEM - QUANG HƯỞNG COMPUTER
// Foundation cho toàn bộ hệ thống UI
// ================================================

export const designSystem = {
  // ============================================
  // COLOR PALETTE - Inspired by modern e-commerce
  // ============================================
  colors: {
    // Primary - Quang Hưởng Brand Red
    primary: {
      50: '#FFF1F2',
      100: '#FFE1E3',
      200: '#FFC7CB',
      300: '#FFA0A7',
      400: '#FF6B76',
      500: '#D70018',  // Main brand color
      600: '#B50014',
      700: '#940010',
      800: '#7A000D',
      900: '#60000A',
    },

    // Secondary - Tech Blue
    secondary: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },

    // Success - Green
    success: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86EFAC',
      400: '#4ADE80',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
      800: '#166534',
      900: '#14532D',
    },

    // Warning - Orange
    warning: {
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
    },

    // Error - Red
    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
    },

    // Neutral - Gray scale
    neutral: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0A0A0A',
    },

    // Semantic colors
    background: {
      light: '#FFFFFF',
      dark: '#0F172A',
      gray: '#F9FAFB',
    },

    text: {
      primary: '#1A1A1A',
      secondary: '#525252',
      tertiary: '#737373',
      inverse: '#FFFFFF',
      disabled: '#A3A3A3',
    },

    border: {
      light: '#E5E5E5',
      medium: '#D4D4D4',
      dark: '#A3A3A3',
    },
  },

  // ============================================
  // TYPOGRAPHY - Modern font system
  // ============================================
  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      display: "'Lexend', 'Inter', sans-serif",
    },

    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',      // 48px
      '6xl': '3.75rem',   // 60px
      '7xl': '4.5rem',    // 72px
    },

    fontWeight: {
      thin: 100,
      extralight: 200,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },

    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },

    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },

  // ============================================
  // SPACING - 8px base system
  // ============================================
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
    32: '8rem',     // 128px
  },

  // ============================================
  // BREAKPOINTS - Mobile-first responsive
  // ============================================
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // ============================================
  // SHADOWS - Elevation system
  // ============================================
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    none: 'none',

    // Colored shadows
    primary: '0 10px 30px -5px rgba(215, 0, 24, 0.3)',
    success: '0 10px 30px -5px rgba(34, 197, 94, 0.3)',
    warning: '0 10px 30px -5px rgba(249, 115, 22, 0.3)',
    error: '0 10px 30px -5px rgba(239, 68, 68, 0.3)',
  },

  // ============================================
  // BORDER RADIUS - Rounded corners
  // ============================================
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },

  // ============================================
  // Z-INDEX - Stacking order
  // ============================================
  zIndex: {
    0: 0,
    10: 10,
    20: 20,
    30: 30,
    40: 40,
    50: 50,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    overlay: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    toast: 1080,
  },

  // ============================================
  // TRANSITIONS - Animation timing
  // ============================================
  transitions: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
      slower: '500ms',
    },

    timing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
  },

  // ============================================
  // ANIMATIONS - Keyframes presets
  // ============================================
  animations: {
    fadeIn: 'fadeIn 0.3s ease-in-out',
    fadeOut: 'fadeOut 0.3s ease-in-out',
    slideUp: 'slideUp 0.3s ease-out',
    slideDown: 'slideDown 0.3s ease-out',
    slideLeft: 'slideLeft 0.3s ease-out',
    slideRight: 'slideRight 0.3s ease-out',
    scaleIn: 'scaleIn 0.2s ease-out',
    scaleOut: 'scaleOut 0.2s ease-in',
    spin: 'spin 1s linear infinite',
    pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    bounce: 'bounce 1s infinite',
    shimmer: 'shimmer 2s infinite',
  },
} as const;

// ============================================
// THEME VARIANTS
// ============================================
export const lightTheme = {
  ...designSystem,
  mode: 'light',
  colors: {
    ...designSystem.colors,
    background: designSystem.colors.background.light,
    surface: '#FFFFFF',
    text: designSystem.colors.text.primary,
  },
};

export const darkTheme = {
  ...designSystem,
  mode: 'dark',
  colors: {
    ...designSystem.colors,
    background: designSystem.colors.background.dark,
    surface: '#1E293B',
    text: designSystem.colors.text.inverse,
  },
};

// ============================================
// COMPONENT PRESETS
// ============================================
export const componentPresets = {
  button: {
    sizes: {
      xs: { padding: '0.25rem 0.75rem', fontSize: designSystem.typography.fontSize.xs },
      sm: { padding: '0.5rem 1rem', fontSize: designSystem.typography.fontSize.sm },
      md: { padding: '0.75rem 1.5rem', fontSize: designSystem.typography.fontSize.base },
      lg: { padding: '1rem 2rem', fontSize: designSystem.typography.fontSize.lg },
      xl: { padding: '1.25rem 2.5rem', fontSize: designSystem.typography.fontSize.xl },
    },
  },

  input: {
    sizes: {
      sm: { height: '2rem', padding: '0.5rem', fontSize: designSystem.typography.fontSize.sm },
      md: { height: '2.5rem', padding: '0.75rem', fontSize: designSystem.typography.fontSize.base },
      lg: { height: '3rem', padding: '1rem', fontSize: designSystem.typography.fontSize.lg },
    },
  },

  card: {
    variants: {
      elevated: { boxShadow: designSystem.shadows.lg, border: 'none' },
      outlined: { boxShadow: 'none', border: `1px solid ${designSystem.colors.border.light}` },
      filled: { boxShadow: 'none', backgroundColor: designSystem.colors.neutral[50] },
    },
  },
};

export type DesignSystem = typeof designSystem;
export type Theme = typeof lightTheme;

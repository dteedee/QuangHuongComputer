/**
 * ================================================================
 *  QUANG HƯỞNG COMPUTER — BRAND TOKENS
 *  Single source of truth for brand colors.
 *  Import from here; do NOT hardcode brand hex elsewhere.
 * ================================================================
 */

/** Brand red scale (600 = main). Generated to be consistent with Tailwind stops. */
export const brand = {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FBBFBF',
    300: '#F49898',
    400: '#E86363',
    500: '#DE3838',
    600: '#D22B2B', // main brand
    700: '#B02020', // hover / active
    800: '#8C1919', // emphasis / dark surfaces
    900: '#701212', // text on light
} as const;

/** Neutral ink for typography. */
export const ink = {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252', // secondary text
    700: '#404040',
    800: '#262626',
    900: '#1A1A1A', // primary text
} as const;

/** Surface layers (light theme). */
export const surface = {
    DEFAULT: '#FFFFFF',
    alt: '#FAFAFA',
    subtle: '#F5F5F5',
} as const;

/** Semantic status colors. Danger is INTENTIONALLY separated from brand red. */
export const status = {
    danger: '#EA580C',   // burnt orange — distinct from brand red
    dangerHover: '#C2410C',
    success: '#16A34A',
    warning: '#F59E0B',
    info: '#0891B2',
} as const;

/** Convenience: current default accent CSS variables (light mode). */
export const accentDefaults = {
    primary: brand[600],
    primaryHover: brand[700],
    primaryLight: brand[50],
    primaryDark: brand[800],
} as const;

/** Regex to validate hex color from admin input (chống CSS injection). */
export const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/** Type helpers */
export type BrandScale = typeof brand;
export type InkScale = typeof ink;

export const brandTokens = {
    brand,
    ink,
    surface,
    status,
    accentDefaults,
} as const;

export default brandTokens;

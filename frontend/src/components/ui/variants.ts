/**
 * ============================================================================
 * UI KIT — shared `cva` variant definitions (W1-12).
 * Contract: plans/260917-2100-full-system-overhaul/design/design-direction.md
 *           §4 (radius/elevation/focus) and §5 (component specs).
 *
 * Rules enforced here, once, for the whole app:
 *  - semantic tokens only (`bg-brand`, `text-fg-muted`, …) — no hex, no
 *    `red-600`, no `!important`, no `isDark ? …` ternaries;
 *  - `--control-line` on every control border (WCAG 1.4.11, ≥3:1);
 *  - density follows the shell: storefront 16px / 44px controls, admin 14px /
 *    40px controls. `[data-shell="admin"]` is set on the admin layout root by
 *    W1-8, so the same component is dense inside it without a prop;
 *  - the focus ring is the global `:focus-visible` rule from `styles/base.css`.
 *    Components must never add `focus:outline-none` without a replacement.
 * ==========================================================================*/
import { cva, type VariantProps } from 'class-variance-authority';

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

/** Shared by Button and IconButton: layout, focus, disabled, press. */
export const controlBase =
  'relative inline-flex items-center justify-center gap-2 font-semibold ' +
  'transition-colors duration-140 ease-out select-none ' +
  'disabled:opacity-50 disabled:pointer-events-none';

export const buttonVariants = cva(controlBase + ' whitespace-nowrap', {
  variants: {
    variant: {
      /* primary: brand fill + the 1px inner highlight from §5 */
      primary:
        'bg-brand text-white hover:bg-brand-hover ' +
        'shadow-[inset_0_1px_0_rgb(255_255_255/.18),0_1px_2px_rgb(var(--brand)/.4)]',
      ink: 'bg-fg text-bg hover:bg-fg/90',
      outline:
        'bg-surface text-fg border border-line-strong hover:border-control-line hover:bg-sunken',
      ghost: 'bg-transparent text-fg-muted hover:bg-fg/5 hover:text-fg',
      dashed:
        'bg-transparent text-fg-muted border border-dashed border-line-strong hover:border-control-line hover:text-fg',
      danger: 'bg-danger text-white hover:bg-danger/90',
      /** @deprecated legacy alias kept for wave-0 pages — use `outline`. */
      secondary:
        'bg-surface text-brand-text border border-brand-line hover:bg-brand-subtle',
      /** @deprecated legacy alias kept for wave-0 pages — use `primary`. */
      success: 'bg-success text-white hover:bg-success/90',
    },
    size: {
      /* storefront 36/44/52 · admin 32/40 (design-direction §5) */
      sm: 'h-9 px-3.5 text-sm rounded-md [[data-shell=admin]_&]:h-8',
      md: 'h-11 px-[1.125rem] text-base rounded-lg [[data-shell=admin]_&]:h-10 [[data-shell=admin]_&]:text-13',
      lg: 'h-[52px] px-6 text-lg rounded-xl',
    },
    block: { true: 'w-full', false: '' },
  },
  defaultVariants: { variant: 'primary', size: 'md', block: false },
});

export type ButtonVariants = VariantProps<typeof buttonVariants>;

/** Icon-only button — square, press scale .94 (§7). */
export const iconButtonVariants = cva(controlBase + ' shrink-0', {
  variants: {
    variant: {
      ghost: 'bg-transparent text-fg-muted hover:bg-fg/5 hover:text-fg',
      outline: 'bg-surface text-fg border border-line-strong hover:border-control-line',
      primary: 'bg-brand text-white hover:bg-brand-hover',
      danger: 'bg-transparent text-danger hover:bg-danger-subtle',
    },
    size: {
      sm: 'h-8 w-8 rounded-md',
      md: 'h-10 w-10 rounded-lg',
      lg: 'h-11 w-11 rounded-lg',
    },
  },
  defaultVariants: { variant: 'ghost', size: 'md' },
});

export type IconButtonVariants = VariantProps<typeof iconButtonVariants>;

/* -------------------------------------------------------------------------- */
/* Controls (input / textarea / select trigger)                                */
/* -------------------------------------------------------------------------- */

/**
 * Height 40, radius 8, border `--control-line`, 14px — identical in both
 * shells (§5). Focus adds the brand ring on top of the global outline.
 */
export const controlVariants = cva(
  'w-full bg-surface text-fg placeholder:text-fg-subtle rounded-md border ' +
    'text-sm transition-[border-color,box-shadow] duration-140 ease-out ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-sunken',
  {
    variants: {
      invalid: {
        false:
          'border-control-line hover:border-fg-subtle ' +
          'focus:border-brand focus:shadow-[0_0_0_3px_rgb(var(--brand)/.14)]',
        true:
          'border-danger shadow-[0_0_0_3px_rgb(var(--danger)/.14)] ' +
          'focus:border-danger',
      },
      inputSize: {
        sm: 'h-8 px-2.5',
        md: 'h-10 px-3',
        /** textarea / multi-line — height comes from `rows` */
        auto: 'px-3 py-2 min-h-[80px]',
      },
    },
    defaultVariants: { invalid: false, inputSize: 'md' },
  },
);

export type ControlVariants = VariantProps<typeof controlVariants>;

/** `.label` 13/500 + `mb-1.5`, `.hint` 12 subtle (§5). */
export const labelClass = 'block text-13 font-medium text-fg mb-1.5';
export const hintClass = 'mt-1.5 text-xs leading-4 text-fg-subtle';
export const errorClass =
  'mt-1.5 flex items-center gap-1 text-xs leading-4 font-medium text-danger';

/* -------------------------------------------------------------------------- */
/* Badge                                                                       */
/* -------------------------------------------------------------------------- */

/** height 22 storefront / 24 admin, radius 6, 11–12px/600 (§5). */
export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm px-1.5 font-semibold tracking-[.01em] ' +
    'whitespace-nowrap h-[22px] text-2xs [[data-shell=admin]_&]:h-6 [[data-shell=admin]_&]:text-xs',
  {
    variants: {
      variant: {
        neutral: 'bg-sunken text-fg-muted',
        brand: 'bg-brand-subtle text-brand-text',
        success: 'bg-success-subtle text-success',
        warning: 'bg-warning-subtle text-warning',
        danger: 'bg-danger-subtle text-danger',
        info: 'bg-info-subtle text-info',
        violet: 'bg-violet-subtle text-violet',
        /** `-x%` discount — brand fill, white text (§5) */
        discount: 'bg-brand text-white',
        /** "Mới" tag — ink fill (§5) */
        ink: 'bg-fg text-bg',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * §4: card default = `--line` border + `shadow-xs`. Shadow only grows on hover
 * or when the surface floats (popover/drawer/modal) — and it is never animated
 * (that is a `::after` opacity trick on the product card, not here).
 */
export const cardVariants = cva('bg-surface border border-line', {
  variants: {
    variant: {
      default: 'shadow-xs',
      flat: '',
      floating: 'shadow-lg',
      /** upload / "add new" zone (§4) */
      dashed: 'border-dashed border-line-strong shadow-none',
    },
    radius: { xl: 'rounded-xl', '2xl': 'rounded-2xl' },
    padded: {
      /* storefront p-5 lg:p-7 · admin p-4 lg:p-5 (§4) */
      true: 'p-5 lg:p-7 [[data-shell=admin]_&]:p-4 [[data-shell=admin]_&]:lg:p-5',
      false: '',
    },
  },
  defaultVariants: { variant: 'default', radius: 'xl', padded: false },
});

export type CardVariants = VariantProps<typeof cardVariants>;

/* -------------------------------------------------------------------------- */
/* Overlay scrim (Dialog + Drawer share it)                                    */
/* -------------------------------------------------------------------------- */

/** `black/40`, 220ms fade, `z-scrim` = 50 on the documented stacking order. */
export const overlayClass =
  'fixed inset-0 z-scrim bg-black/40 ' +
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 ' +
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 ' +
  'duration-220 ease-out';

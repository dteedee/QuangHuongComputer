/**
 * Contract test for the frozen design-system foundation (W1-7).
 * 40+ later tracks build on these names and values; this test is what stops
 * them drifting from design/design-direction.md §2, §7 and §8.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { dur, ease, springSoft, springSnappy, springBouncy, staggerIndex, staggerStep } from './motion';

const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
const tokens = read('../styles/tokens.css');
const base = read('../styles/base.css');
/** Strip comments — the bridge's header *talks about* the !important rules it removed. */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const darkBridge = stripComments(read('../dark-theme.css'));

const block = (selector: string) => {
  const start = tokens.indexOf(selector + ' {');
  expect(start, `${selector} block missing`).toBeGreaterThan(-1);
  return tokens.slice(start, tokens.indexOf('}', start));
};

const LIGHT = block(':root');
const DARK = block('.dark');

const SEMANTIC = [
  'bg', 'surface', 'sunken', 'stage', 'line', 'line-strong', 'control-line',
  'fg', 'fg-muted', 'fg-subtle',
  'brand', 'brand-hover', 'brand-subtle', 'brand-line', 'brand-text',
  'ink', 'ink-soft', 'ink-line', 'on-ink', 'on-ink-muted',
  'success', 'success-subtle', 'warning', 'warning-subtle',
  'danger', 'danger-subtle', 'info', 'info-subtle',
  'violet', 'violet-subtle', 'rating',
  'shadow-xs', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl',
];

describe('semantic colour tokens', () => {
  it.each(SEMANTIC)('--%s is defined in light mode', (name) => {
    expect(LIGHT).toContain(`--${name}:`);
  });

  it('dark mode redefines every colour token (on-ink pair is shared by design)', () => {
    const colours = SEMANTIC.filter((n) => !n.startsWith('on-ink'));
    colours.forEach((name) => expect(DARK, `--${name} missing in .dark`).toContain(`--${name}:`));
  });

  it('colours are rgb triples so Tailwind can apply <alpha-value>', () => {
    expect(LIGHT).toMatch(/--brand:\s*215 32 47/);
    expect(LIGHT).toMatch(/--fg:\s*24 24 27/);
    expect(DARK).toMatch(/--brand:\s*224 38 53/);
  });

  it('keeps --stage light in dark mode so white product photos do not invert', () => {
    expect(DARK).toMatch(/--stage:\s*236 236 239/);
  });

  it('gives inputs a >=3:1 border token of their own (WCAG 1.4.11)', () => {
    expect(LIGHT).toMatch(/--control-line:\s*138 138 148/);
    expect(DARK).toMatch(/--control-line:\s*107 107 116/);
  });
});

describe('base layer', () => {
  it('ships one focus-visible rule for the whole app', () => {
    expect(base).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid rgb\(var\(--brand\)\)/);
  });

  it('honours prefers-reduced-motion in CSS, not only in JS', () => {
    expect(base).toContain('@media (prefers-reduced-motion: reduce)');
    expect(base).toMatch(/\[data-reveal\]\s*\{\s*opacity:\s*1/);
  });

  it('makes every number tabular', () => {
    expect(base).toMatch(/\.num\s*\{\s*font-variant-numeric:\s*tabular-nums/);
  });
});

describe('legacy dark-mode bridge', () => {
  it('contains zero !important rules (was 114)', () => {
    expect(darkBridge.match(/!important/g)).toBeNull();
  });

  it('maps legacy utilities onto the semantic tokens, not hex', () => {
    expect(darkBridge).not.toMatch(/#[0-9a-fA-F]{6}\s*;/);
    expect(darkBridge).toContain('rgb(var(--surface))');
  });
});

describe('motion presets', () => {
  it('uses only the eight approved durations', () => {
    expect(Object.values(dur)).toEqual([0.14, 0.22, 0.36, 0.42, 0.48, 0.56, 0.76, 1.1]);
  });

  it('uses only the four approved easings', () => {
    expect(ease.expo).toEqual([0.16, 1, 0.3, 1]);
    expect(ease.out).toEqual([0.22, 1, 0.36, 1]);
    expect(ease.back).toEqual([0.34, 1.56, 0.64, 1]);
    expect(ease.io).toEqual([0.65, 0, 0.35, 1]);
    expect(Object.keys(ease)).toHaveLength(4);
  });

  it('uses the three approved springs', () => {
    expect(springSoft).toMatchObject({ stiffness: 260, damping: 30, mass: 0.9 });
    expect(springSnappy).toMatchObject({ stiffness: 420, damping: 34 });
    expect(springBouncy).toMatchObject({ stiffness: 520, damping: 22 });
  });

  it('staggers 40ms storefront / 50ms admin and stops after 6 elements', () => {
    expect(staggerStep).toEqual({ storefront: 0.04, admin: 0.05 });
    expect(staggerIndex(0)).toBe(0);
    expect(staggerIndex(5)).toBe(5);
    expect(staggerIndex(40)).toBe(6);
  });
});

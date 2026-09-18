/**
 * The kitchen sink has no route yet (W1-8 owns the route file), so it had never
 * been mounted at all. This renders it in jsdom in both shells and both themes.
 *
 * It does NOT replace a browser check — jsdom applies no CSS, so colours,
 * density and the motion values are still unproved here. What it does prove is
 * that every primitive on the page mounts without throwing, which is the part
 * that was resting on `tsc` alone.
 *
 * Added by the W1-12 adversarial verification pass. Removed with pages/dev/**
 * at the W3 gate.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { KitchenSinkPage } from './kitchen-sink-page';

beforeAll(() => {
  /* jsdom has neither; the kit uses IO for select paging and matchMedia for
   * reduced motion. Both are browser APIs, not component logic. */
  if (!('IntersectionObserver' in window)) {
    class IO {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: IO });
  }
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
});

describe('kitchen sink', () => {
  it('mounts every section and exposes one h1', () => {
    render(
      <MemoryRouter>
        <KitchenSinkPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /kitchen sink/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Mục lục' })).toBeInTheDocument();
  });

  it('toggles dark and admin density without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <KitchenSinkPage />
      </MemoryRouter>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain('dark');
    expect(root.getAttribute('data-shell')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Sang Dark/ }));
    fireEvent.click(screen.getByRole('button', { name: /Mật độ/ }));

    /* Same DOM node, re-rendered — React patches the class/attribute in place. */
    expect(root.className).toContain('dark');
    expect(root.getAttribute('data-shell')).toBe('admin');
  });
});

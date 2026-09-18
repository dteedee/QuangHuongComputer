/**
 * MANDATORY TEST CASE (design-direction.md §7 "Nội dung động"):
 * elements rendered AFTER the observer was created must still be observed.
 * In the HTML prototype this exact bug left the category rail, the product grid
 * and the mega-menu permanently at `opacity: 0` (6/10 category tiles invisible
 * at 390px). In React every node is "inserted later", so a regression here
 * blanks whole sections of the site.
 */
import { useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Reveal } from './reveal';

type Entry = { target: Element; isIntersecting: boolean };

/** The module keeps ONE observer per scroll root, so instances survive tests. */
const created: IntersectionObserverStub[] = [];

class IntersectionObserverStub {
  observed = new Set<Element>();

  constructor(
    private cb: (entries: Entry[], io: IntersectionObserverStub) => void,
    public options?: IntersectionObserverInit,
  ) {
    created.push(this);
  }

  observe(el: Element) { this.observed.add(el); }
  unobserve(el: Element) { this.observed.delete(el); }
  disconnect() { this.observed.clear(); }

  /** Simulate the element scrolling into view. */
  enter(el: Element) { this.cb([{ target: el, isIntersecting: true }], this); }
}

/** The shared observer for the default (viewport) root. */
const io = () => created[0];

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Reveal', () => {
  it('observes nodes that are rendered after the first paint', () => {
    const Grid = () => {
      const [items, setItems] = useState(['a']);
      return (
        <>
          <button onClick={() => setItems(['a', 'b'])}>load</button>
          {items.map((id) => (
            <Reveal key={id}><span data-testid={id}>{id}</span></Reveal>
          ))}
        </>
      );
    };

    render(<Grid />);
    const first = screen.getByTestId('a').parentElement!;
    expect(io().observed.has(first)).toBe(true);

    // second card arrives later — the classic "observer built too early" bug
    act(() => { screen.getByText('load').click(); });
    const second = screen.getByTestId('b').parentElement!;
    expect(io().observed.has(second)).toBe(true);

    act(() => { io().enter(second); });
    expect(second).toHaveClass('in');
    expect(io().observed.has(second)).toBe(false); // revealed once, then released
  });

  it('reveals every child of a horizontal rail at once (group)', () => {
    render(
      <Reveal group>
        <span data-testid="c1" data-reveal="" />
        <span data-testid="c2" data-reveal="" />
      </Reveal>,
    );
    const rail = screen.getByTestId('c1').parentElement!;
    expect(rail).toHaveAttribute('data-reveal-group');

    act(() => { io().enter(rail); });
    // children parked off-screen to the right would never intersect on their own
    expect(screen.getByTestId('c1')).toHaveClass('in');
    expect(screen.getByTestId('c2')).toHaveClass('in');
  });

  it('caps the stagger index at 6 elements', () => {
    render(<Reveal index={11}><span data-testid="late" /></Reveal>);
    expect(screen.getByTestId('late').parentElement!.style.getPropertyValue('--i')).toBe('6');
  });

  it('reveals immediately when the OS asks for reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    render(<Reveal><span data-testid="rm" /></Reveal>);
    const el = screen.getByTestId('rm').parentElement!;
    expect(el).toHaveClass('in');
    // revealed straight away — never handed to the observer
    expect(io()?.observed.has(el) ?? false).toBe(false);
  });

  it('reveals immediately when the element lives outside the scroll root', () => {
    const outsideRoot = document.createElement('main'); // never contains the node
    render(<Reveal root={outsideRoot}><span data-testid="out" /></Reveal>);
    expect(screen.getByTestId('out').parentElement!).toHaveClass('in');
  });
});

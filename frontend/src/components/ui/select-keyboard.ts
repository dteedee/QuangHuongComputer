/**
 * Keyboard behaviour shared by `SearchableSelect` and `AsyncSearchableSelect`.
 *
 * Closed: Enter / Space / ArrowDown opens. Open: Arrow keys move the highlight
 * with wrap-around, Enter commits, Escape closes. Both components had their own
 * copy of this switch; one of them wrapped and the other did not.
 */
import type { KeyboardEvent } from 'react';

export interface SelectKeyboardConfig {
  open: boolean;
  /** Number of options currently visible in the list. */
  count: number;
  highlighted: number;
  onOpen: () => void;
  onClose: () => void;
  setHighlighted: (next: number | ((prev: number) => number)) => void;
  /** Called with the index the user committed; ignore out-of-range yourself. */
  onCommit: (index: number) => void;
}

export function handleSelectKeyDown(e: KeyboardEvent, cfg: SelectKeyboardConfig): void {
  if (!cfg.open) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      cfg.onOpen();
    }
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    cfg.setHighlighted((p) => (p < cfg.count - 1 ? p + 1 : 0));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    cfg.setHighlighted((p) => (p > 0 ? p - 1 : cfg.count - 1));
  } else if (e.key === 'Enter') {
    e.preventDefault();
    cfg.onCommit(cfg.highlighted);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    cfg.onClose();
  }
}

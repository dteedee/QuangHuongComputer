/**
 * SearchableSelect — single-select with a type-ahead filter over a static list.
 * Exported as `Combobox` from the kit barrel; this path stays because 29
 * wave-0 files import it.
 *
 * Rewritten on tokens (`select-trigger.tsx` + `select-list.tsx`) — the previous version
 * hardcoded `slate-*`/`red-*`, used `z-[100]` and `text-[10px]`, and never told
 * assistive tech which option was active. Public props are unchanged.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { SelectTrigger, SelectPanel } from './select-trigger';
import { SelectSearch, SelectOptionRow, SelectEmpty, type SelectOptionItem } from './select-list';
import { handleSelectKeyDown } from './select-keyboard';

export type SearchableSelectOption = SelectOptionItem;

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  /** `null`/omitted → the component keeps its own value (uncontrolled). */
  onChange?: ((value: string) => void) | null;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
  error?: boolean;
  id?: string;
}

export function SearchableSelect({
  options,
  value = '',
  onChange,
  placeholder = 'Chọn...',
  searchPlaceholder = 'Tìm kiếm...',
  disabled = false,
  name,
  className = '',
  error = false,
  id,
}: SearchableSelectProps) {
  const reactId = useId();
  const listboxId = `lb-${reactId}`;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlighted, setHighlighted] = useState(-1);
  const [internal, setInternal] = useState(value);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setInternal(value), [value]);
  const current = onChange ? value : internal;

  const filtered = options.filter((o) =>
    String(o.label ?? '').toLowerCase().includes(search.toLowerCase()),
  );
  const selected = options.find((o) => o.value === current);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 40);
    setHighlighted(-1);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (highlighted < 0 || !listRef.current) return;
    listRef.current.querySelectorAll('[data-option]')[highlighted]?.scrollIntoView({
      block: 'nearest',
    });
  }, [highlighted]);

  const select = useCallback(
    (next: string) => {
      setInternal(next);
      onChange?.(next);
      setOpen(false);
      setSearch('');
    },
    [onChange],
  );

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  const onKeyDown = (e: React.KeyboardEvent) =>
    handleSelectKeyDown(e, {
      open,
      count: filtered.length,
      highlighted,
      onOpen: () => setOpen(true),
      onClose: close,
      setHighlighted,
      onCommit: (i) => filtered[i] && select(filtered[i].value),
    });

  return (
    <div ref={containerRef} className={cn('relative', className)} id={id}>
      {name && <input type="hidden" name={name} value={current} />}

      <SelectTrigger
        label={selected ? String(selected.label) : undefined}
        placeholder={placeholder}
        open={open}
        disabled={disabled}
        invalid={error}
        clearable={!!current}
        listboxId={listboxId}
        onToggle={() => !disabled && setOpen((v) => !v)}
        onClear={() => {
          setInternal('');
          onChange?.('');
        }}
        onKeyDown={onKeyDown}
      />

      {open && (
        <SelectPanel>
          <SelectSearch
            ref={searchRef}
            value={search}
            onChange={(v) => {
              setSearch(v);
              setHighlighted(-1);
            }}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            listboxId={listboxId}
            activeOptionId={highlighted >= 0 ? `${listboxId}-${highlighted}` : undefined}
          />
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            className="max-h-[240px] overflow-y-auto overscroll-contain py-1"
          >
            {filtered.length === 0 ? (
              <SelectEmpty />
            ) : (
              filtered.map((opt, i) => (
                <SelectOptionRow
                  key={opt.value}
                  id={`${listboxId}-${i}`}
                  option={opt}
                  selected={opt.value === current}
                  highlighted={i === highlighted}
                  onSelect={() => select(opt.value)}
                  onHighlight={() => setHighlighted(i)}
                />
              ))
            )}
          </div>
        </SelectPanel>
      )}
    </div>
  );
}

export default SearchableSelect;

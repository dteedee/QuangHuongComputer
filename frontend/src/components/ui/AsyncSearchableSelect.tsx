/**
 * AsyncSearchableSelect — same control as `SearchableSelect`, but options come
 * from the server: debounced search, page-on-scroll, and a label fallback for a
 * selected value whose option is not on the first page.
 *
 * Fetching lives in `use-async-select-options.ts`; the chrome is shared with
 * `SearchableSelect`. Public props are unchanged from the wave-0 version.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SelectTrigger, SelectPanel } from './select-trigger';
import { SelectSearch, SelectOptionRow, SelectEmpty, type SelectOptionItem } from './select-list';
import { useAsyncSelectOptions, type LoadOptions } from './use-async-select-options';
import { handleSelectKeyDown } from './select-keyboard';

export type { SelectOptionItem as SearchableSelectOption };

export interface AsyncSearchableSelectProps {
  loadOptions: LoadOptions;
  value?: string;
  onChange?: ((value: string) => void) | null;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
  error?: boolean;
  id?: string;
  /** Label to show for `value` before its page has been fetched. */
  defaultLabel?: string;
}

export function AsyncSearchableSelect({
  loadOptions,
  value = '',
  onChange,
  placeholder = 'Chọn...',
  searchPlaceholder = 'Tìm kiếm...',
  disabled = false,
  name,
  className = '',
  error = false,
  id,
  defaultLabel,
}: AsyncSearchableSelectProps) {
  const reactId = useId();
  const listboxId = `alb-${reactId}`;

  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [internal, setInternal] = useState(value);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { options, loading, failed, hasMore, search, setSearch, loadNextPage } =
    useAsyncSelectOptions(loadOptions, open);

  useEffect(() => setInternal(value), [value]);
  const current = onChange ? value : internal;

  /* Page in when the sentinel at the bottom of the list scrolls into view. */
  useEffect(() => {
    if (!open || !hasMore || loading || !sentinelRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadNextPage();
      },
      { root: listRef.current, threshold: 0.5 },
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [open, hasMore, loading, loadNextPage]);

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
  }, [open, setSearch]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 40);
    setHighlighted(-1);
    return () => window.clearTimeout(t);
  }, [open]);

  const select = useCallback(
    (next: string) => {
      setInternal(next);
      onChange?.(next);
      setOpen(false);
      setSearch('');
    },
    [onChange, setSearch],
  );

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  const onKeyDown = (e: React.KeyboardEvent) =>
    handleSelectKeyDown(e, {
      open,
      count: options.length,
      highlighted,
      onOpen: () => setOpen(true),
      onClose: close,
      setHighlighted,
      onCommit: (i) => options[i] && select(options[i].value),
    });

  const selected = options.find((o) => o.value === current);
  const label = selected ? String(selected.label) : current ? defaultLabel || current : undefined;

  return (
    <div ref={containerRef} className={cn('relative', className)} id={id}>
      {name && <input type="hidden" name={name} value={current} />}

      <SelectTrigger
        label={label}
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
            {options.map((opt, i) => (
              <SelectOptionRow
                key={`${opt.value}-${i}`}
                id={`${listboxId}-${i}`}
                option={opt}
                selected={opt.value === current}
                highlighted={i === highlighted}
                onSelect={() => select(opt.value)}
                onHighlight={() => setHighlighted(i)}
              />
            ))}
            {failed && (
              <p role="alert" className="px-3 py-4 text-center text-13 text-danger">
                Không tải được danh sách. Thử tìm lại.
              </p>
            )}
            {!loading && !failed && options.length === 0 && <SelectEmpty />}
            {loading && (
              <p className="flex items-center justify-center gap-2 px-3 py-3 text-13 text-fg-subtle">
                <Loader2 size={14} className="animate-spin" aria-hidden />
                Đang tải…
              </p>
            )}
            {hasMore && !loading && <div ref={sentinelRef} className="h-4" aria-hidden />}
          </div>
        </SelectPanel>
      )}
    </div>
  );
}

export default AsyncSearchableSelect;

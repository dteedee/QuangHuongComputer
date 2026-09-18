/**
 * Dialog — the ONE modal. Built on `@radix-ui/react-dialog`, which supplies the
 * four things the ~51 hand-rolled modals in this codebase all got wrong:
 * focus trap, Escape to close, background scroll lock, and
 * `role="dialog" aria-modal="true"` wired to the title and description.
 *
 * Motion (design-direction §5/§7) is CSS keyed off Radix's `data-state`, not
 * framer-motion: scrim fades 220ms, panel enters `translateY(-8px) scale(.98)`
 * → none over 320ms `expo`, exit is ~2/3 of that. The reduced-motion block in
 * styles/base.css neutralises both, so there is no JS branch to forget.
 */
import type { ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IconButton } from './icon-button';
import { Button } from './Button';
import { overlayClass } from './variants';

export const DialogRoot = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;

export type DialogSize = keyof typeof SIZES;

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required: it is the accessible name of the dialog. */
  title: ReactNode;
  /** Wire-up for `aria-describedby`. Keep it to one sentence. */
  description?: ReactNode;
  /** Visually hide the title (still announced) — for media-only dialogs. */
  hideTitle?: boolean;
  size?: DialogSize;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Hide the × — only for dialogs the user MUST answer. */
  hideClose?: boolean;
}

export const Dialog = ({
  open,
  onOpenChange,
  title,
  description,
  hideTitle = false,
  size = 'md',
  footer,
  children,
  className,
  hideClose = false,
}: DialogProps) => (
  <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={overlayClass} />
      <RadixDialog.Content
        /* Radix guarantees modality by `aria-hidden`-ing the rest of the tree,
         * but does not emit `aria-modal` itself; several screen readers still
         * key off it, and it is a Success Criterion for this track. */
        aria-modal="true"
        /* Radix warns when a Content has no Description. Explicitly clearing
         * `aria-describedby` is its sanctioned opt-out — but only when there is
         * no description, otherwise it would unwire the real one. */
        {...(description ? {} : { 'aria-describedby': undefined })}
        className={cn(
          'fixed left-1/2 top-1/2 z-drawer w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
          'flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[state=open]:duration-[320ms] data-[state=closed]:duration-140 ease-expo',
          SIZES[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <RadixDialog.Title
              className={cn(
                'font-display text-base font-semibold leading-6 text-fg',
                hideTitle && 'sr-only',
              )}
            >
              {title}
            </RadixDialog.Title>
            {description && (
              <RadixDialog.Description className="mt-1 text-sm leading-5 text-fg-muted">
                {description}
              </RadixDialog.Description>
            )}
          </div>
          {!hideClose && (
            <RadixDialog.Close asChild>
              <IconButton aria-label="Đóng" size="sm" className="-mr-1 -mt-1">
                <X size={16} aria-hidden />
              </IconButton>
            </RadixDialog.Close>
          )}
        </div>

        {/* Only the body scrolls — the header and footer stay put (§5). */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">
            {footer}
          </div>
        )}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  </RadixDialog.Root>
);

/**
 * ConfirmDialog — destructive confirmations. Never `window.confirm()`: it is
 * unstyled, untranslatable, and blocks the whole tab.
 */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
  tone?: 'danger' | 'primary';
}

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Huỷ',
  onConfirm,
  loading = false,
  tone = 'danger',
}: ConfirmDialogProps) => (
  <Dialog
    open={open}
    onOpenChange={onOpenChange}
    title={title}
    description={description}
    size="sm"
    footer={
      <>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
        <Button variant={tone} size="sm" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </>
    }
  />
);

export default Dialog;

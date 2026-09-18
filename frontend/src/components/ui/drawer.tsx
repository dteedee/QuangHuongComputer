/**
 * Drawer — edge-anchored panel: cart, mobile filters, mobile menu, admin
 * off-canvas sidebar. Same Radix Dialog foundation as `Dialog`, so focus trap,
 * Escape, scroll lock and `aria-modal` are identical.
 *
 * Motion (§5/§7): `translateX(±104%)` → 0 over 420ms `expo` in, 360ms out;
 * scrim fades 220ms. The 104% (not 100%) is what keeps the panel's shadow off
 * the screen edge while it is closed.
 */
import type { ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IconButton } from './icon-button';
import { overlayClass } from './variants';

export type DrawerSide = 'left' | 'right' | 'bottom';

const SIDE_CLASS: Record<DrawerSide, string> = {
  right:
    'inset-y-0 right-0 h-full w-[min(420px,100vw-3rem)] border-l ' +
    'data-[state=open]:slide-in-from-right-[104%] data-[state=closed]:slide-out-to-right-[104%]',
  left:
    'inset-y-0 left-0 h-full w-[min(320px,100vw-3rem)] border-r ' +
    'data-[state=open]:slide-in-from-left-[104%] data-[state=closed]:slide-out-to-left-[104%]',
  bottom:
    'inset-x-0 bottom-0 max-h-[85vh] w-full rounded-t-2xl border-t ' +
    'data-[state=open]:slide-in-from-bottom-[104%] data-[state=closed]:slide-out-to-bottom-[104%]',
};

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name — required, like Dialog. */
  title: ReactNode;
  description?: ReactNode;
  hideTitle?: boolean;
  side?: DrawerSide;
  /** Sticky action area at the bottom (e.g. "Thanh toán"). */
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export const Drawer = ({
  open,
  onOpenChange,
  title,
  description,
  hideTitle = false,
  side = 'right',
  footer,
  children,
  className,
}: DrawerProps) => (
  <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={overlayClass} />
      <RadixDialog.Content
        /* Radix guarantees modality by `aria-hidden`-ing the rest of the tree,
         * but does not emit `aria-modal` itself; several screen readers still
         * key off it, and it is a Success Criterion for this track. */
        aria-modal="true"
        {...(description ? {} : { 'aria-describedby': undefined })}
        className={cn(
          'fixed z-drawer flex flex-col overflow-hidden border-line bg-surface shadow-xl',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=open]:duration-420 data-[state=closed]:duration-360 ease-expo',
          SIDE_CLASS[side],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
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
          <RadixDialog.Close asChild>
            <IconButton aria-label="Đóng" size="sm" className="-mr-1 -mt-1">
              <X size={16} aria-hidden />
            </IconButton>
          </RadixDialog.Close>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer && (
          <div className="border-t border-line px-4 py-3">{footer}</div>
        )}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  </RadixDialog.Root>
);

export default Drawer;

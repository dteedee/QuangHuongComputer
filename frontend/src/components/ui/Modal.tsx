/**
 * @deprecated Use `Dialog` from `components/ui/dialog`.
 *
 * This file is now a thin adapter over `Dialog` and exists only because 10
 * wave-0 files import `components/ui/Modal` with the `isOpen`/`onClose` API
 * (counted 2026-09-18: 7 pages under pages/backoffice/hr + 3 components/hr).
 * Behaviour is no longer the old hand-rolled overlay: focus trap, Escape,
 * scroll lock and `aria-modal` now come from Radix, so those pages became
 * accessible without being edited.
 *
 * Wave-3 tracks: replace `<Modal isOpen onClose>` with
 * `<Dialog open onOpenChange>` and delete this shim.
 */
import type { ReactNode } from 'react';
import { Dialog, type DialogSize } from './dialog';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'lg',
}: ModalProps) => (
  <Dialog
    open={isOpen}
    onOpenChange={(next) => {
      if (!next) onClose();
    }}
    title={title}
    description={description}
    size={size}
    footer={footer}
  >
    {children}
  </Dialog>
);

export default Modal;

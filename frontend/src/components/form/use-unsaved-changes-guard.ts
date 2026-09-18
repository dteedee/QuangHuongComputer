/**
 * `useUnsavedChangesGuard` — the dirty-guard behind `CrudFormDialog` (and
 * usable standalone by any dirty RHF form). Two responsibilities:
 *  1. `beforeunload` — warns on tab close/refresh while dirty.
 *  2. `guardedClose(action)` — wraps a "close this UI" callback so it first
 *     asks via `useConfirm()` (ConfirmContext, extended by this same track)
 *     when the form is dirty, and only runs `action` on confirmation.
 *
 * Deliberately NOT built on React Router's `useBlocker`: the app router
 * (`App.tsx`) uses a plain `<BrowserRouter>`, and `useBlocker` only works
 * under a data router (`createBrowserRouter`). Route-level navigation guards
 * are out of this track's scope (see phase file Risk Assessment — page
 * migration is wave 3); this hook only guards closing the CURRENT dialog/form.
 */
import { useCallback, useEffect } from 'react';
import { useConfirm } from '../../context/ConfirmContext';

export interface UnsavedChangesGuardOptions {
  /** Typically `form.formState.isDirty` from react-hook-form. */
  isDirty: boolean;
  /** Confirmation dialog copy. Defaults are fine for most CRUD dialogs. */
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Also warn on tab close/refresh while dirty. Default `true`. */
  warnOnUnload?: boolean;
}

const DEFAULT_TITLE = 'Huỷ thay đổi?';
const DEFAULT_MESSAGE = 'Bạn có thay đổi chưa lưu. Đóng lại sẽ mất các thay đổi này.';

export function useUnsavedChangesGuard({
  isDirty,
  title = DEFAULT_TITLE,
  message = DEFAULT_MESSAGE,
  confirmText = 'Đóng, không lưu',
  cancelText = 'Tiếp tục chỉnh sửa',
  warnOnUnload = true,
}: UnsavedChangesGuardOptions) {
  const confirm = useConfirm();

  useEffect(() => {
    if (!warnOnUnload) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      // Chrome/Firefox ignore the custom string, but still require this to
      // trigger the native "leave site?" prompt.
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, warnOnUnload]);

  /**
   * Runs `action` immediately when the form is clean. When dirty, asks for
   * confirmation first and only runs `action` if the user confirms. Returns
   * whether `action` ran, so a caller can e.g. keep a dialog open on `false`.
   */
  const guardedClose = useCallback(
    async (action: () => void): Promise<boolean> => {
      if (!isDirty) {
        action();
        return true;
      }
      const ok = await confirm({ title, message, confirmText, cancelText, variant: 'warning' });
      if (ok) action();
      return ok;
    },
    [isDirty, title, message, confirmText, cancelText, confirm],
  );

  return { guardedClose };
}

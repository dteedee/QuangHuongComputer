/**
 * ConfirmContext — promise-based confirm (used in ~39 places already) +
 * `usePrompt` (W1-9, implementation step 5): the styled replacement for
 * native `window.prompt`. Extended in place rather than adding a second
 * dialog system, per the phase spec's Key Insights.
 *
 * State + resolve/reject logic lives here; the actual dialog JSX lives in
 * `components/form/confirm-dialog-view.tsx` and
 * `components/form/prompt-dialog-view.tsx` (this track's ownership: it is
 * the sole owner of this file per the phase spec, but not of a
 * `context/confirm/**` folder, so the heavy visual JSX was split into the
 * form-kit's own directory instead of ballooning this file past 200 LOC).
 */
import { createContext, useContext, useCallback, useRef, useState, type ReactNode } from 'react';
import { ConfirmDialogView } from '../components/form/confirm-dialog-view';
import { PromptDialogView } from '../components/form/prompt-dialog-view';
import type {
  ConfirmOptions,
  PromptAmountOptions,
  PromptSelectOptions,
  PromptState,
  PromptTextOptions,
} from '../components/form/confirm-prompt-types';

export type { ConfirmVariant, ConfirmOptions } from '../components/form/confirm-prompt-types';

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  promptText: (options: PromptTextOptions) => Promise<string | null>;
  promptAmount: (options: PromptAmountOptions) => Promise<number | null>;
  promptSelect: (options: PromptSelectOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

function useConfirmContext() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm/usePrompt must be used within <ConfirmProvider>');
  return ctx;
}

/** Unchanged from before this track — 39 existing call sites depend on this exact shape. */
export function useConfirm() {
  return useConfirmContext().confirm;
}

/**
 * `usePrompt().promptText/promptAmount/promptSelect` — replaces
 * `window.prompt` for reason text, a VND amount, or a short pick list.
 * Resolves `null` on cancel, the typed value on confirm.
 */
export function usePrompt() {
  const { promptText, promptAmount, promptSelect } = useConfirmContext();
  return { promptText, promptAmount, promptSelect };
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const confirmResolve = useRef<((v: boolean) => void) | null>(null);

  const [promptState, setPromptState] = useState<PromptState | null>(null);
  const promptResolve = useRef<((v: string | number | null) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    setConfirmState(options);
    return new Promise<boolean>((resolve) => {
      confirmResolve.current = resolve;
    });
  }, []);

  const closeConfirm = useCallback((result: boolean) => {
    confirmResolve.current?.(result);
    confirmResolve.current = null;
    setConfirmState(null);
  }, []);

  const openPrompt = useCallback((state: PromptState) => {
    setPromptState(state);
    return new Promise<string | number | null>((resolve) => {
      promptResolve.current = resolve;
    });
  }, []);

  const promptText = useCallback(
    (options: PromptTextOptions) => openPrompt({ kind: 'text', options }) as Promise<string | null>,
    [openPrompt],
  );
  const promptAmount = useCallback(
    (options: PromptAmountOptions) => openPrompt({ kind: 'amount', options }) as Promise<number | null>,
    [openPrompt],
  );
  const promptSelect = useCallback(
    (options: PromptSelectOptions) => openPrompt({ kind: 'select', options }) as Promise<string | null>,
    [openPrompt],
  );

  const closePrompt = useCallback((result: string | number | null) => {
    promptResolve.current?.(result);
    promptResolve.current = null;
    setPromptState(null);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm, promptText, promptAmount, promptSelect }}>
      {children}
      <ConfirmDialogView state={confirmState} onClose={closeConfirm} />
      <PromptDialogView state={promptState} onConfirm={closePrompt} onCancel={() => closePrompt(null)} />
    </ConfirmContext.Provider>
  );
}

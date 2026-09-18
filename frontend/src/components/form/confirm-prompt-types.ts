/**
 * Shared types for `ConfirmContext` (confirm) + `usePrompt` (text/amount/
 * select). Split out so `confirm-dialog-view.tsx` and `prompt-dialog-view.tsx`
 * can both import them without importing each other.
 */

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

interface BasePromptOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  /** Empty input blocks the confirm button. Default `true`. */
  required?: boolean;
  variant?: ConfirmVariant;
}

export interface PromptTextOptions extends BasePromptOptions {
  defaultValue?: string;
  maxLength?: number;
}

export interface PromptAmountOptions extends BasePromptOptions {
  defaultValue?: number;
  min?: number;
  max?: number;
  /** Unit shown in the affix box, e.g. "đ". */
  suffix?: string;
}

export interface PromptSelectOption {
  value: string;
  label: string;
}

export interface PromptSelectOptions extends BasePromptOptions {
  options: PromptSelectOption[];
  defaultValue?: string;
}

export type PromptKind = 'text' | 'amount' | 'select';

export type PromptState =
  | { kind: 'text'; options: PromptTextOptions }
  | { kind: 'amount'; options: PromptAmountOptions }
  | { kind: 'select'; options: PromptSelectOptions };

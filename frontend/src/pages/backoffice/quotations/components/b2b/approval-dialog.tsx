/**
 * One confirm dialog for every state-change action shared by quotations and
 * instalments: send/accept (no input), reject (reason, required), instalment
 * approve (finance contract number, required). Avoids `window.prompt`/`confirm`
 * per the form kit's `usePrompt` contract (`docs/frontend-form-kit.md` §6) —
 * this is the multi-field case that `usePrompt`'s single-value prompts don't
 * cover (a warning line + a required text input together).
 */
import { useEffect, useState } from 'react';
import { Dialog, Button, Textarea, Input } from '../../../../../components/ui';

export interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Danger-styled confirm button (reject/cancel-adjacent actions). */
  tone?: 'default' | 'danger';
  confirmLabel: string;
  loading?: boolean;
  /** When set, renders a required text field (reason or contract number) and
   *  passes its trimmed value to `onConfirm`. */
  input?: { label: string; placeholder?: string; multiline?: boolean };
  onConfirm: (value?: string) => void | Promise<void>;
}

export function ApprovalDialog({
  open,
  onOpenChange,
  title,
  description,
  tone = 'default',
  confirmLabel,
  loading = false,
  input,
  onConfirm,
}: ApprovalDialogProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) setValue('');
  }, [open]);

  const disabled = loading || (!!input && value.trim().length === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} size="sm">
      <div className="space-y-4">
        {description && <p className="text-sm text-fg-muted">{description}</p>}
        {input && (
          input.multiline ? (
            <Textarea label={input.label} placeholder={input.placeholder} rows={3} value={value} onChange={(e) => setValue(e.target.value)} />
          ) : (
            <Input label={input.label} placeholder={input.placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
          )
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Huỷ</Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={loading}
            disabled={disabled}
            onClick={() => void onConfirm(input ? value.trim() : undefined)}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

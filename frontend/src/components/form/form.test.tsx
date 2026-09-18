/**
 * Form kit contract tests (W1-9) — the ones the phase file's Success
 * Criteria make that a typecheck cannot prove:
 *  - a multi-tab form retains values typed on a hidden tab (the exact bug
 *    class that broke the product editor — conditional DOM + `FormData`);
 *  - `applyServerErrors` maps the backend field-error contract onto a field;
 *  - `CrudFormDialog` prompts before closing a dirty form.
 */
import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmProvider } from '../../context/ConfirmContext';
import { useAppForm } from './form';
import { TextField } from './form-text-fields';
import { applyServerErrors } from './apply-server-errors';
import { CrudFormDialog } from './form-dialog';

const tabsSchema = z.object({
  tabA: z.string().optional(),
  tabB: z.string().optional(),
});

/** Subscribes to live form state — a plain `form.getValues()` in JSX does NOT
 * re-render on every keystroke (RHF's internal store, not React state), so
 * the dump needs its own `useWatch` subscription to stay live. */
function LiveValuesDump({ control }: { control: Parameters<typeof useWatch>[0]['control'] }) {
  const values = useWatch({ control });
  return <pre data-testid="values">{JSON.stringify(values)}</pre>;
}

/** Two "tabs" sharing ONE form — only one field is ever mounted at a time. */
function MultiTabHarness() {
  const form = useAppForm({ schema: tabsSchema, defaultValues: { tabA: '', tabB: '' } });
  const [tab, setTab] = useState<'a' | 'b'>('a');

  return (
    <FormProvider {...form}>
      <button type="button" onClick={() => setTab('a')}>Tab A</button>
      <button type="button" onClick={() => setTab('b')}>Tab B</button>
      {tab === 'a' && <TextField name="tabA" control={form.control} label="Trường A" />}
      {tab === 'b' && <TextField name="tabB" control={form.control} label="Trường B" />}
      <LiveValuesDump control={form.control} />
    </FormProvider>
  );
}

describe('multi-tab form state (product-editor regression)', () => {
  it('keeps a value typed on tab A after switching to tab B and back — DOM unmount never touches form state', async () => {
    const user = userEvent.setup();
    render(<MultiTabHarness />);

    await user.type(screen.getByLabelText('Trường A'), 'gia tri A');
    // Switch away — tab A's <input> unmounts entirely.
    await user.click(screen.getByText('Tab B'));
    expect(screen.queryByLabelText('Trường A')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Trường B'), 'gia tri B');

    // The dump is always present regardless of which tab is visible — this
    // is `form.getValues()`, not the DOM, and it must hold BOTH values.
    await waitFor(() => {
      const dump = screen.getByTestId('values').textContent ?? '';
      expect(dump).toContain('gia tri A');
      expect(dump).toContain('gia tri B');
    });

    // Switching back re-mounts tab A's input WITH the value still in form state.
    await user.click(screen.getByText('Tab A'));
    expect(screen.getByLabelText('Trường A')).toHaveValue('gia tri A');
  });
});

describe('applyServerErrors', () => {
  it('maps a normalized backend field error onto the matching RHF field', async () => {
    function Harness() {
      const form = useAppForm({ schema: z.object({ email: z.string().optional() }) });
      const onFail = () => {
        applyServerErrors(
          form.setError,
          { normalized: { status: 400, message: 'Bad request', fieldErrors: { email: 'Email đã được sử dụng' } } },
          ['email'],
        );
      };
      return (
        <FormProvider {...form}>
          <TextField name="email" control={form.control} label="Email" />
          <button type="button" onClick={onFail}>Giả lập lỗi server</button>
        </FormProvider>
      );
    }

    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Giả lập lỗi server'));
    expect(await screen.findByText('Email đã được sử dụng')).toBeInTheDocument();
  });
});

describe('CrudFormDialog dirty guard', () => {
  const schema = z.object({ name: z.string().optional() });

  function DialogHarness({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
    return (
      <ConfirmProvider>
        <CrudFormDialog
          open
          onOpenChange={onOpenChange}
          title="Sửa danh mục"
          schema={schema}
          defaultValues={{ name: '' }}
          onSubmit={async () => {}}
        >
          {(form) => <TextField name="name" control={form.control} label="Tên" />}
        </CrudFormDialog>
      </ConfirmProvider>
    );
  }

  it('asks for confirmation before closing a dirty dialog, and stays open on "keep editing"', async () => {
    const user = userEvent.setup();
    const closes: boolean[] = [];
    render(<DialogHarness onOpenChange={(open) => closes.push(open)} />);

    await user.type(screen.getByLabelText('Tên'), 'thay doi chua luu');
    await user.click(screen.getByRole('button', { name: 'Huỷ' }));

    expect(await screen.findByText('Huỷ thay đổi?')).toBeInTheDocument();
    // `getByText`, not `getByRole` — FINDING (docs/frontend-form-kit.md §11,
    // w1-9-report.md): Radix's own `Dialog` applies `aria-hidden` to every
    // OTHER top-level body sibling while it is open, to enforce modality for
    // assistive tech. `ConfirmDialogView` is not itself a Radix primitive, so
    // while `CrudFormDialog`'s own Radix Dialog is open, Radix aria-hides the
    // confirm overlay's whole subtree — invisible to `getByRole` (which
    // walks the accessibility tree) even though it is fully visible and
    // clickable on screen (aria-hidden does not affect pointer events; a
    // sighted mouse user is unaffected). Pre-existing in `ConfirmContext`
    // since before this track — this is the first call site that nests
    // `confirm()` inside an already-open Radix `Dialog`, which is what
    // surfaces it. Not fixed here (would mean rebuilding the confirm/prompt
    // overlay on Radix's own primitives); flagged for W1-12/W4-3.
    await user.click(screen.getByText('Tiếp tục chỉnh sửa'));

    // Only the initial `open: true` from the harness — no close was confirmed.
    expect(closes).not.toContain(false);
    expect(screen.getByLabelText('Tên')).toBeInTheDocument();
  });

  it('closes once the user confirms discarding changes', async () => {
    const user = userEvent.setup();
    const closes: boolean[] = [];
    render(<DialogHarness onOpenChange={(open) => closes.push(open)} />);

    await user.type(screen.getByLabelText('Tên'), 'thay doi chua luu');
    await user.click(screen.getByRole('button', { name: 'Huỷ' }));
    await user.click(await screen.findByText('Đóng, không lưu')); // see note above

    expect(closes).toContain(false);
  });

  it('closes immediately with no prompt when the form is clean', async () => {
    const user = userEvent.setup();
    const closes: boolean[] = [];
    render(<DialogHarness onOpenChange={(open) => closes.push(open)} />);

    await user.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(closes).toContain(false);
    expect(screen.queryByText('Huỷ thay đổi?')).not.toBeInTheDocument();
  });
});

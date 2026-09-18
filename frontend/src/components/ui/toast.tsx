/**
 * Toast — the app's notification API, on tokens.
 *
 * Built on `react-hot-toast`, NOT on a second toast runtime: 123 files already
 * call `toast.success(...)` and a single `<Toaster/>` is mounted in App.tsx.
 * Adding @radix-ui/react-toast next to it would give the user two stacks of
 * notifications in different corners. So this module keeps that plumbing and
 * replaces only the surface: `toast.custom` renders the design-direction §5
 * toast — status icon, 5s life bar, optional "Hoàn tác" for reversible actions.
 *
 * Use `notify.*` in new code. `import toast from 'react-hot-toast'` still works
 * for the wave-0 pages that have not been rewritten yet.
 */
import hotToast, { type Toast as HotToast } from 'react-hot-toast';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import './ui-kit.css'; // @keyframes toast-life

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

const TONE = {
  success: { Icon: CheckCircle2, cls: 'text-success' },
  error: { Icon: XCircle, cls: 'text-danger' },
  warning: { Icon: AlertTriangle, cls: 'text-warning' },
  info: { Icon: Info, cls: 'text-info' },
} as const;

/** 5s life bar (§5). Keep in sync with the `duration` passed to hotToast. */
const LIFE_MS = 5000;

export interface NotifyOptions {
  /** Second line under the title. */
  description?: string;
  /** Renders a "Hoàn tác" button. Only for actions that really are reversible. */
  onUndo?: () => void;
  undoLabel?: string;
  durationMs?: number;
  id?: string;
}

function render(tone: ToastTone, title: string, opts: NotifyOptions = {}) {
  const { Icon, cls } = TONE[tone];
  const duration = opts.durationMs ?? LIFE_MS;

  return hotToast.custom(
    (t: HotToast) => (
      <div
        role={tone === 'error' ? 'alert' : 'status'}
        aria-live={tone === 'error' ? 'assertive' : 'polite'}
        className={cn(
          'group pointer-events-auto relative w-[min(380px,calc(100vw-2rem))] overflow-hidden',
          'rounded-xl border border-line bg-surface shadow-lg',
          t.visible
            ? 'animate-in fade-in-0 slide-in-from-right-[120%] duration-480 ease-expo'
            : 'animate-out fade-out-0 slide-out-to-right-[120%] duration-360 ease-expo',
        )}
      >
        <div className="flex items-start gap-3 px-4 py-3">
          <Icon size={18} className={cn('mt-px shrink-0', cls)} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-5 text-fg">{title}</p>
            {opts.description && (
              <p className="mt-0.5 text-xs leading-4 text-fg-muted">{opts.description}</p>
            )}
          </div>
          {opts.onUndo && (
            <button
              type="button"
              onClick={() => {
                opts.onUndo?.();
                hotToast.dismiss(t.id);
              }}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-brand-text hover:bg-brand-subtle"
            >
              {opts.undoLabel ?? 'Hoàn tác'}
            </button>
          )}
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => hotToast.dismiss(t.id)}
            className="shrink-0 rounded-md p-1 text-fg-subtle hover:bg-fg/5 hover:text-fg"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path
                d="M2 2l8 8M10 2l-8 8"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        {/* Life bar: transform only, paused while the pointer is on the toast. */}
        <span
          aria-hidden
          className={cn(
            'absolute inset-x-0 bottom-0 h-0.5 origin-left bg-fg/15',
            'group-hover:[animation-play-state:paused] motion-reduce:hidden',
          )}
          style={{ animation: `toast-life ${duration}ms linear forwards` }}
        />
      </div>
    ),
    { duration, id: opts.id },
  );
}

export const notify = {
  success: (title: string, opts?: NotifyOptions) => render('success', title, opts),
  error: (title: string, opts?: NotifyOptions) => render('error', title, opts),
  warning: (title: string, opts?: NotifyOptions) => render('warning', title, opts),
  info: (title: string, opts?: NotifyOptions) => render('info', title, opts),
  dismiss: (id?: string) => hotToast.dismiss(id),
};

export default notify;

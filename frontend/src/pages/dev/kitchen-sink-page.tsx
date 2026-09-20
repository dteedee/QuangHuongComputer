/**
 * /dev/kitchen-sink — every UI-kit primitive on one page.
 *
 * TEMPORARY. Purpose: prove the kit renders correctly in light AND dark, in the
 * storefront AND admin density, and that everything is reachable by keyboard.
 * Removed at the W3 gate together with this folder.
 *
 * The route is registered by W1-8 (integration request in
 * reports/integration-requests-w1.md) — Development builds only.
 */
import { useState } from 'react';
import { PageHeader, Button, Card } from '../../components/ui';
import { KitchenSinkDisplay } from './kitchen-sink-display';
import { KitchenSinkInputs } from './kitchen-sink-inputs';
import { KitchenSinkOverlays } from './kitchen-sink-overlays';
import { KitchenSinkData } from './kitchen-sink-data';
import { BackofficePatternsDemo } from '../../components/ui/backoffice-patterns-demo';

type Shell = 'storefront' | 'admin';

const SECTIONS = [
  { id: 'display', label: 'Hiển thị', node: <KitchenSinkDisplay /> },
  { id: 'inputs', label: 'Nhập liệu', node: <KitchenSinkInputs /> },
  { id: 'overlays', label: 'Lớp phủ', node: <KitchenSinkOverlays /> },
  { id: 'data', label: 'Dữ liệu', node: <KitchenSinkData /> },
  // Khuôn trang back office (docs/design-guidelines.md §9) — các track chuyển trang soi ở đây.
  { id: 'backoffice', label: 'Khuôn back office', node: <BackofficePatternsDemo /> },
];

export const KitchenSinkPage = () => {
  /* Local toggles only — this page must never write to the app's real theme
   * state, or a developer opening it would flip the owner's site into dark. */
  const [dark, setDark] = useState(false);
  const [shell, setShell] = useState<Shell>('storefront');

  return (
    <div
      className={dark ? 'dark' : undefined}
      data-shell={shell === 'admin' ? 'admin' : undefined}
    >
      <div className="min-h-screen bg-bg px-4 py-6 text-fg sm:px-5 lg:px-6">
        <div className="mx-auto max-w-admin">
          <PageHeader
            title="UI kit — kitchen sink"
            description="Mọi primitive của bộ UI. Hợp đồng: docs/ui-kit-components.md · design/design-direction.md."
            actions={
              <>
                <Button variant="outline" size="sm" onClick={() => setDark((v) => !v)}>
                  {dark ? 'Sang Light' : 'Sang Dark'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShell((s) => (s === 'admin' ? 'storefront' : 'admin'))}
                >
                  Mật độ: {shell === 'admin' ? 'Admin (14/40)' : 'Storefront (16/44)'}
                </Button>
              </>
            }
          />

          <nav aria-label="Mục lục" className="mb-6 flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#ks-${s.id}`}
                className="rounded-full border border-line px-3 py-1 text-13 text-fg-muted hover:border-line-strong hover:text-fg"
              >
                {s.label}
              </a>
            ))}
          </nav>

          <div className="space-y-6">
            {SECTIONS.map((s) => (
              <Card key={s.id} id={`ks-${s.id}`} padded radius="2xl">
                <h2 className="mb-4 font-display text-xl font-semibold tracking-tight text-fg">
                  {s.label}
                </h2>
                {s.node}
              </Card>
            ))}
          </div>

          <p className="mt-8 text-xs text-fg-subtle">
            Kiểm tra bàn phím: Tab qua toàn bộ trang — mọi điều khiển phải có vòng focus đỏ 2px.
            Bật “Giảm chuyển động” của hệ điều hành rồi mở lại Dialog/Drawer/Toast: không còn
            trượt hay phóng to.
          </p>
        </div>
      </div>
    </div>
  );
};

export default KitchenSinkPage;

/**
 * D08 / NĐ 52/2013 Đ28.2.đ (bổ sung bởi NĐ 85/2021 Đ1.10): the four policy
 * pages must be linked FROM THE HOME PAGE, not only from a footer that shows up
 * on inner pages. These four CMS pages exist and return 200 today
 * (`/api/content/pages/{bao-hanh,doi-tra,kiem-hang,khieu-nai}`).
 */
import { Link } from 'react-router-dom';
import { ClipboardCheck, MessageSquareWarning, RotateCcw, ShieldCheck } from 'lucide-react';
import { buildPath, ROUTES } from '../../routes/route-paths';

const POLICIES = [
    { slug: 'bao-hanh', label: 'Chính sách bảo hành', icon: ShieldCheck },
    { slug: 'doi-tra', label: 'Chính sách đổi trả & hoàn tiền', icon: RotateCcw },
    { slug: 'kiem-hang', label: 'Chính sách kiểm hàng', icon: ClipboardCheck },
    { slug: 'khieu-nai', label: 'Quy trình khiếu nại', icon: MessageSquareWarning },
];

export const PolicyLinksStrip = () => (
    <section className="mx-auto mt-10 w-full max-w-shell px-4">
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">
                Điều kiện giao dịch chung
            </h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {POLICIES.map(({ slug, label, icon: Icon }) => (
                    <li key={slug}>
                        <Link
                            to={buildPath(ROUTES.POLICY, slug)}
                            className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-sm text-fg-muted transition-colors duration-140 hover:border-brand-line hover:text-brand-text"
                        >
                            <Icon size={18} className="shrink-0 text-brand" aria-hidden />
                            <span className="min-w-0 truncate">{label}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    </section>
);

export default PolicyLinksStrip;

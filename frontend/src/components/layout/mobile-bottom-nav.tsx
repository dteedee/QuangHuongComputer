/**
 * Thanh điều hướng dưới đáy cho storefront ở bề ngang mobile (< lg).
 *
 * 5 mục: Trang chủ · Danh mục (mở menu danh mục có sẵn của Header) · Khuyến mãi · Giỏ hàng
 * (mở CartDrawer, có badge số dòng) · Tài khoản. Ẩn ở luồng thanh toán (khách đang điền form,
 * không được rời đi bằng một chạm nhầm) và không bao giờ hiện trong back office.
 *
 * Chiều cao + safe-area được công bố qua cờ `data-mobile-nav` trên `<html>` → biến
 * `--mobile-nav-offset` (styles/base.css), để thanh mua nhanh, nút chat, nút lên đầu trang và
 * thanh so sánh tự nâng lên đúng bằng chừng đó.
 */
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingCart, Tag, User } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { ROUTES } from '../../routes/route-paths';
import { cn } from '../../lib/utils';
import { IconButton } from '../ui';
import { useRootFlag } from './use-root-flag';

/** Tiền tố đường dẫn KHÔNG hiện thanh: luồng thanh toán + back office (phòng hờ). */
const HIDDEN_PREFIXES = [ROUTES.CHECKOUT, '/checkout', '/payment', '/backoffice', '/admin'];

function isMobileNavHidden(pathname: string): boolean {
  return HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

const itemClass =
  'relative flex h-14 w-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 ' +
  'rounded-none text-[11px] font-semibold leading-none transition-colors';

function tone(active: boolean) {
  return active ? 'text-brand-text' : 'text-fg-muted hover:text-fg';
}

function NavLink({ to, label, icon, active }: { to: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <Link to={to} className={cn(itemClass, tone(active))} aria-current={active ? 'page' : undefined}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export interface MobileBottomNavProps {
  onCategoryClick: () => void;
  onCartClick: () => void;
  /** Menu danh mục đang mở — để nút phản ánh `aria-expanded`. */
  categoryMenuOpen?: boolean;
}

export function MobileBottomNav({ onCategoryClick, onCartClick, categoryMenuOpen = false }: MobileBottomNavProps) {
  const { pathname } = useLocation();
  const { itemCount } = useCart();
  const hidden = isMobileNavHidden(pathname);
  useRootFlag('data-mobile-nav', !hidden);

  if (hidden) return null;

  const startsWith = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const badge = itemCount > 99 ? '99+' : String(itemCount);
  const iconSize = 22;

  return (
    <nav
      aria-label="Điều hướng nhanh"
      className="fixed inset-x-0 bottom-0 z-floating border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        <NavLink to={ROUTES.HOME} label="Trang chủ" active={pathname === ROUTES.HOME}
          icon={<Home size={iconSize} aria-hidden />} />
        <IconButton
          aria-label="Danh mục"
          aria-haspopup="dialog"
          aria-expanded={categoryMenuOpen}
          onClick={onCategoryClick}
          className={cn(itemClass, 'h-14 w-auto', tone(categoryMenuOpen))}
        >
          <LayoutGrid size={iconSize} aria-hidden />
          <span aria-hidden>Danh mục</span>
        </IconButton>
        <NavLink to={ROUTES.PROMOTIONS} label="Khuyến mãi" active={startsWith(ROUTES.PROMOTIONS)}
          icon={<Tag size={iconSize} aria-hidden />} />
        <IconButton
          aria-label={itemCount > 0 ? `Giỏ hàng, ${itemCount} sản phẩm` : 'Giỏ hàng'}
          onClick={onCartClick}
          className={cn(itemClass, 'h-14 w-auto', tone(false))}
        >
          <span className="relative">
            <ShoppingCart size={iconSize} aria-hidden />
            {itemCount > 0 && (
              <span
                data-testid="mobile-nav-cart-badge"
                className="num absolute -right-3 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface bg-brand px-1 text-[11px] font-bold leading-none text-white"
              >
                {badge}
              </span>
            )}
          </span>
          <span aria-hidden>Giỏ hàng</span>
        </IconButton>
        <NavLink to={ROUTES.ACCOUNT} label="Tài khoản" active={startsWith(ROUTES.ACCOUNT)}
          icon={<User size={iconSize} aria-hidden />} />
      </div>
    </nav>
  );
}

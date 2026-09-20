import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getConfigValue } from '../api/systemConfig';
import { catalogPublicListingApi } from '../api/catalog/public-listing';
import { contentApi, type Menu } from '../api/content';
import { usePublicConfig } from '../lib/use-public-config';
import { queryKeys } from '../lib/query-keys';
import { HeaderTopBar } from './header/header-top-bar';
import { HeaderUtilityBar } from './header/header-utility-bar';
import { HeaderMainBar } from './header/header-main-bar';
import { HeaderNavBar } from './header/header-nav-bar';
import { HeaderMobileMenu } from './header/header-mobile-menu';
import { HeaderMobileSearchOverlay } from './header/header-mobile-search-overlay';

interface HeaderProps {
    onCartClick: () => void;
    onChatClick?: () => void;
}

const CATALOG_STALE_TIME_MS = 5 * 60 * 1000;

export const Header = ({ onCartClick, onChatClick }: HeaderProps) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const location = useLocation();

    // Thu gọn header khi cuộn — CÓ VÙNG CHẾT (hysteresis), không dùng một ngưỡng duy nhất.
    //
    // Một ngưỡng duy nhất (`scrollY > 60`) gây rung: header nằm trong luồng tài liệu, thu gọn làm
    // tài liệu thấp đi ~62px, trình duyệt bù lại vị trí cuộn và đẩy scrollY qua lại quanh đúng con
    // số 60 → header đóng/mở liên tục. `overflow-anchor: none` trong index.css chặn nguyên nhân
    // gốc trên Chrome; vùng chết dưới đây là lớp chắn thứ hai cho các trình duyệt bù cuộn theo
    // cách khác, và cũng tránh việc chỉ lăn chuột một nấc quanh ngưỡng đã làm header nhấp nháy.
    // Vùng chết phải RỘNG HƠN phần chiều cao mất đi khi thu gọn (~62px), nếu không cú bù cuộn vẫn
    // đủ sức kéo ngược qua ngưỡng còn lại.
    useEffect(() => {
        const COLLAPSE_ABOVE = 140;
        const EXPAND_BELOW = 60;
        let frame = 0;

        const readScroll = () => {
            frame = 0;
            const y = window.scrollY;
            // Đang thu gọn thì chỉ bung khi lên hẳn trên EXPAND_BELOW, và ngược lại.
            setIsScrolled((collapsed) => (collapsed ? y > EXPAND_BELOW : y > COLLAPSE_ABOVE));
        };

        // Gộp nhiều sự kiện scroll vào một khung hình: cuộn chậm bắn rất nhiều sự kiện, mỗi lần
        // setState là một lần render lại cả header.
        const handleScroll = () => {
            if (frame) return;
            frame = requestAnimationFrame(readScroll);
        };

        readScroll(); // tải trang ở giữa chừng (nhấn F5 khi đang cuộn) vẫn ra đúng trạng thái
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, []);

    // One shared cache entry per resource (phase §12): the header no longer
    // fetches `/config/public` itself, and categories are a TanStack query that
    // the listing page and the mega menu reuse instead of refetching.
    const { data: configs = [] } = usePublicConfig();

    const { data: headerMenu = null } = useQuery<Menu | null>({
        queryKey: queryKeys.content.detail('menu:HeaderMain'),
        queryFn: () => contentApi.getMenu('HeaderMain'),
        staleTime: CATALOG_STALE_TIME_MS,
        retry: 1,
    });

    const categoriesQuery = useQuery({
        queryKey: queryKeys.catalog.list({ resource: 'categories' }),
        queryFn: catalogPublicListingApi.getCategories,
        staleTime: CATALOG_STALE_TIME_MS,
    });

    /* Active categories that actually have something to show. The catalogue
     * still carries empty `w02-probe-*` rows from a wave-2 API probe; listing
     * them in the customer-facing menu would be a defect. */
    const categories = useMemo(
        () => (categoriesQuery.data ?? []).filter((c) => c.isActive && (c.productCount ?? 0) > 0),
        [categoriesQuery.data],
    );

    // Close mobile surfaces on route change
    useEffect(() => {
        setShowMobileMenu(false);
        setShowMobileSearch(false);
    }, [location.pathname, location.search]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        document.body.style.overflow = showMobileMenu ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [showMobileMenu]);

    const companyBrand1 = getConfigValue(configs, 'COMPANY_BRAND_TEXT_1', 'QUANG HƯỞNG', (v) => v);
    const companyBrand2 = getConfigValue(configs, 'COMPANY_BRAND_TEXT_2', 'COMPUTER', (v) => v);

    return (
        <>
            <header className={`sticky top-0 z-topbar flex w-full flex-col bg-surface font-sans transition-shadow duration-220 ${isScrolled ? 'shadow-md' : 'shadow-sm'}`}>
                <HeaderTopBar isScrolled={isScrolled} />
                <HeaderUtilityBar isScrolled={isScrolled} />
                <HeaderMainBar
                    isScrolled={isScrolled}
                    companyBrand1={companyBrand1}
                    companyBrand2={companyBrand2}
                    categories={categories}
                    categoriesLoading={categoriesQuery.isPending}
                    onCartClick={onCartClick}
                    onChatClick={onChatClick}
                    onMobileMenuOpen={() => setShowMobileMenu(true)}
                    onMobileSearchOpen={() => setShowMobileSearch(true)}
                />
                <HeaderNavBar headerMenu={headerMenu} isScrolled={isScrolled} />
            </header>

            <HeaderMobileMenu
                isOpen={showMobileMenu}
                onClose={() => setShowMobileMenu(false)}
                companyBrand1={companyBrand1}
                companyBrand2={companyBrand2}
                categories={categories}
            />

            <HeaderMobileSearchOverlay
                open={showMobileSearch}
                onClose={() => setShowMobileSearch(false)}
                categories={categories}
            />
        </>
    );
};

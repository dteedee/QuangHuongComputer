import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { systemConfigApi, getConfigValue, type ConfigurationEntry } from '../api/systemConfig';
import { catalogApi, type Category } from '../api/catalog';
import { contentApi, type Menu } from '../api/content';
import { HeaderTopBar } from './header/header-top-bar';
import { HeaderMainBar } from './header/header-main-bar';
import { HeaderNavBar } from './header/header-nav-bar';
import { HeaderMobileMenu } from './header/header-mobile-menu';

interface HeaderProps {
    onCartClick: () => void;
    onChatClick?: () => void;
}

export const Header = ({ onCartClick, onChatClick }: HeaderProps) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [configs, setConfigs] = useState<ConfigurationEntry[]>([]);
    const [headerMenu, setHeaderMenu] = useState<Menu | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const location = useLocation();

    // Scroll listener for sticky shrink
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 60);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fetch config and menu data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const configData = await systemConfigApi.config.getPublic();
                setConfigs(Array.isArray(configData) ? configData : []);
            } catch (error) {
                console.error('Failed to load config', error);
            }
            try {
                const menuData = await contentApi.getMenu('HeaderMain');
                setHeaderMenu(menuData);
            } catch (error) {
                console.error('Failed to load header menu', error);
            }
        };
        fetchData();
    }, []);

    // Fetch categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await catalogApi.getCategories();
                setCategories(data.filter(c => c.isActive));
            } catch (error) {
                console.error('Failed to load categories', error);
            }
        };
        fetchCategories();
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setShowMobileMenu(false);
    }, [location.pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        document.body.style.overflow = showMobileMenu ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [showMobileMenu]);

    const companyBrand1 = getConfigValue(configs, 'COMPANY_BRAND_TEXT_1', 'QUANG HUONG', (v) => v);
    const companyBrand2 = getConfigValue(configs, 'COMPANY_BRAND_TEXT_2', 'COMPUTER', (v) => v);

    return (
        <>
            <header className={`flex flex-col w-full z-50 sticky top-0 bg-white font-sans transition-shadow duration-200 ${isScrolled ? 'shadow-md' : 'shadow-sm'}`}>
                <HeaderTopBar isScrolled={isScrolled} configs={configs} />
                <HeaderMainBar
                    isScrolled={isScrolled}
                    companyBrand1={companyBrand1}
                    companyBrand2={companyBrand2}
                    categories={categories}
                    onCartClick={onCartClick}
                    onChatClick={onChatClick}
                    onMobileMenuOpen={() => setShowMobileMenu(true)}
                />
                <HeaderNavBar headerMenu={headerMenu} />
            </header>

            <HeaderMobileMenu
                isOpen={showMobileMenu}
                onClose={() => setShowMobileMenu(false)}
                companyBrand1={companyBrand1}
                companyBrand2={companyBrand2}
                categories={categories}
            />
        </>
    );
};

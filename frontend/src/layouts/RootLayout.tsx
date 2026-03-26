import { Outlet, Link, useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useState, useEffect } from 'react';
import { CartDrawer } from '../components/CartDrawer';
import { AiChatbot } from '../components/AiChatbot';
import { useCart } from '../context/CartContext';
import {
    Home, Search, ShoppingCart, User, ChevronUp,
    LayoutGrid
} from 'lucide-react';

const BackToTop = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => setVisible(window.scrollY > 400);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!visible) return null;

    return (
        <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-24 lg:bottom-8 right-4 lg:right-6 z-[90] w-11 h-11 bg-white border border-gray-200 rounded-full shadow-xl flex items-center justify-center text-gray-600 hover:text-accent hover:border-accent hover:shadow-brand transition-all active:scale-90 group"
            aria-label="Cuộn lên đầu trang"
        >
            <ChevronUp size={20} className="group-hover:-translate-y-0.5 transition-transform" />
        </button>
    );
};

const MobileBottomNav = ({ onCartClick }: { onCartClick: () => void }) => {
    const location = useLocation();
    const { itemCount } = useCart();

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const navItems = [
        { path: '/', icon: Home, label: 'Trang chủ' },
        { path: '/products', icon: LayoutGrid, label: 'Danh mục' },
        { path: '/products?q=', icon: Search, label: 'Tìm kiếm' },
        { path: '#cart', icon: ShoppingCart, label: 'Giỏ hàng', badge: itemCount },
        { path: '/account', icon: User, label: 'Tài khoản' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[95] bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden">
            <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
                {navItems.map(item => {
                    const active = item.path !== '#cart' && isActive(item.path);
                    const Icon = item.icon;

                    if (item.path === '#cart') {
                        return (
                            <button
                                key="cart"
                                onClick={onCartClick}
                                className="flex flex-col items-center justify-center gap-0.5 relative px-3 py-1"
                            >
                                <div className="relative">
                                    <Icon size={22} className="text-gray-500" />
                                    {item.badge !== undefined && item.badge > 0 && (
                                        <span className="absolute -top-1.5 -right-2.5 bg-accent text-white text-[9px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border border-white">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-semibold text-gray-500">
                                    {item.label}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                                active
                                    ? 'text-accent'
                                    : 'text-gray-500'
                            }`}
                        >
                            <Icon size={22} className={active ? 'text-accent' : ''} />
                            <span className={`text-[10px] font-semibold ${active ? 'text-accent' : ''}`}>
                                {item.label}
                            </span>
                            {active && (
                                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-accent" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export const RootLayout = () => {
    const [isCartOpen, setIsCartOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-accent/10">
            <Header
                onCartClick={() => setIsCartOpen(true)}
            />
            <main className="animate-fade-in pb-16 lg:pb-0">
                <Outlet />
            </main>
            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            <AiChatbot />
            <BackToTop />
            <MobileBottomNav onCartClick={() => setIsCartOpen(true)} />
            <Footer />
        </div>
    );
};

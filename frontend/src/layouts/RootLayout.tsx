import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useState, useEffect } from 'react';
import { CartDrawer } from '../components/CartDrawer';
import { RouteOutlet } from './route-outlet';
import { StorefrontRouteSkeleton } from './storefront-route-skeleton';
import { ChevronUp } from 'lucide-react';
import { MobileBottomNav } from '../components/layout/mobile-bottom-nav';

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
            className="fixed bottom-floating-2 right-4 lg:right-6 z-[90] w-11 h-11 bg-white border border-gray-200 rounded-full shadow-xl flex items-center justify-center text-gray-600 hover:text-accent hover:border-accent hover:shadow-brand transition-all active:scale-90 group"
            aria-label="Cuộn lên đầu trang"
        >
            <ChevronUp size={20} className="group-hover:-translate-y-0.5 transition-transform" />
        </button>
    );
};

export const RootLayout = () => {
    const [isCartOpen, setIsCartOpen] = useState(false);
    // Menu danh mục mobile do Header vẽ, nhưng nút "Danh mục" ở thanh dưới cũng mở nó.
    const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-accent/10 pb-mobile-nav">
            <Header
                onCartClick={() => setIsCartOpen(true)}
                mobileMenuOpen={isCategoryMenuOpen}
                onMobileMenuOpenChange={setIsCategoryMenuOpen}
            />
            <main className="animate-fade-in">
                <RouteOutlet skeleton={<StorefrontRouteSkeleton />} />
            </main>
            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            {/* Chat FAB: chỉ 1 widget toàn cục — <AiChatWidget /> đã mount ở App.tsx.
                Trước đây RootLayout còn tự mount thêm <AiChatbot />, ra 2 nút chat chồng nhau
                trên mọi trang storefront. */}
            <BackToTop />
            <MobileBottomNav
                onCategoryClick={() => setIsCategoryMenuOpen(true)}
                onCartClick={() => setIsCartOpen(true)}
                categoryMenuOpen={isCategoryMenuOpen}
            />
            <Footer />
        </div>
    );
};

import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';

import { useState } from 'react';
import { CartDrawer } from '../components/CartDrawer';
import { AiChatbot } from '../components/AiChatbot';

export const RootLayout = () => {
    const [isCartOpen, setIsCartOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-blue-500/30">
            <Header onCartClick={() => setIsCartOpen(true)} />
            <main>
                <Outlet />
            </main>
            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            <AiChatbot />
        </div>
    );
};

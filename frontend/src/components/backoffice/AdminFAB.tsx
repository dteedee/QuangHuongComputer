import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ShoppingCart, Package, Activity, Settings, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminFAB = () => {
    const [isOpen, setIsOpen] = useState(false);
    const fabRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const actions = [
        { id: 'pos', icon: ShoppingCart, label: 'Tạo đơn mới (POS)', color: 'bg-emerald-500', route: '/backoffice/pos' },
        { id: 'product', icon: Package, label: 'Quản lý sản phẩm', color: 'bg-blue-500', route: '/backoffice/products' },
        { id: 'health', icon: Activity, label: 'Sức khỏe hệ thống', color: 'bg-amber-500', route: '/backoffice/system-health' },
        { id: 'config', icon: Settings, label: 'Cấu hình chung', color: 'bg-purple-500', route: '/backoffice/config' },
    ];

    const handleActionClick = (route: string) => {
        setIsOpen(false);
        navigate(route);
    };

    return (
        <div ref={fabRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col gap-3 items-end mb-2"
                    >
                        {actions.map((action, index) => (
                            <motion.button
                                key={action.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => handleActionClick(action.route)}
                                className="flex items-center gap-3 group"
                            >
                                <span className="bg-white shadow-md text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                    {action.label}
                                </span>
                                <div className={`w-12 h-12 rounded-full text-white shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${action.color}`}>
                                    <action.icon size={20} />
                                </div>
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 ${isOpen ? 'bg-gray-800 rotate-45' : 'bg-accent hover:bg-accent-hover'}`}
                title="Tác vụ nhanh"
            >
                {isOpen ? <X size={26} /> : <Plus size={26} />}
            </button>
        </div>
    );
};

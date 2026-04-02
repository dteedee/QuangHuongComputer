import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X, Command, Search, PlusCircle, LayoutDashboard, Settings } from 'lucide-react';

export const AdminShortcutsModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Shift + ? to open help modal
            if (e.shiftKey && e.key === '?') {
                e.preventDefault();
                setIsOpen(true);
            }
            // Esc to close
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen) return null;

    const shortcutCategories = [
        {
            title: "Hệ thống chung",
            items: [
                { keys: ['Ctrl', 'K'], label: 'Mở thanh tìm kiếm toàn cầu' },
                { keys: ['Shift', '?'], label: 'Hiển thị bảng hướng dẫn này' },
                { keys: ['Esc'], label: 'Đóng các cửa sổ phụ / Modal' },
            ]
        },
        {
            title: "Điều hướng nhanh (Bên trong Tìm kiếm)",
            items: [
                { keys: ['↑', '↓'], label: 'Di chuyển lên/xuống danh sách' },
                { keys: ['Enter'], label: 'Truy cập kết quả đã chọn' },
            ]
        }
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsOpen(false)}
                    className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                    <div className="p-8 pb-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                                <Keyboard size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">Phím tắt Admin</h2>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
                                    Tăng tốc thao tác hệ thống
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-8 space-y-8">
                        {shortcutCategories.map((category, idx) => (
                            <div key={idx}>
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    {category.title}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {category.items.map((item, i) => (
                                        <div key={i} className="flex flex-col gap-2 p-4 rounded-xl border-2 border-gray-50 hover:border-accent/20 transition-colors bg-white hover:bg-gray-50/50">
                                            <div className="flex gap-1.5">
                                                {item.keys.map((k, j) => (
                                                    <span key={j} className="min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg bg-gray-100 border-2 border-gray-200 text-gray-700 text-xs font-bold font-mono shadow-sm">
                                                        {k}
                                                    </span>
                                                ))}
                                            </div>
                                            <span className="text-sm font-semibold text-gray-600 mt-1">{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            Nhấn <span className="mx-1 px-2 py-1 bg-white border-2 border-gray-200 rounded font-mono text-[10px] text-gray-600 shadow-sm">Esc</span> để thoát
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

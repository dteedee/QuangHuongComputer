import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command } from 'lucide-react';

export interface SearchItem {
    title: string;
    description?: string;
    path: string;
    group: string;
    icon: React.ReactNode;
}

interface AdminGlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
    items: SearchItem[];
    isDark: boolean;
}

export const AdminGlobalSearch = ({ isOpen, onClose, items, isDark }: AdminGlobalSearchProps) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const filteredItems = searchQuery
        ? items.filter(i =>
            i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            i.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            i.group.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : items;

    // Reset selection when search changes or opened
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery, isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setSearchQuery('');
        }
    }, [isOpen]);

    // Keyboard Navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : prev));
                scrollIntoView(selectedIndex + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
                scrollIntoView(selectedIndex - 1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredItems[selectedIndex]) {
                    handleSelect(filteredItems[selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredItems, selectedIndex, onClose]);

    const scrollIntoView = (index: number) => {
        if (!listRef.current) return;
        const items = listRef.current.children;
        if (items[index]) {
            (items[index] as HTMLElement).scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    };

    const handleSelect = (item: SearchItem) => {
        navigate(item.path);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className={`fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl rounded-2xl shadow-2xl border z-[101] overflow-hidden ${isDark
                            ? 'bg-gray-900 border-gray-800'
                            : 'bg-white border-gray-200'
                            }`}
                    >
                        {/* Search Input */}
                        <div className={`flex items-center gap-3 px-4 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                            <Search size={20} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Tìm kiếm chức năng... (VD: Sản phẩm, Đơn hàng)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`flex-1 bg-transparent border-none outline-none text-lg ${isDark
                                    ? 'text-white placeholder:text-gray-500'
                                    : 'text-gray-900 placeholder:text-gray-400'
                                    }`}
                            />
                            <kbd className={`px-2 py-1 text-xs font-bold rounded cursor-pointer ${isDark ? 'bg-gray-800 text-gray-500 hover:bg-gray-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`} onClick={onClose}>
                                ESC
                            </kbd>
                        </div>

                        {/* Search Results */}
                        <div ref={listRef} className="max-h-80 overflow-y-auto p-2 scrollbar-hide">
                            {filteredItems.length === 0 ? (
                                <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Không tìm thấy kết quả cho "{searchQuery}"
                                </div>
                            ) : (
                                filteredItems.map((item, i) => {
                                    const isSelected = i === selectedIndex;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleSelect(item)}
                                            onMouseEnter={() => setSelectedIndex(i)}
                                            className={`w-full flex items-center text-left gap-3 px-4 py-3 rounded-xl transition-colors ${
                                                isSelected 
                                                    ? (isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900') 
                                                    : (isDark ? 'text-gray-300' : 'text-gray-700')
                                            }`}
                                        >
                                            <span className={isSelected ? 'text-blue-500' : isDark ? 'text-gray-500' : 'text-gray-400'}>
                                                {item.icon}
                                            </span>
                                            <div className="flex-1">
                                                <p className="font-medium text-inherit">{item.title}</p>
                                                <p className={`text-xs ${isSelected ? (isDark ? 'text-gray-400' : 'text-gray-500') : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
                                                    {item.description}
                                                </p>
                                            </div>
                                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${
                                                isSelected 
                                                    ? (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600') 
                                                    : (isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')
                                            }`}>
                                                {item.group}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer Hints */}
                        <div className={`flex items-center justify-between px-4 py-3 border-t text-xs ${isDark
                            ? 'border-gray-800 text-gray-500'
                            : 'border-gray-100 text-gray-400'
                            }`}>
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                    <kbd className={`px-1.5 py-0.5 rounded font-bold ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>↑↓</kbd>
                                    Di chuyển
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className={`px-1.5 py-0.5 rounded font-bold ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>↵</kbd>
                                    Chọn
                                </span>
                            </div>
                            <span className="flex items-center gap-1">
                                <Command size={12} />
                                Ctrl + K
                            </span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

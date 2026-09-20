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
    /**
     * @deprecated Không còn dùng. Bảng lệnh đã chạy hoàn toàn bằng token (`bg-surface`,
     * `text-fg`, `border-line`) nên tự lật sáng/tối — xem design-guidelines §9.1 "cấm
     * `isDark ? ...`". Prop giữ lại (optional, KHÔNG đọc tới) chỉ để `layouts/BackofficeLayout.tsx`
     * — không thuộc quyền sửa của lô này — còn biên dịch được. Xoá cùng lúc với chỗ truyền vào đó.
     */
}

export const AdminGlobalSearch = ({ isOpen, onClose, items }: AdminGlobalSearchProps) => {
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
                        className="fixed inset-0 z-scrim bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Tìm nhanh chức năng"
                        className="fixed left-1/2 top-[18%] z-palette w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface shadow-xl"
                    >
                        {/* Search Input */}
                        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                            <Search size={18} className="shrink-0 text-fg-subtle" aria-hidden />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Tìm kiếm chức năng... (VD: Sản phẩm, Đơn hàng)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="min-w-0 flex-1 border-none bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle"
                            />
                            <button
                                type="button"
                                onClick={onClose}
                                className="shrink-0 rounded border border-line bg-sunken px-2 py-1 text-2xs font-semibold text-fg-muted transition-colors hover:text-fg"
                            >
                                ESC
                            </button>
                        </div>

                        {/* Search Results */}
                        <div ref={listRef} className="max-h-80 overflow-y-auto p-2 scrollbar-hide">
                            {filteredItems.length === 0 ? (
                                <p className="py-8 text-center text-13 text-fg-muted">
                                    Không tìm thấy kết quả cho &quot;{searchQuery}&quot;
                                </p>
                            ) : (
                                filteredItems.map((item, i) => {
                                    const isSelected = i === selectedIndex;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleSelect(item)}
                                            onMouseEnter={() => setSelectedIndex(i)}
                                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                                                isSelected ? 'bg-sunken text-fg' : 'text-fg-muted'
                                            }`}
                                        >
                                            <span className={`shrink-0 ${isSelected ? 'text-brand-text' : 'text-fg-subtle'}`}>
                                                {item.icon}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-13 font-medium text-inherit">{item.title}</p>
                                                <p className="truncate text-2xs text-fg-subtle">{item.description}</p>
                                            </div>
                                            <span className="shrink-0 rounded border border-line bg-sunken px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
                                                {item.group}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer Hints */}
                        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-2xs text-fg-subtle">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                    <kbd className="rounded border border-line bg-sunken px-1.5 py-0.5 font-semibold">↑↓</kbd>
                                    Di chuyển
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="rounded border border-line bg-sunken px-1.5 py-0.5 font-semibold">↵</kbd>
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

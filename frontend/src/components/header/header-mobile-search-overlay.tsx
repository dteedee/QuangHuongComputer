/**
 * Full-screen mobile search. Before this the mobile magnifier navigated to
 * `/products?q=` — a page with no search input at all, a dead end.
 */
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { HeaderSearchAutocomplete } from './header-search-autocomplete';
import type { PublicCategory } from '../../api/catalog/public-listing';

export interface HeaderMobileSearchOverlayProps {
    open: boolean;
    onClose: () => void;
    categories: PublicCategory[];
}

export const HeaderMobileSearchOverlay = ({ open, onClose, categories }: HeaderMobileSearchOverlayProps) => {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-drawer flex flex-col bg-bg md:hidden" role="dialog" aria-modal="true" aria-label="Tìm kiếm">
            <div className="flex items-start gap-2 border-b border-line p-3">
                <div className="min-w-0 flex-1">
                    <HeaderSearchAutocomplete
                        categories={categories}
                        variant="overlay"
                        autoFocus
                        onNavigate={onClose}
                    />
                </div>
                <button type="button" onClick={onClose} aria-label="Đóng tìm kiếm" className="shrink-0 p-2 text-fg-muted hover:text-fg">
                    <X size={22} aria-hidden />
                </button>
            </div>
        </div>
    );
};

export default HeaderMobileSearchOverlay;

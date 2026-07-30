import { useCallback, useEffect, useState } from 'react';

/**
 * 3 mức chữ — cỡ gốc 16px * scale.
 * Chỉ áp cho khu khách hàng; bỏ qua backoffice/admin để không phá layout bảng.
 */
export type FontSize = 'normal' | 'large' | 'x-large';

const STORAGE_KEY = 'ui.fontSize';
const DEFAULT_SIZE: FontSize = 'normal';

const PIXEL_SIZE: Record<FontSize, string> = {
    normal: '16px',
    large: '18px',
    'x-large': '20px',
};

const LABEL: Record<FontSize, string> = {
    normal: 'A',
    large: 'A+',
    'x-large': 'A++',
};

const TITLE: Record<FontSize, string> = {
    normal: 'Cỡ chữ thường (100%)',
    large: 'Cỡ chữ lớn (112%)',
    'x-large': 'Cỡ chữ rất lớn (125%)',
};

const OPTIONS: readonly FontSize[] = ['normal', 'large', 'x-large'] as const;

const isFontSize = (v: unknown): v is FontSize =>
    v === 'normal' || v === 'large' || v === 'x-large';

const readInitial = (): FontSize => {
    if (typeof window === 'undefined') return DEFAULT_SIZE;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return isFontSize(raw) ? raw : DEFAULT_SIZE;
    } catch {
        return DEFAULT_SIZE;
    }
};

/**
 * Kiểm tra có phải khu backoffice/admin không.
 * Backoffice có nhiều bảng dày → tăng cỡ chữ dễ vỡ layout.
 * Chỉ áp cho khu khách hàng.
 */
const isCustomerArea = (): boolean => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname;
    return !path.startsWith('/backoffice') && !path.startsWith('/admin');
};

const applyRootFontSize = (size: FontSize): void => {
    if (typeof document === 'undefined') return;
    if (isCustomerArea()) {
        document.documentElement.style.fontSize = PIXEL_SIZE[size];
    } else {
        // Đảm bảo trong backoffice luôn ở cỡ gốc, kể cả khi user vừa mới điều hướng vào.
        document.documentElement.style.removeProperty('font-size');
    }
};

interface FontSizeToggleProps {
    className?: string;
}

/**
 * 3 nút nhỏ: A / A+ / A++
 * Lưu chọn vào localStorage; áp ngay bằng cách đổi `html { font-size }`.
 * Khi ở backoffice/admin: giữ nguyên preference nhưng KHÔNG áp lên DOM.
 */
export const FontSizeToggle = ({ className }: FontSizeToggleProps) => {
    const [size, setSize] = useState<FontSize>(readInitial);

    // Áp lúc mount và mỗi khi size đổi.
    useEffect(() => {
        applyRootFontSize(size);
    }, [size]);

    // Nếu người dùng điều hướng vào/ra backoffice (SPA client-side routing),
    // đảm bảo lại giá trị root font-size khi URL đổi.
    useEffect(() => {
        const handler = () => applyRootFontSize(size);
        window.addEventListener('popstate', handler);
        return () => window.removeEventListener('popstate', handler);
    }, [size]);

    const onChoose = useCallback((next: FontSize) => {
        setSize(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Bỏ qua nếu bị chặn.
        }
    }, []);

    return (
        <div
            role="radiogroup"
            aria-label="Chọn cỡ chữ"
            className={'inline-flex items-center gap-1 ' + (className ?? '')}
        >
            {OPTIONS.map((opt) => {
                const active = opt === size;
                return (
                    <button
                        key={opt}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        title={TITLE[opt]}
                        onClick={() => onChoose(opt)}
                        className={[
                            'min-w-[36px] min-h-[36px] px-2 py-1 rounded-md',
                            'text-sm font-semibold leading-none',
                            'transition-colors duration-150',
                            'focus-visible:outline-none focus-visible:ring-2',
                            active
                                ? 'text-white'
                                : 'border hover:brightness-95 text-current',
                        ].join(' ')}
                        style={
                            active
                                ? { backgroundColor: 'var(--accent-primary)' }
                                : {
                                      backgroundColor: 'var(--surface-alt, #FAFAFA)',
                                      borderColor: 'var(--border, #E5E5E5)',
                                  }
                        }
                    >
                        {LABEL[opt]}
                    </button>
                );
            })}
        </div>
    );
};

export default FontSizeToggle;

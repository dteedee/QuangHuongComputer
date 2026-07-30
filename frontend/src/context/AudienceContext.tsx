import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Đối tượng mua sắm — dùng để chọn nội dung hiển thị trên trang chủ
 * và (Phase 08) sẽ dùng lọc `HomepageSection.audienceTag` phía server.
 */
export type Audience = 'personal' | 'student' | 'business';

interface AudienceContextValue {
    audience: Audience;
    setAudience: (next: Audience) => void;
}

const STORAGE_KEY = 'ui.audience';
const DEFAULT_AUDIENCE: Audience = 'personal';

const isAudience = (value: unknown): value is Audience =>
    value === 'personal' || value === 'student' || value === 'business';

const readInitialAudience = (): Audience => {
    if (typeof window === 'undefined') return DEFAULT_AUDIENCE;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return isAudience(raw) ? raw : DEFAULT_AUDIENCE;
    } catch {
        return DEFAULT_AUDIENCE;
    }
};

const AudienceContext = createContext<AudienceContextValue | undefined>(undefined);

export const AudienceProvider = ({ children }: { children: ReactNode }) => {
    const [audience, setAudienceState] = useState<Audience>(readInitialAudience);

    // Đồng bộ khi bản khác cùng origin đổi giá trị (khôn hiếm gặp nhưng rẻ).
    useEffect(() => {
        const handler = (event: StorageEvent) => {
            if (event.key !== STORAGE_KEY) return;
            if (isAudience(event.newValue)) setAudienceState(event.newValue);
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const setAudience = useCallback((next: Audience) => {
        setAudienceState(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Bỏ qua nếu localStorage bị chặn (Safari private mode, quota, ...).
        }
    }, []);

    return (
        <AudienceContext.Provider value={{ audience, setAudience }}>
            {children}
        </AudienceContext.Provider>
    );
};

export const useAudience = (): AudienceContextValue => {
    const ctx = useContext(AudienceContext);
    if (!ctx) throw new Error('useAudience must be used within an AudienceProvider');
    return ctx;
};

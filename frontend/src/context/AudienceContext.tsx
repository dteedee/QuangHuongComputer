import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { browserStorage } from '../lib/browser-storage';

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
    const raw = browserStorage.getItem(STORAGE_KEY);
    return isAudience(raw) ? raw : DEFAULT_AUDIENCE;
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
        browserStorage.setItem(STORAGE_KEY, next);
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

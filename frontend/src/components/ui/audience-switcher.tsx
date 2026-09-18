import type { CSSProperties } from 'react';
import { useAudience, type Audience } from '../../context/AudienceContext';

interface AudienceOption {
    value: Audience;
    label: string;
}

const OPTIONS: readonly AudienceOption[] = [
    { value: 'personal', label: 'Cá nhân' },
    { value: 'student', label: 'Học sinh–Sinh viên' },
    { value: 'business', label: 'Doanh nghiệp' },
] as const;

interface AudienceSwitcherProps {
    /** Cho phép override wrapper className (VD: căn trái trong Header). */
    className?: string;
}

// React chấp nhận CSS custom properties trong style object, nhưng
// `CSSProperties` không khai báo chúng. Mở rộng kiểu tại chỗ để tránh cast.
type CSSVarStyle = CSSProperties & Record<`--${string}`, string>;

// W1-12: moved off the legacy `--surface-alt/--ink-900/--border` variables (which
// carried raw hex fallbacks and never followed dark mode) onto the semantic
// tokens from styles/tokens.css. Only the ring colour still needs a style object.
const activeStyle: CSSVarStyle = {
    backgroundColor: 'rgb(var(--brand))',
    '--tw-ring-color': 'rgb(var(--brand))',
};

const inactiveStyle: CSSVarStyle = {
    backgroundColor: 'rgb(var(--surface))',
    color: 'rgb(var(--fg))',
    borderColor: 'rgb(var(--line))',
};

/**
 * Chip pill 3 lựa chọn ngữ cảnh mua sắm.
 * Không tự mount ở đâu — page/layout chủ động import + đặt vị trí.
 * Vùng bấm ≥ 44px trên mobile (min-h-[44px]).
 */
export const AudienceSwitcher = ({ className }: AudienceSwitcherProps) => {
    const { audience, setAudience } = useAudience();

    return (
        <div
            role="radiogroup"
            aria-label="Chọn đối tượng mua sắm"
            className={
                'flex flex-wrap items-center justify-center gap-2 ' +
                (className ?? '')
            }
        >
            {OPTIONS.map((option) => {
                const active = option.value === audience;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setAudience(option.value)}
                        className={[
                            'min-h-[44px] px-4 py-2 rounded-full text-sm font-medium',
                            'transition-colors duration-140',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                            active
                                ? 'text-white shadow-sm'
                                : 'border hover:brightness-95',
                        ].join(' ')}
                        style={active ? activeStyle : inactiveStyle}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
};

export default AudienceSwitcher;

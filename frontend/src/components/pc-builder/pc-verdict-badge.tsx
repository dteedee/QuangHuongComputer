/**
 * Three-state verdict badge shared by the slot list, picker drawer and
 * compatibility panel. `cannotVerify` is always amber — never green
 * (phase-57 Success Criteria: "cannotVerify is amber, never green").
 */
import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { StatusBadge, createStatusMap } from '../ui';
import type { PcVerdict } from '../../api/pcbuilder';

const verdictMap = createStatusMap<PcVerdict>({
    Compatible: ['success', 'Hợp lệ'],
    Incompatible: ['danger', 'Không tương thích'],
    CannotVerify: ['warning', 'Không thể kiểm tra'],
});

const VERDICT_ICON: Record<PcVerdict, typeof CheckCircle2> = {
    Compatible: CheckCircle2,
    Incompatible: XCircle,
    CannotVerify: HelpCircle,
};

export const PcVerdictBadge = ({ verdict }: { verdict: PcVerdict }) => {
    const Icon = VERDICT_ICON[verdict];
    const { tone, children } = verdictMap(verdict);
    return (
        <StatusBadge tone={tone}>
            <Icon size={12} className="shrink-0" aria-hidden />
            {children}
        </StatusBadge>
    );
};

export default PcVerdictBadge;

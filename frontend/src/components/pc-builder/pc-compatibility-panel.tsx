/**
 * Compatibility panel — three-state per rule (contract §3), wattage (honestly
 * `null` today per the engine's own note), running total. Never upgrades
 * `cannotVerify` to green (phase-57 Success Criteria).
 */
import { AlertTriangle } from 'lucide-react';
import { Card, CardBody, Price, Skeleton, SkeletonText } from '../ui';
import { PcVerdictBadge } from './pc-verdict-badge';
import type { PcCheckResponse } from '../../api/pcbuilder';

export interface PcCompatibilityPanelProps {
    check: PcCheckResponse | undefined;
    isPending: boolean;
    isEmpty: boolean;
}

export const PcCompatibilityPanel = ({ check, isPending, isEmpty }: PcCompatibilityPanelProps) => {
    if (isEmpty) {
        return (
            <Card>
                <CardBody className="text-sm font-medium text-fg-muted">
                    Chọn linh kiện để xem tình trạng tương thích và tổng tiền.
                </CardBody>
            </Card>
        );
    }

    if (isPending && !check) {
        return (
            <Card>
                <CardBody className="space-y-3">
                    <Skeleton className="h-6 w-32" />
                    <SkeletonText lines={3} />
                </CardBody>
            </Card>
        );
    }

    if (!check) return null;

    return (
        <Card>
            <CardBody className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-fg">Tình trạng tương thích</h3>
                    <PcVerdictBadge verdict={check.overallVerdict} />
                </div>

                {check.rules.length > 0 && (
                    <ul className="space-y-2">
                        {check.rules.map((rule) => (
                            <li key={rule.ruleId} className="flex items-start gap-2 text-sm">
                                <PcVerdictBadge verdict={rule.verdict} />
                                <div className="min-w-0">
                                    <p className="text-fg">{rule.message}</p>
                                    {rule.missingKeys && rule.missingKeys.length > 0 && (
                                        <p className="mt-0.5 text-xs text-fg-subtle">
                                            Thiếu dữ liệu: {rule.missingKeys.join('; ')}
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {check.missingRequiredSlots.length > 0 && (
                    <p className="flex items-start gap-2 text-sm text-warning">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
                        Còn thiếu: {check.missingRequiredSlots.length} vị trí bắt buộc chưa chọn.
                    </p>
                )}

                <div className="flex items-center justify-between border-t border-line pt-3">
                    <span className="text-sm text-fg-muted">Tổng tiền</span>
                    <Price value={check.totalPrice} className="text-lg font-semibold" />
                </div>

                <p className="text-xs text-fg-subtle">
                    {check.estimatedWattageW != null
                        ? `Công suất ước tính: ~${check.estimatedWattageW}W`
                        : (check.estimatedWattageNote ?? 'Chưa thể ước tính công suất tiêu thụ.')}
                </p>
            </CardBody>
        </Card>
    );
};

export default PcCompatibilityPanel;

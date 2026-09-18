/**
 * "Gợi ý theo ngân sách" (D10, binding — the word "AI" appears nowhere here).
 * Budget + use case in, a proposed build with each part's reason out, or an
 * honest `cannotSuggest` panel naming the failed constraint — never a
 * partial/invented build (contract §4).
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { pcBuilderApi, type PcSlotId, type PcSuggestResponse } from '../../api/pcbuilder';
import { Button, Card, CardBody, Input, Price, Select } from '../ui';
import { PcVerdictBadge } from './pc-verdict-badge';

const USE_CASES = [
    { value: '', label: 'Chưa xác định (mặc định)' },
    { value: 'gaming', label: 'Chơi game' },
    { value: 'vanphong', label: 'Văn phòng / học tập' },
    { value: 'do-hoa', label: 'Đồ họa / dựng phim' },
];

export interface PcBudgetSuggestPanelProps {
    onApply: (items: Array<{ slotId: PcSlotId; productId: string; name: string; sku: string; price: number }>) => void;
}

export const PcBudgetSuggestPanel = ({ onApply }: PcBudgetSuggestPanelProps) => {
    const [budget, setBudget] = useState('20000000');
    const [useCase, setUseCase] = useState('');
    const [result, setResult] = useState<PcSuggestResponse | null>(null);

    const mutation = useMutation({
        mutationFn: () => pcBuilderApi.suggest({
            budget: Number(budget) || 0,
            useCase: useCase || undefined,
        }),
        onSuccess: (data) => setResult(data),
    });

    const budgetNumber = Number(budget);
    const canSubmit = Number.isFinite(budgetNumber) && budgetNumber > 0;

    return (
        <Card>
            <CardBody className="space-y-4">
                <div className="flex items-center gap-2">
                    <Wallet size={18} className="text-brand-text" aria-hidden />
                    <h3 className="text-sm font-semibold text-fg">Gợi ý theo ngân sách</h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                        label="Ngân sách (VND)"
                        inputMode="numeric"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ''))}
                        className="min-w-0"
                    />
                    <Select
                        label="Nhu cầu sử dụng"
                        className="min-w-0"
                        options={USE_CASES}
                        value={useCase}
                        onChange={(e) => setUseCase(e.target.value)}
                    />
                </div>

                <Button
                    variant="primary"
                    loading={mutation.isPending}
                    disabled={!canSubmit}
                    onClick={() => mutation.mutate()}
                >
                    Gợi ý cấu hình
                </Button>

                {mutation.isError && (
                    <p className="text-sm text-danger">Không lấy được gợi ý. Vui lòng thử lại.</p>
                )}

                {result?.status === 'cannotSuggest' && (
                    <div className="rounded-lg border border-warning-subtle bg-warning-subtle/40 p-3 text-sm text-warning">
                        Không thể gợi ý cấu hình: {result.reason}
                    </div>
                )}

                {result?.status === 'ok' && (
                    <div className="space-y-3 rounded-lg border border-line p-3">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
                                <Price value={result.totalPrice} showDiscount={false} />
                                {!result.withinBudget && <span className="text-warning">(vượt ngân sách)</span>}
                            </span>
                            <PcVerdictBadge verdict={result.overallVerdict} />
                        </div>
                        <ul className="space-y-1 text-sm text-fg-muted">
                            {result.items.map((it) => (
                                <li key={it.productId} className="flex justify-between gap-2">
                                    <span className="truncate">{it.slotName}: {it.name}</span>
                                    <Price value={it.price} showDiscount={false} className="shrink-0" />
                                </li>
                            ))}
                        </ul>
                        <Button size="sm" variant="outline" onClick={() => onApply(result.items)}>
                            Áp dụng vào cấu hình đang chọn
                        </Button>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default PcBudgetSuggestPanel;

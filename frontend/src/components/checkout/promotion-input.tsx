import { useEffect, useState } from 'react';
import { Tag, Loader2, X, CheckCircle2, Gift } from 'lucide-react';
import { promotionApi, type AppliedPromotion, type Promotion } from '../../api/promotion';
import { formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';

interface PromotionInputProps {
    /** Mã đang áp — do CheckoutPage giữ để persist. Null = chưa áp. */
    appliedCode: string | null;
    onCodeChange: (code: string | null) => void;
    applied: AppliedPromotion[];
    loading: boolean;
}

export function PromotionInput({ appliedCode, onCodeChange, applied, loading }: PromotionInputProps) {
    const [input, setInput] = useState('');
    const [available, setAvailable] = useState<Promotion[]>([]);
    const [loadingList, setLoadingList] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [nextAllowedAt, setNextAllowedAt] = useState<number>(0);

    useEffect(() => {
        setLoadingList(true);
        promotionApi.getAvailable()
            .then(setAvailable)
            .catch(() => setAvailable([]))
            .finally(() => setLoadingList(false));
    }, []);

    const canTry = Date.now() >= nextAllowedAt;

    const submit = () => {
        const code = input.trim().toUpperCase();
        if (!code) return;
        if (!canTry) {
            toast.error('Bạn thử quá nhanh, chờ chút rồi thử lại.');
            return;
        }
        // Rate limit đơn giản client-side: 5 lần / phút.
        const next = attempts + 1;
        setAttempts(next);
        if (next >= 5) {
            setNextAllowedAt(Date.now() + 60_000);
            setTimeout(() => { setAttempts(0); setNextAllowedAt(0); }, 60_000);
        }
        onCodeChange(code);
        setInput('');
    };

    const autoApplied = applied.filter(p => p.isAutomatic);
    const manualApplied = applied.filter(p => !p.isAutomatic);

    return (
        <div className="space-y-4">
            {/* Auto promotions */}
            {autoApplied.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Gift className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-semibold text-emerald-800">Khuyến mãi tự động</span>
                    </div>
                    <ul className="space-y-1.5">
                        {autoApplied.map(p => (
                            <li key={p.id} className="flex justify-between items-center text-sm">
                                <span className="text-gray-800">{p.name}</span>
                                <span className="font-bold text-emerald-700">-{formatCurrency(p.discountAmount)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Manual coupon */}
            <div className="bg-orange-50/60 rounded-xl border border-orange-100/70 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-semibold text-orange-900">Mã giảm giá</span>
                </div>
                {appliedCode && manualApplied.length > 0 ? (
                    <div className="space-y-2">
                        {manualApplied.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-emerald-200">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span className="font-bold text-emerald-700 uppercase text-sm">{p.code ?? appliedCode}</span>
                                    <span className="text-xs text-gray-500">-{formatCurrency(p.discountAmount)}</span>
                                </div>
                                <button type="button" onClick={() => onCodeChange(null)} className="text-red-500 hover:text-red-700 p-1">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input
                            type="text" value={input} onChange={e => setInput(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === 'Enter' && submit()}
                            placeholder="Nhập mã"
                            disabled={loading}
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary,#dc2626)] font-medium uppercase disabled:opacity-50"
                        />
                        <button type="button" onClick={submit} disabled={!input.trim() || loading || !canTry}
                            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            Áp dụng
                        </button>
                    </div>
                )}
                {appliedCode && manualApplied.length === 0 && !loading && (
                    <p className="text-xs text-amber-700 mt-2">Mã <b>{appliedCode}</b> không dùng được với giỏ hiện tại.</p>
                )}
            </div>

            {/* Available list */}
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Mã bạn có thể dùng
                </p>
                {loadingList ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                    </div>
                ) : available.length === 0 ? (
                    <p className="text-sm text-gray-400">Không có mã nào phù hợp với giỏ hiện tại.</p>
                ) : (
                    <div className="space-y-2">
                        {available.filter(p => p.code).map(p => (
                            <button key={p.id} type="button" onClick={() => onCodeChange(p.code ?? null)}
                                className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-[var(--accent-primary,#dc2626)] hover:bg-red-50/30 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-[var(--accent-primary,#dc2626)] text-sm uppercase">{p.code}</span>
                                        <span className="text-xs text-gray-500">{p.name}</span>
                                    </div>
                                    <span className="text-xs text-blue-600 font-semibold">Áp dụng</span>
                                </div>
                                {p.description && <p className="text-[11px] text-gray-400 mt-1">{p.description}</p>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PromotionInput;

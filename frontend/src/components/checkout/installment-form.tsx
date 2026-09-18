import { useEffect, useState } from 'react';
import { Loader2, Calculator } from 'lucide-react';
import { installmentApi, type InstallmentProvider, type InstallmentCalculationResponse } from '../../api/installment';
import { formatCurrency } from '../../utils/format';

/**
 * [W1-9 / D10] `installmentApi.uploadDocument` + the CMND/CCCD upload UI that
 * used to live here were removed (D10 rule 6, Luật 91/2025: hồ sơ trả góp
 * không thu CCCD qua web — làm tại quầy/cổng CTTC). This left `idFrontFileId`
 * / `idBackFileId` as inert pass-through props (still accepted so
 * `use-checkout-submit.ts` compiles unchanged; they are always `undefined`
 * now). Integration request filed for W3-2 (owns this file): replace the old
 * upload block below with the D10-mandated consent checkbox ("cho phép cửa
 * hàng liên hệ và chuyển thông tin cho công ty tài chính đã chọn") — see
 * `reports/integration-requests-w1.md`.
 */
interface InstallmentFormProps {
    totalAmount: number;
    providerCode?: string;
    term?: 6 | 9 | 12;
    idFrontFileId?: string;
    idBackFileId?: string;
    onChange: (patch: {
        installmentProviderCode?: string;
        installmentTerm?: 6 | 9 | 12;
        installmentDownPayment?: number;
        installmentMonthly?: number;
        installmentIdFrontFileId?: string;
        installmentIdBackFileId?: string;
    }) => void;
}

const TERMS: Array<6 | 9 | 12> = [6, 9, 12];

export function InstallmentForm({ totalAmount, providerCode, term, onChange }: InstallmentFormProps) {
    const [providers, setProviders] = useState<InstallmentProvider[]>([]);
    const [loadingProviders, setLoadingProviders] = useState(true);
    const [calc, setCalc] = useState<InstallmentCalculationResponse | null>(null);
    const [calculating, setCalculating] = useState(false);

    useEffect(() => {
        setLoadingProviders(true);
        installmentApi.getProviders()
            .then(setProviders)
            .catch(() => setProviders([]))
            .finally(() => setLoadingProviders(false));
    }, []);

    useEffect(() => {
        if (!providerCode || !term || totalAmount <= 0) return;
        const provider = providers.find(p => p.code === providerCode);
        if (!provider) return;

        setCalculating(true);
        installmentApi.calculate({
            totalAmount,
            termMonths: term,
            downPaymentPercent: provider.minDownPaymentPercent,
            annualInterestRate: provider.annualInterestRate,
            processingFee: provider.processingFeePercent,
            monthlyCollectionFee: provider.monthlyCollectionFee,
        }).then(res => {
            setCalc(res);
            onChange({
                installmentDownPayment: res.downPaymentAmount,
                installmentMonthly: res.monthlyPayment,
            });
        }).catch(() => setCalc(null))
            .finally(() => setCalculating(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [providerCode, term, totalAmount, providers]);

    return (
        <div className="mt-4 bg-blue-50/50 border border-blue-100 rounded-xl p-5 space-y-4">
            <h4 className="font-bold text-blue-900 text-sm">Hồ sơ trả góp</h4>

            {/* Provider */}
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Đối tác trả góp *</label>
                {loadingProviders ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải...</div>
                ) : (
                    <select value={providerCode ?? ''} onChange={e => onChange({ installmentProviderCode: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium bg-white">
                        <option value="">-- Chọn đối tác --</option>
                        {providers.map(p => (
                            <option key={p.code} value={p.code}>
                                {p.name} {p.isZeroPercent ? '(Lãi 0%)' : `— ${(p.annualInterestRate * 100).toFixed(1)}%/năm`}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Terms */}
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Kỳ hạn *</label>
                <div className="flex gap-2">
                    {TERMS.map(t => (
                        <button key={t} type="button" onClick={() => onChange({ installmentTerm: t })}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-all ${
                                term === t ? 'border-[var(--accent-primary,#dc2626)] bg-white text-[var(--accent-primary,#dc2626)]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}>
                            {t} tháng
                        </button>
                    ))}
                </div>
            </div>

            {/* Calculation */}
            {calculating ? (
                <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Đang tính...</div>
            ) : calc ? (
                <div className="bg-white rounded-lg p-3 border border-blue-100 space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-blue-800 font-semibold mb-2">
                        <Calculator className="w-4 h-4" /> Ước tính
                    </div>
                    <div className="flex justify-between"><span className="text-gray-500">Trả trước</span><span className="font-semibold">{formatCurrency(calc.downPaymentAmount)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Trả hàng tháng</span><span className="font-bold text-[var(--accent-primary,#dc2626)]">{formatCurrency(calc.monthlyPayment)} / tháng</span></div>
                    <div className="flex justify-between text-xs text-gray-400"><span>Tổng phải trả</span><span>{formatCurrency(calc.totalPayment)}</span></div>
                </div>
            ) : null}

            {/* TODO (W3-2, D10 rule 6): consent checkbox — "Tôi đồng ý cho Quang Hưởng
                liên hệ và chuyển thông tin cho công ty tài chính đã chọn để làm hồ sơ
                trả góp" — replaces the old CMND/CCCD upload UI removed here (W1-9). */}

            <p className="text-[11px] text-gray-500">
                Hồ sơ trả góp được hoàn tất tại quầy hoặc qua cổng của công ty tài chính — không thu CMND/CCCD qua website.
                Đơn sẽ ở trạng thái <b>chờ duyệt</b> tới khi bộ phận tài chính xử lý.
            </p>
        </div>
    );
}

export default InstallmentForm;

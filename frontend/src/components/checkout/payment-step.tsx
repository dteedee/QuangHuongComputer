import { motion } from 'framer-motion';
import { CreditCard, Truck, QrCode, Smartphone, Wallet, Calendar, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import type { PaymentMethod, PaymentFormState, VnpayBankKind } from './checkout-types';
import InstallmentForm from './installment-form';

interface PaymentStepProps {
    value: PaymentFormState;
    onChange: (patch: Partial<PaymentFormState>) => void;
    onBack: () => void;
    onSubmit: () => void;
    submitting: boolean;
    totalAmount: number;
}

interface Method {
    id: PaymentMethod;
    title: string;
    desc: string;
    icon: typeof CreditCard;
    feeNote?: string;
}

const METHODS: Method[] = [
    { id: 'cod', title: 'Thanh toán khi nhận hàng (COD)', desc: 'Tiền mặt khi shipper giao tới', icon: Truck, feeNote: 'Miễn phí' },
    { id: 'bank_transfer', title: 'QR chuyển khoản (SePay)', desc: 'Tự động khớp trong 30 giây', icon: QrCode, feeNote: 'Không phí' },
    { id: 'vnpay', title: 'VNPay', desc: 'Thẻ ATM/Visa/Master/JCB — chọn loại bên dưới', icon: CreditCard },
    { id: 'momo', title: 'Ví MoMo', desc: 'Thanh toán qua app MoMo', icon: Smartphone },
    { id: 'zalopay', title: 'ZaloPay', desc: 'Thanh toán qua app ZaloPay', icon: Wallet },
    { id: 'installment', title: 'Trả góp', desc: 'Kỳ hạn 6/9/12 tháng, hồ sơ đơn giản', icon: Calendar },
];

const VNPAY_BANKS: Array<{ v: VnpayBankKind; label: string; desc: string }> = [
    { v: 'domestic', label: 'ATM nội địa', desc: 'Napas, thẻ ATM Việt Nam' },
    { v: 'international', label: 'Thẻ quốc tế', desc: 'Visa / Master / JCB' },
    { v: 'atm', label: 'QR VNPay', desc: 'App ngân hàng quét mã' },
];

export function PaymentStep({ value, onChange, onBack, onSubmit, submitting, totalAmount }: PaymentStepProps) {
    return (
        <motion.div key="pay" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[var(--accent-primary,#dc2626)]">
                    <CreditCard className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Thanh toán</h2>
                    <p className="text-gray-500 text-xs">Chọn phương thức tiện lợi nhất cho bạn</p>
                </div>
            </div>

            <div className="space-y-3 mb-6">
                {METHODS.map(m => {
                    const active = value.paymentMethod === m.id;
                    const Icon = m.icon;
                    return (
                        <label key={m.id}
                            className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                active ? 'border-[var(--accent-primary,#dc2626)] bg-red-50/50' : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <input type="radio" name="pm" checked={active} onChange={() => onChange({ paymentMethod: m.id })} className="hidden" />
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 ${
                                active ? 'bg-[var(--accent-primary,#dc2626)] text-white' : 'bg-gray-100 text-gray-400'
                            }`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className={`font-semibold text-sm ${active ? 'text-gray-900' : 'text-gray-700'}`}>{m.title}</p>
                                <p className="text-xs text-gray-400">{m.desc}</p>
                            </div>
                            {m.feeNote && <span className="text-xs font-semibold text-emerald-600 mr-3">{m.feeNote}</span>}
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                active ? 'border-[var(--accent-primary,#dc2626)]' : 'border-gray-200'
                            }`}>
                                {active && <div className="w-2.5 h-2.5 bg-[var(--accent-primary,#dc2626)] rounded-full" />}
                            </div>
                        </label>
                    );
                })}
            </div>

            {value.paymentMethod === 'vnpay' && (
                <div className="mb-6 grid grid-cols-3 gap-2">
                    {VNPAY_BANKS.map(b => (
                        <button key={b.v} type="button" onClick={() => onChange({ vnpayBank: b.v })}
                            className={`p-3 rounded-lg text-left border-2 transition-all ${
                                value.vnpayBank === b.v ? 'border-[var(--accent-primary,#dc2626)] bg-red-50/40' : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <p className="text-sm font-bold text-gray-900">{b.label}</p>
                            <p className="text-[11px] text-gray-500">{b.desc}</p>
                        </button>
                    ))}
                </div>
            )}

            {value.paymentMethod === 'installment' && (
                <InstallmentForm
                    totalAmount={totalAmount}
                    providerCode={value.installmentProviderCode}
                    term={value.installmentTerm}
                    idFrontFileId={value.installmentIdFrontFileId}
                    idBackFileId={value.installmentIdBackFileId}
                    onChange={onChange}
                />
            )}

            <div className="flex gap-3 mt-6">
                <button type="button" onClick={onBack} disabled={submitting}
                    className="flex-1 py-3.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 inline-flex items-center justify-center gap-2 disabled:opacity-50">
                    <ArrowLeft className="w-4 h-4" /> Quay lại
                </button>
                <button type="button" onClick={onSubmit} disabled={submitting}
                    className={`flex-[2] py-3.5 bg-[var(--accent-primary,#dc2626)] hover:brightness-95 text-white rounded-xl font-semibold inline-flex items-center justify-center gap-2 ${
                        submitting ? 'opacity-70 cursor-not-allowed' : ''
                    }`}>
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-5 h-5" />Đặt hàng</>}
                </button>
            </div>
        </motion.div>
    );
}

export default PaymentStep;

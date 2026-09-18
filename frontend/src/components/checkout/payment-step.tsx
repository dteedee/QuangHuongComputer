import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { CreditCard, Truck, QrCode, Smartphone, ArrowLeft, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import type { PaymentMethod, PaymentFormState, VnpayBankKind } from './checkout-types';
import { usePaymentMethods } from './use-payment-methods';

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

// D04 (binding, xem decisions/D04): KHÔNG hardcode danh sách hiện cho khách — chỉ hiện phương
// thức nằm trong GET /payments/methods (usePaymentMethods, chỉ COD khi lỗi/404). Bảng này chỉ
// là metadata hiển thị (icon/tên/mô tả) cho các mã đã BIẾT, không tự ý bật phương thức nào.
// ZaloPay + trả góp bị loại khỏi bảng theo D04 (ZaloPay xoá khỏi luồng thanh toán; trả góp =
// lead-mode D10, ẩn hẳn ở W0). Không nhắc "SePay" với khách (D04 mục 2, tầng 1: "khách không
// thấy chữ SePay") — chỉ mô tả bằng tên phương thức chuyển khoản.
const METHOD_CATALOG: Record<string, Method> = {
    cod: { id: 'cod', title: 'Thanh toán khi nhận hàng (COD)', desc: 'Tiền mặt khi shipper giao tới', icon: Truck, feeNote: 'Miễn phí' },
    bank_transfer: { id: 'bank_transfer', title: 'Chuyển khoản ngân hàng (QR VietQR)', desc: 'Quét mã, tự động khớp sau khi ngân hàng báo có', icon: QrCode, feeNote: 'Không phí' },
    vnpay: { id: 'vnpay', title: 'VNPay', desc: 'Thẻ ATM/Visa/Master/JCB — chọn loại bên dưới', icon: CreditCard },
    momo: { id: 'momo', title: 'Ví MoMo', desc: 'Thanh toán qua app MoMo', icon: Smartphone },
};

const VNPAY_BANKS: Array<{ v: VnpayBankKind; label: string; desc: string }> = [
    { v: 'domestic', label: 'ATM nội địa', desc: 'Napas, thẻ ATM Việt Nam' },
    { v: 'international', label: 'Thẻ quốc tế', desc: 'Visa / Master / JCB' },
    { v: 'atm', label: 'QR VNPay', desc: 'App ngân hàng quét mã' },
];

export function PaymentStep({ value, onChange, onBack, onSubmit, submitting }: PaymentStepProps) {
    const availableMethods = usePaymentMethods();
    const methods = availableMethods.map(id => METHOD_CATALOG[id]).filter((m): m is Method => Boolean(m));
    const isSelectedAvailable = availableMethods.includes(value.paymentMethod);

    // Danh sách khả dụng đổi (ví dụ: đã chọn VNPay lúc trước, giờ tải lại /methods không còn
    // VNPay nữa vì backend chưa cấu hình khoá) → tự chuyển về phương thức đầu tiên còn khả dụng
    // thay vì để khách bấm "Đặt hàng" với một lựa chọn đã biến mất khỏi danh sách.
    useEffect(() => {
        if (!isSelectedAvailable && availableMethods.length > 0) {
            onChange({ paymentMethod: availableMethods[0] });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSelectedAvailable, availableMethods.join(',')]);

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
                {methods.map(m => {
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

            {!isSelectedAvailable && (
                <div className="mb-6 flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Phương thức đã chọn hiện không khả dụng, vui lòng chọn phương thức khác bên trên.
                </div>
            )}

            <div className="flex gap-3 mt-6">
                <button type="button" onClick={onBack} disabled={submitting}
                    className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold whitespace-nowrap hover:bg-gray-50 inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
                    <ArrowLeft className="w-[18px] h-[18px]" /> Quay lại
                </button>
                <button type="button" onClick={onSubmit} disabled={submitting || !isSelectedAvailable}
                    className={`flex-[2] py-3 bg-[var(--accent-primary,#dc2626)] hover:brightness-95 text-white rounded-xl text-sm font-semibold whitespace-nowrap inline-flex items-center justify-center gap-1.5 ${
                        submitting || !isSelectedAvailable ? 'opacity-70 cursor-not-allowed' : ''
                    }`}>
                    {submitting ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <><ShieldCheck className="w-[18px] h-[18px]" />Đặt hàng</>}
                </button>
            </div>
        </motion.div>
    );
}

export default PaymentStep;

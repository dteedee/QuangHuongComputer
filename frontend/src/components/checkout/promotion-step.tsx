import { motion } from 'framer-motion';
import { Tag, ArrowRight, ArrowLeft } from 'lucide-react';
import PromotionInput from './promotion-input';
import type { AppliedPromotion } from '../../api/promotion';

interface PromotionStepProps {
    appliedCode: string | null;
    onCodeChange: (code: string | null) => void;
    applied: AppliedPromotion[];
    loading: boolean;
    onNext: () => void;
    onBack: () => void;
}

export function PromotionStep({ appliedCode, onCodeChange, applied, loading, onNext, onBack }: PromotionStepProps) {
    return (
        <motion.div key="promo" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                    <Tag className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Khuyến mãi</h2>
                    <p className="text-gray-500 text-xs">Áp mã & xem ưu đãi tự động cho đơn của bạn</p>
                </div>
            </div>

            <PromotionInput
                appliedCode={appliedCode}
                onCodeChange={onCodeChange}
                applied={applied}
                loading={loading}
            />

            <div className="flex gap-3 mt-6">
                <button type="button" onClick={onBack}
                    className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold whitespace-nowrap hover:bg-gray-50 inline-flex items-center justify-center gap-1.5">
                    <ArrowLeft className="w-[18px] h-[18px]" /> Quay lại
                </button>
                <button type="button" onClick={onNext}
                    className="flex-[2] py-3 bg-[var(--accent-primary,#dc2626)] hover:brightness-95 text-white rounded-xl text-sm font-semibold whitespace-nowrap inline-flex items-center justify-center gap-1.5">
                    Tiếp tục — thanh toán <ArrowRight className="w-[18px] h-[18px]" />
                </button>
            </div>
        </motion.div>
    );
}

export default PromotionStep;

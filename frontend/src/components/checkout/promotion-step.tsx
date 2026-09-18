import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Tag } from 'lucide-react';
import { Button, Card, CardBody } from '../ui';
import PromotionInput from './promotion-input';
import type { AppliedPromotion } from '../../api/promotion';
import { fadeUp } from '../../design-system/motion';

interface PromotionStepProps {
    appliedCode: string | null;
    onCodeChange: (code: string | null) => void;
    applied: AppliedPromotion[];
    loading: boolean;
    /** Lý do server từ chối mã. Còn lỗi thì KHÔNG cho đi tiếp. */
    error: string | null;
    onNext: () => void;
    onBack: () => void;
}

export function PromotionStep({
    appliedCode, onCodeChange, applied, loading, error, onNext, onBack,
}: PromotionStepProps) {
    // Mã sai chặn "Tiếp tục"; không có mã nào thì vẫn đi tiếp bình thường.
    const blocked = Boolean(appliedCode && error);

    return (
        <motion.div variants={fadeUp} initial="hidden" animate="show" exit="hidden">
            <Card>
                <CardBody className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-subtle text-warning">
                            <Tag className="h-5 w-5" aria-hidden />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-fg">Khuyến mãi</h2>
                            <p className="text-13 text-fg-muted">Áp mã giảm giá và xem ưu đãi tự động cho đơn của bạn</p>
                        </div>
                    </div>

                    <PromotionInput appliedCode={appliedCode} onCodeChange={onCodeChange}
                        applied={applied} loading={loading} />

                    {error && (
                        <p role="alert" className="rounded-lg bg-danger-subtle px-3 py-2 text-13 text-danger">
                            {error}
                        </p>
                    )}

                    <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                            <ArrowLeft className="h-[18px] w-[18px]" /> Quay lại
                        </Button>
                        <Button type="button" onClick={onNext} className="flex-[2]" disabled={blocked || loading}>
                            Tiếp tục — thanh toán <ArrowRight className="h-[18px] w-[18px]" />
                        </Button>
                    </div>
                </CardBody>
            </Card>
        </motion.div>
    );
}

export default PromotionStep;

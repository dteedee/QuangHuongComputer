import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { salesApi } from '../api/sales';
import { promotionApi, type AppliedPromotion, type EvaluatePromotionResponse } from '../api/promotion';
import CheckoutOrderSummary from '../components/checkout/checkout-order-summary';
import CheckoutStepper from '../components/checkout/checkout-stepper';
import CheckoutSessionTimer from '../components/checkout/checkout-session-timer';
import ShippingStep from '../components/checkout/shipping-step';
import PromotionStep from '../components/checkout/promotion-step';
import PaymentStep from '../components/checkout/payment-step';
import OrderConfirmation from '../components/checkout/order-confirmation';
import { useCheckoutSubmit, type ConfirmedOrder } from '../components/checkout/use-checkout-submit';
import {
    CHECKOUT_STORAGE_KEY, initialPaymentState, initialShippingState,
    type CheckoutPersistedState, type CheckoutStep, type PaymentFormState, type ShippingFormState,
} from '../components/checkout/checkout-types';

function loadPersisted(): Partial<CheckoutPersistedState> {
    try {
        const raw = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
        return raw ? JSON.parse(raw) as Partial<CheckoutPersistedState> : {};
    } catch { return {}; }
}

export function CheckoutPage() {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const { items, subtotal, discountAmount, shippingAmount, total, clearCart } = useCart();
    const { submit, submitting } = useCheckoutSubmit();

    const persisted = useRef(loadPersisted());
    const [step, setStep] = useState<CheckoutStep>(persisted.current.step ?? 1);
    const [shipping, setShipping] = useState<ShippingFormState>({ ...initialShippingState, ...persisted.current.shipping });
    const [payment, setPayment] = useState<PaymentFormState>({ ...initialPaymentState, ...persisted.current.payment });
    const [promotionCode, setPromotionCode] = useState<string | null>(persisted.current.promotionCode ?? null);
    const [ghnDistrictId, setGhnDistrictId] = useState<number>(persisted.current.ghnDistrictId ?? 0);
    const [ghnWardCode, setGhnWardCode] = useState<string>(persisted.current.ghnWardCode ?? '');
    const [calculatedShippingFee, setCalculatedShippingFee] = useState<number>(persisted.current.calculatedShippingFee ?? 0);
    const [sessionId, setSessionId] = useState<string | undefined>(persisted.current.sessionId);
    const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(persisted.current.sessionExpiresAt ?? null);
    const [extended, setExtended] = useState(false);
    const [evaluated, setEvaluated] = useState<EvaluatePromotionResponse | null>(null);
    const [evaluating, setEvaluating] = useState(false);
    const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(null);

    // Persist mỗi khi state đổi
    useEffect(() => {
        const s: CheckoutPersistedState = {
            step, shipping, payment, promotionCode, sessionId, sessionExpiresAt: sessionExpiresAt ?? undefined,
            calculatedShippingFee, ghnDistrictId, ghnWardCode,
        };
        try { sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
    }, [step, shipping, payment, promotionCode, sessionId, sessionExpiresAt, calculatedShippingFee, ghnDistrictId, ghnWardCode]);

    useEffect(() => { if (step === 4) sessionStorage.removeItem(CHECKOUT_STORAGE_KEY); }, [step]);

    // Redirect nếu giỏ rỗng
    if (items.length === 0 && step !== 4) { navigate('/cart'); return null; }

    // Evaluate promotion (debounce 300ms) — tránh spam evaluate khi user gõ mã
    useEffect(() => {
        if (items.length === 0) return;
        setEvaluating(true);
        const handle = window.setTimeout(async () => {
            try {
                const res = await promotionApi.evaluate({
                    items: items.map(i => ({ productId: i.id, variantId: i.variantId, quantity: i.quantity, unitPrice: i.price })),
                    couponCode: promotionCode ?? undefined, customerId: user?.id,
                    shippingAmount: calculatedShippingFee || shippingAmount,
                });
                setEvaluated(res);
            } catch { setEvaluated(null); }
            finally { setEvaluating(false); }
        }, 300);
        return () => window.clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, promotionCode, user?.id, calculatedShippingFee]);

    // Tạo CheckoutSession khi vào bước 3 lần đầu
    useEffect(() => {
        if (step !== 3 || sessionId || items.length === 0) return;
        salesApi.checkoutSession.create({
            items: items.map(i => ({ productId: i.id, quantity: i.quantity, variantId: i.variantId })),
        }).then(s => { setSessionId(s.id); setSessionExpiresAt(s.expiresAt); })
            .catch(() => { /* backend chưa expose session — không chặn user */ });
    }, [step, sessionId, items]);

    const handleExpired = useCallback(() => {
        if (submitting) return;
        toast.error('Phiên giữ chỗ đã hết. Bấm gia hạn hoặc quay lại giỏ hàng.');
    }, [submitting]);

    const handleExtend = async () => {
        if (!sessionId || extended) return;
        try {
            const s = await salesApi.checkoutSession.extend(sessionId);
            setSessionExpiresAt(s.expiresAt); setExtended(true);
            toast.success('Đã gia hạn thêm 15 phút.');
        } catch { toast.error('Không gia hạn được, vui lòng thử lại.'); }
    };

    const displayTotal = evaluated?.finalTotal ?? total;
    const displayDiscount = (evaluated?.discountTotal ?? discountAmount) + (evaluated?.shippingDiscount ?? 0);
    const displayShipping = Math.max(0, (shipping.deliveryMethod === 'pickup' ? 0 : (calculatedShippingFee || shippingAmount)) - (evaluated?.shippingDiscount ?? 0));
    const applied: AppliedPromotion[] = evaluated?.appliedPromotions ?? [];

    const handleSubmit = async () => {
        const result = await submit({
            items, shipping, payment, promotionCode, calculatedShippingFee,
            shippingAmountFallback: shippingAmount, sessionId,
            user, isAuthenticated, clearCart,
        });
        if (result) { setConfirmedOrder(result); setStep(4); window.scrollTo(0, 0); }
    };

    const summaryItems = useMemo(() => items.map(i => ({
        id: i.id, name: i.name + (i.variantName ? ` (${i.variantName})` : ''),
        price: i.price, quantity: i.quantity, imageUrl: i.imageUrl,
    })), [items]);

    return (
        <div className="min-h-screen bg-gray-50 py-10 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <button onClick={() => step > 1 && step < 4 ? setStep((step - 1) as CheckoutStep) : navigate('/cart')}
                            className="flex items-center gap-2 text-gray-500 hover:text-[var(--accent-primary,#dc2626)] mb-1 text-sm font-medium">
                            <ArrowLeft className="w-4 h-4" />{step > 1 && step < 4 ? 'Quay lại bước trước' : 'Về giỏ hàng'}
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Thanh toán <span className="text-[var(--accent-primary,#dc2626)]">đơn hàng</span>
                        </h1>
                    </div>
                    <CheckoutStepper current={step} />
                </div>

                {step >= 3 && step < 4 && (
                    <CheckoutSessionTimer expiresAt={sessionExpiresAt} onExpired={handleExpired}
                        onExtend={handleExtend} canExtend={!extended} />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <ShippingStep isAuthenticated={isAuthenticated} value={shipping}
                                    onChange={p => setShipping(prev => ({ ...prev, ...p }))}
                                    onNext={() => { setStep(2); window.scrollTo(0, 0); }}
                                    onLogin={() => navigate('/login', { state: { from: '/checkout' } })}
                                    onShippingFee={setCalculatedShippingFee}
                                    ghnDistrictId={ghnDistrictId} ghnWardCode={ghnWardCode}
                                    onGhnChange={(d, w) => { setGhnDistrictId(d); setGhnWardCode(w); }} />
                            )}
                            {step === 2 && (
                                <PromotionStep appliedCode={promotionCode} onCodeChange={setPromotionCode}
                                    applied={applied} loading={evaluating}
                                    onNext={() => { setStep(3); window.scrollTo(0, 0); }} onBack={() => setStep(1)} />
                            )}
                            {step === 3 && (
                                <PaymentStep value={payment}
                                    onChange={p => setPayment(prev => ({ ...prev, ...p }))}
                                    onBack={() => setStep(2)} onSubmit={handleSubmit}
                                    submitting={submitting} totalAmount={displayTotal} />
                            )}
                            {step === 4 && confirmedOrder && (
                                <OrderConfirmation orderId={confirmedOrder.id} orderNumber={confirmedOrder.number}
                                    totalAmount={confirmedOrder.amount} paymentMethod={payment.paymentMethod}
                                    guestEmail={!isAuthenticated ? shipping.email : undefined}
                                    qrPaymentUrl={confirmedOrder.qrUrl} isGuest={!isAuthenticated} />
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="lg:col-span-2">
                        <CheckoutOrderSummary items={summaryItems} subtotal={subtotal}
                            tax={evaluated ? Math.max(0, displayTotal - subtotal + displayDiscount - displayShipping) : 0}
                            total={displayTotal} discountAmount={displayDiscount} shippingAmount={displayShipping} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CheckoutPage;

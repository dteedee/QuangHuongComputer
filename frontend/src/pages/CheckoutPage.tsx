import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { salesCartCheckoutApi, type ShippingQuoteDto } from '../api/sales/cart-checkout';
import { promotionApi, type AppliedPromotion, type EvaluatePromotionResponse } from '../api/promotion';
import { normalizeApiError } from '../lib/api-error';
import { sessionBrowserStorage } from '../lib/browser-storage';
import { ROUTES } from '../routes/route-paths';
import { notify } from '../components/ui';
import CheckoutOrderSummary from '../components/checkout/checkout-order-summary';
import CheckoutStepper from '../components/checkout/checkout-stepper';
import CheckoutSessionTimer from '../components/checkout/checkout-session-timer';
import ShippingStep from '../components/checkout/shipping-step';
import PromotionStep from '../components/checkout/promotion-step';
import PaymentStep from '../components/checkout/payment-step';
import ReviewConsentStep from '../components/checkout/review-consent-step';
import { useCheckoutSubmit } from '../components/checkout/use-checkout-submit';
import { buildCheckoutSuccessUrl } from '../components/checkout/checkout-success-url';
import {
    CHECKOUT_STORAGE_KEY, initialInvoiceState, initialPaymentState, initialShippingState,
    type CheckoutPersistedState, type CheckoutStep, type InvoiceFormState, type PaymentFormState,
    type ShippingFormState,
} from '../components/checkout/checkout-types';

function loadPersisted(): Partial<CheckoutPersistedState> {
    return sessionBrowserStorage.getJSON<Partial<CheckoutPersistedState>>(CHECKOUT_STORAGE_KEY, {});
}

export function CheckoutPage() {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const {
        items, cartId, subtotal, discountAmount, shippingAmount, tax, vatBreakdown, clearCart, isReady,
    } = useCart();
    const { submit, submitting } = useCheckoutSubmit();

    const persisted = useRef(loadPersisted());
    const [step, setStep] = useState<CheckoutStep>(persisted.current.step ?? 1);
    const [shipping, setShipping] = useState<ShippingFormState>({ ...initialShippingState, ...persisted.current.shipping });
    const [payment, setPayment] = useState<PaymentFormState>({ ...initialPaymentState, ...persisted.current.payment });
    const [invoice, setInvoice] = useState<InvoiceFormState>({ ...initialInvoiceState, ...persisted.current.invoice });
    const [promotionCode, setPromotionCode] = useState<string | null>(persisted.current.promotionCode ?? null);
    const [quote, setQuote] = useState<ShippingQuoteDto | null>(null);
    const [sessionId, setSessionId] = useState<string | undefined>(persisted.current.sessionId);
    const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(persisted.current.sessionExpiresAt ?? null);
    const [extended, setExtended] = useState(false);
    const [evaluated, setEvaluated] = useState<EvaluatePromotionResponse | null>(null);
    const [evaluating, setEvaluating] = useState(false);
    const [promotionError, setPromotionError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);

    // Điền sẵn từ hồ sơ khách đã đăng nhập (chỉ khi ô còn trống, không ghi đè khách đã gõ).
    useEffect(() => {
        if (!user) return;
        setShipping(prev => ({
            ...prev,
            fullName: prev.fullName || user.fullName || '',
            email: prev.email || user.email || '',
        }));
    }, [user]);

    useEffect(() => {
        const s: CheckoutPersistedState = {
            step, shipping, payment, invoice, promotionCode, sessionId,
            sessionExpiresAt: sessionExpiresAt ?? undefined,
            quotedShippingFee: quote?.fee ?? 0,
        };
        sessionBrowserStorage.setJSON(CHECKOUT_STORAGE_KEY, s);
    }, [step, shipping, payment, invoice, promotionCode, sessionId, sessionExpiresAt, quote]);

    // Giỏ rỗng → về giỏ hàng. KHÔNG áp dụng khi đang submit hoặc đã đặt hàng xong: submit()
    // làm giỏ rỗng trước khi navigate() kịp chạy, thiếu guard này khách bị đá về giỏ hàng
    // đúng lúc vừa đặt hàng thành công.
    // `isReady` là bắt buộc: giỏ nạp bất đồng bộ, lần render đầu `items` LUÔN rỗng. Thiếu guard
    // này, chỉ cần tải lại trang /checkout (hoặc mở thẳng link) là khách bị đá về giỏ hàng dù
    // giỏ đầy — effect của con chạy trước effect nạp giỏ của CartProvider.
    useEffect(() => {
        if (!isReady || submitting || confirmed) return;
        if (items.length === 0) navigate(ROUTES.CART);
    }, [isReady, items.length, submitting, confirmed, navigate]);

    // Xem trước khuyến mãi (debounce 300ms). Mã không hợp lệ ⇒ lỗi hiện ngay ở bước 2.
    useEffect(() => {
        if (items.length === 0) return;
        setEvaluating(true);
        const handle = window.setTimeout(async () => {
            try {
                const res = await promotionApi.evaluate({
                    items: items.map(i => ({ productId: i.id, variantId: i.variantId, quantity: i.quantity, unitPrice: i.price })),
                    couponCode: promotionCode ?? undefined,
                    customerId: user?.id,
                    shippingAmount: quote?.fee ?? shippingAmount,
                });
                setEvaluated(res);
                const warning = res.warnings?.[0];
                setPromotionError(
                    promotionCode && res.appliedPromotions.length === 0
                        ? warning ?? `Mã "${promotionCode}" không áp dụng được cho đơn hàng này.`
                        : warning ?? null,
                );
            } catch (err) {
                setEvaluated(null);
                setPromotionError(normalizeApiError(err).message);
            } finally { setEvaluating(false); }
        }, 300);
        return () => window.clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, promotionCode, user?.id, quote?.fee]);

    // Phiên giữ chỗ tồn kho: tạo khi vào bước thanh toán, chỉ dành cho khách đã đăng nhập
    // (giỏ vãng lai chưa có `cartId` trên server — xem integration request W3-2 #4).
    useEffect(() => {
        if (step !== 3 || sessionId || !cartId || !isAuthenticated) return;
        salesCartCheckoutApi.checkoutSession.create(cartId)
            .then(s => { setSessionId(s.sessionId); setSessionExpiresAt(s.expiresAt); })
            .catch(err => notify.error(normalizeApiError(err).message));
    }, [step, sessionId, cartId, isAuthenticated]);

    const handleExpired = useCallback(() => {
        if (submitting) return;
        notify.error('Phiên giữ chỗ đã hết. Bấm gia hạn hoặc quay lại giỏ hàng.');
    }, [submitting]);

    const handleExtend = async () => {
        if (!sessionId || extended) return;
        try {
            const s = await salesCartCheckoutApi.checkoutSession.extend(sessionId);
            setSessionExpiresAt(s.expiresAt);
            setExtended(true);
            notify.success('Đã gia hạn thêm 15 phút.');
        } catch (err) { notify.error(normalizeApiError(err).message); }
    };

    // Số hiển thị: ưu tiên kết quả evaluate của server, nếu chưa có thì dùng số của giỏ (cũng của server).
    const isPickup = shipping.deliveryMethod === 'pickup';
    const displayShipping = isPickup ? 0 : (quote?.fee ?? shippingAmount);
    const displayDiscount = (evaluated?.discountTotal ?? discountAmount) + (evaluated?.shippingDiscount ?? 0);
    const displayTotal = evaluated?.finalTotal ?? Math.max(0, subtotal - displayDiscount + displayShipping);
    const applied: AppliedPromotion[] = evaluated?.appliedPromotions ?? [];

    const handleConfirm = async () => {
        setSubmitError(null);
        const result = await submit({
            items, cartId, shipping, payment, promotionCode, sessionId, isAuthenticated, clearCart,
        });
        if (result.redirected) return;
        if (!result.order) {
            setSubmitError(result.error);
            if (result.errorStep && result.errorStep !== 3) setStep(result.errorStep);
            return;
        }
        setConfirmed(true);
        sessionBrowserStorage.removeItem(CHECKOUT_STORAGE_KEY);
        await clearCart();
        const guestEmail = !isAuthenticated ? shipping.email : undefined;
        navigate(buildCheckoutSuccessUrl(result.order, payment.paymentMethod, guestEmail), { replace: true });
    };

    const summaryItems = useMemo(() => items.map(i => ({
        id: `${i.id}-${i.variantId ?? ''}`,
        name: i.name + (i.variantName ? ` (${i.variantName})` : ''),
        lineTotal: i.lineTotal, quantity: i.quantity, imageUrl: i.imageUrl,
    })), [items]);

    return (
        <div className="min-h-screen bg-bg py-8 lg:py-10">
            <div className="mx-auto max-w-shell px-4 sm:px-6">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <button type="button"
                            onClick={() => (step > 1 ? setStep((step - 1) as CheckoutStep) : navigate(ROUTES.CART))}
                            className="mb-1 flex items-center gap-2 text-13 font-medium text-fg-muted hover:text-brand-text">
                            <ArrowLeft className="h-4 w-4" aria-hidden />
                            {step > 1 ? 'Quay lại bước trước' : 'Về giỏ hàng'}
                        </button>
                        <h1 className="text-2xl font-bold text-fg">Thanh toán đơn hàng</h1>
                    </div>
                    <CheckoutStepper current={step} />
                </div>

                {step >= 3 && sessionExpiresAt && (
                    <CheckoutSessionTimer expiresAt={sessionExpiresAt} onExpired={handleExpired}
                        onExtend={handleExtend} canExtend={!extended} />
                )}

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <ShippingStep key="s1" isAuthenticated={isAuthenticated} value={shipping}
                                    netSubtotal={Math.max(0, subtotal - displayDiscount)}
                                    onChange={p => setShipping(prev => ({ ...prev, ...p }))}
                                    onNext={(values) => { setShipping(values); setStep(2); window.scrollTo(0, 0); }}
                                    onLogin={() => navigate(ROUTES.LOGIN, { state: { from: ROUTES.CHECKOUT } })}
                                    onQuote={setQuote} />
                            )}
                            {step === 2 && (
                                <PromotionStep key="s2" appliedCode={promotionCode} onCodeChange={setPromotionCode}
                                    applied={applied} loading={evaluating} error={promotionError}
                                    onNext={() => { setStep(3); window.scrollTo(0, 0); }} onBack={() => setStep(1)} />
                            )}
                            {step === 3 && (
                                <PaymentStep key="s3" value={payment}
                                    onChange={p => setPayment(prev => ({ ...prev, ...p }))}
                                    onBack={() => setStep(2)}
                                    onSubmit={() => { setStep(4); window.scrollTo(0, 0); }}
                                    submitting={false} totalAmount={displayTotal} />
                            )}
                            {step === 4 && (
                                <ReviewConsentStep key="s4" items={items} shipping={shipping} payment={payment}
                                    invoice={invoice} subtotal={subtotal} discountAmount={displayDiscount}
                                    shippingAmount={displayShipping} total={displayTotal} tax={tax}
                                    vatBreakdown={vatBreakdown} serverError={submitError} submitting={submitting}
                                    onEditStep={(s) => { setStep(s); window.scrollTo(0, 0); }}
                                    onBack={() => setStep(3)}
                                    onConfirm={(v) => {
                                        // Giữ lại thông tin hoá đơn để khách quay lại bước khác không phải gõ lại.
                                        // TODO(integration W2-3): `/checkout/orchestrate` chưa nhận `buyerInvoice`
                                        // và `termsVersion` — xem reports/integration-requests-w3.md.
                                        setInvoice({
                                            requested: v.requested, buyerType: v.buyerType, legalName: v.legalName,
                                            taxCode: v.taxCode, budgetUnitCode: v.budgetUnitCode,
                                            address: v.address, email: v.email,
                                        });
                                        void handleConfirm();
                                    }} />
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="lg:col-span-2">
                        <CheckoutOrderSummary items={summaryItems} subtotal={subtotal} tax={tax}
                            vatBreakdown={vatBreakdown} total={displayTotal} discountAmount={displayDiscount}
                            shippingAmount={displayShipping}
                            shippingUnknown={!isPickup && !quote && shippingAmount === 0} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CheckoutPage;

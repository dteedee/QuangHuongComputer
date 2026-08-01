import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Package, Check, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { salesApi, type Order, type OrderItem, type ReturnType, type ReturnPolicy, type CreateReturnRequestDto } from '../../api/sales';
import { catalogApi, type Product, type ProductVariant, type ProductDetailBundle } from '../../api/catalog';
import { useDebounce } from '../../hooks/useDebounce';
import { AnimatedSection } from '../../components/motion/animated-section';
import { ReturnAttachmentUpload } from '../../components/return/return-attachment-upload';
import { StepPickItem } from './new-return-request-steps/step-pick-item';
import { StepPickType } from './new-return-request-steps/step-pick-type';
import { StepReasonDescription } from './new-return-request-steps/step-reason-description';
import { StepExchangePicker } from './new-return-request-steps/step-exchange-picker';
import { StepConfirm } from './new-return-request-steps/step-confirm';

// ============================================================================
// Wizard 5 bước:
//   1. Chọn đơn hàng + sản phẩm
//   2. Chọn loại (Refund/Exchange/Replace)
//   3. Chi tiết theo loại
//   4. Upload ảnh minh chứng
//   5. Xác nhận + gửi
// ============================================================================

const REFUND_REASONS = [
    'Sản phẩm không đúng mô tả',
    'Không vừa ý / đổi ý',
    'Sản phẩm bị lỗi/hỏng',
    'Nhận sai sản phẩm',
    'Khác',
];

const REPLACE_REASONS = [
    'Lỗi kỹ thuật ngay khi mở hộp',
    'Không boot / không lên nguồn',
    'Lỗi hiển thị / điểm chết',
    'Thiếu linh kiện trong hộp',
    'Khác',
];

interface StepIndicatorProps {
    current: number;
    total: number;
    labels: string[];
}

const StepIndicator = ({ current, total, labels }: StepIndicatorProps) => (
    <ol className="flex items-center gap-2 mb-6 overflow-x-auto">
        {Array.from({ length: total }).map((_, i) => {
            const step = i + 1;
            const active = step === current;
            const done = step < current;
            return (
                <li key={step} className="flex items-center gap-2 flex-shrink-0">
                    <span
                        className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center border-2 transition-all ${
                            done
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : active
                                  ? 'bg-accent border-accent text-white'
                                  : 'bg-white border-gray-200 text-gray-400'
                        }`}
                    >
                        {done ? <Check className="w-3.5 h-3.5" /> : step}
                    </span>
                    <span
                        className={`text-xs font-semibold whitespace-nowrap ${
                            active ? 'text-gray-900' : done ? 'text-emerald-600' : 'text-gray-400'
                        }`}
                    >
                        {labels[i]}
                    </span>
                    {step < total && <span className="w-6 h-px bg-gray-200 mx-1" />}
                </li>
            );
        })}
    </ol>
);

export const NewReturnRequestPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedOrderItemId = searchParams.get('orderItemId');
    const preselectedOrderId = searchParams.get('orderId');

    // Data
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);
    const [policy, setPolicy] = useState<ReturnPolicy | null>(null);

    // Wizard state
    const [step, setStep] = useState(1);
    const [orderId, setOrderId] = useState<string>(preselectedOrderId ?? '');
    const [orderItemId, setOrderItemId] = useState<string>(preselectedOrderItemId ?? '');
    const [type, setType] = useState<ReturnType | null>(null);
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);

    // Exchange state
    const [exchangeQuery, setExchangeQuery] = useState('');
    const debouncedQuery = useDebounce(exchangeQuery, 300);
    const [exchangeResults, setExchangeResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [exchangeProduct, setExchangeProduct] = useState<Product | null>(null);
    const [exchangeVariants, setExchangeVariants] = useState<ProductVariant[]>([]);
    const [exchangeVariantId, setExchangeVariantId] = useState<string>('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    // ============ Effects ============
    useEffect(() => {
        void loadOrders();
    }, []);

    // Nếu có preselectedOrderItemId thì tự tìm order chứa nó
    useEffect(() => {
        if (!preselectedOrderItemId || orders.length === 0 || orderId) return;
        const found = orders.find((o) => o.items.some((i) => i.id === preselectedOrderItemId));
        if (found) {
            setOrderId(found.id);
            setOrderItemId(preselectedOrderItemId);
        }
    }, [preselectedOrderItemId, orders, orderId]);

    // Load return policy (không category → dùng default)
    useEffect(() => {
        void loadPolicy(undefined);
    }, []);

    // Product search (Exchange)
    useEffect(() => {
        if (type !== 'Exchange' || !debouncedQuery || debouncedQuery.length < 2) {
            setExchangeResults([]);
            return;
        }
        void searchExchangeProducts(debouncedQuery);
    }, [debouncedQuery, type]);

    // Load variants khi chọn product
    useEffect(() => {
        if (!exchangeProduct) {
            setExchangeVariants([]);
            setExchangeVariantId('');
            return;
        }
        void loadVariants(exchangeProduct.id);
    }, [exchangeProduct]);

    // ============ Fetchers ============
    const loadOrders = async () => {
        try {
            setIsLoadingOrders(true);
            const list = await salesApi.getMyOrders();
            // Chỉ đơn Delivered/Completed mới đủ điều kiện đổi trả
            const eligible = list.filter((o) => o.status === 'Delivered' || o.status === 'Completed');
            setOrders(eligible);
        } catch {
            toast.error('Không tải được danh sách đơn hàng');
        } finally {
            setIsLoadingOrders(false);
        }
    };

    const loadPolicy = async (categoryId?: string) => {
        try {
            const p = await salesApi.orders.returns.getEffectivePolicy(categoryId);
            setPolicy(p);
        } catch {
            // policy không load được — dùng mặc định hiển thị
            setPolicy({
                daysForReturn: 7,
                daysForExchange: 15,
                daysForDefectReplace: 7,
                requireOriginalPackaging: true,
                requireAllAccessories: true,
                restockingFeePercent: 0,
            });
        }
    };

    const searchExchangeProducts = async (q: string) => {
        try {
            setIsSearching(true);
            const res = await catalogApi.searchProducts({ query: q, pageSize: 8 });
            setExchangeResults(res.products || []);
        } catch {
            setExchangeResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const loadVariants = async (productId: string) => {
        try {
            const bundle: ProductDetailBundle = await catalogApi.getProductWithDetails(productId);
            setExchangeVariants(bundle.variants ?? []);
            const defaultVar = (bundle.variants ?? []).find((v) => v.isDefault);
            setExchangeVariantId(defaultVar?.id ?? '');
        } catch {
            setExchangeVariants([]);
        }
    };

    // ============ Derived ============
    const selectedOrder = useMemo(() => orders.find((o) => o.id === orderId) ?? null, [orders, orderId]);
    const selectedItem: OrderItem | null = useMemo(
        () => selectedOrder?.items.find((i) => i.id === orderItemId) ?? null,
        [selectedOrder, orderItemId],
    );

    const daysSinceDelivered = useMemo(() => {
        if (!selectedOrder?.deliveredAt) return null;
        return Math.floor((Date.now() - new Date(selectedOrder.deliveredAt).getTime()) / (1000 * 60 * 60 * 24));
    }, [selectedOrder]);

    const typeOptions = useMemo(() => {
        if (!policy || daysSinceDelivered == null) {
            return [
                { value: 'Refund' as ReturnType },
                { value: 'Exchange' as ReturnType },
                { value: 'Replace' as ReturnType },
            ];
        }
        return [
            {
                value: 'Refund' as ReturnType,
                disabled: daysSinceDelivered > policy.daysForReturn,
                disabledReason: `Đã quá hạn hoàn tiền (${policy.daysForReturn} ngày kể từ khi nhận)`,
            },
            {
                value: 'Exchange' as ReturnType,
                disabled: daysSinceDelivered > policy.daysForExchange,
                disabledReason: `Đã quá hạn đổi (${policy.daysForExchange} ngày kể từ khi nhận)`,
            },
            {
                value: 'Replace' as ReturnType,
                disabled: daysSinceDelivered > policy.daysForDefectReplace,
                disabledReason: `Chỉ áp cho hàng lỗi trong ${policy.daysForDefectReplace} ngày đầu`,
            },
        ];
    }, [policy, daysSinceDelivered]);

    const selectedVariant = useMemo(
        () => exchangeVariants.find((v) => v.id === exchangeVariantId) ?? null,
        [exchangeVariants, exchangeVariantId],
    );

    const exchangePriceDiff = useMemo(() => {
        if (!selectedItem || !exchangeProduct) return null;
        const newPrice = selectedVariant?.price ?? exchangeProduct.price;
        return newPrice - selectedItem.unitPrice;
    }, [selectedItem, exchangeProduct, selectedVariant]);

    // ============ Validation ============
    const canGoNextStep = (): boolean => {
        switch (step) {
            case 1:
                return !!orderId && !!orderItemId;
            case 2:
                return type !== null;
            case 3:
                if (type === 'Exchange') {
                    return !!exchangeProduct && (exchangeVariants.length === 0 || !!exchangeVariantId);
                }
                return !!reason;
            case 4:
                return true; // ảnh tuỳ chọn
            default:
                return true;
        }
    };

    // ============ Submit ============
    const handleSubmit = async () => {
        if (!orderItemId || !type) {
            toast.error('Thiếu thông tin bắt buộc');
            return;
        }
        const finalReason =
            type === 'Exchange' ? reason.trim() || 'Muốn đổi sản phẩm khác' : reason.trim();
        if (!finalReason) {
            toast.error('Vui lòng chọn lý do');
            return;
        }
        const payload: CreateReturnRequestDto = {
            orderItemId,
            type,
            reason: finalReason,
            description: description.trim() || undefined,
            exchangeProductId: type === 'Exchange' ? exchangeProduct?.id : undefined,
            exchangeVariantId: type === 'Exchange' ? exchangeVariantId || undefined : undefined,
            attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : undefined,
        };

        try {
            setIsSubmitting(true);
            const res = await salesApi.orders.returns.create(payload);
            toast.success('Đã gửi yêu cầu đổi/trả');
            navigate(`/account/returns/${res.id}`);
        } catch (err) {
            const anyErr = err as { response?: { data?: { Error?: string; message?: string } }; message?: string };
            toast.error(anyErr.response?.data?.Error || anyErr.response?.data?.message || anyErr.message || 'Không gửi được yêu cầu');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ============ Render ============
    if (isLoadingOrders) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="bg-gray-50 min-h-screen py-12">
                <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Chưa có đơn hàng nào đủ điều kiện</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        Chỉ đơn ở trạng thái đã giao mới có thể yêu cầu đổi/trả.
                    </p>
                    <Link to="/account/orders" className="text-accent text-sm font-semibold hover:underline">
                        Xem đơn hàng của tôi
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen py-8">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
                <Link
                    to="/account/orders"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-accent text-sm font-medium mb-5 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại đơn hàng
                </Link>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                        <RotateCcw size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Yêu cầu đổi/trả</h1>
                        <p className="text-gray-500 text-sm">Chọn đơn hàng, loại yêu cầu và mô tả tình trạng</p>
                    </div>
                </div>

                <StepIndicator
                    current={step}
                    total={5}
                    labels={['Sản phẩm', 'Loại', 'Chi tiết', 'Minh chứng', 'Xác nhận']}
                />

                {/* Step body */}
                <AnimatedSection>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        {step === 1 && (
                            <StepPickItem
                                orders={orders}
                                orderId={orderId}
                                setOrderId={(id) => {
                                    setOrderId(id);
                                    setOrderItemId('');
                                }}
                                orderItemId={orderItemId}
                                setOrderItemId={setOrderItemId}
                            />
                        )}
                        {step === 2 && (
                            <StepPickType
                                policy={policy}
                                daysSinceDelivered={daysSinceDelivered}
                                type={type}
                                setType={setType}
                                options={typeOptions}
                            />
                        )}
                        {step === 3 && type === 'Refund' && (
                            <StepReasonDescription
                                title="Chi tiết hoàn tiền"
                                reasons={REFUND_REASONS}
                                reason={reason}
                                setReason={setReason}
                                description={description}
                                setDescription={setDescription}
                            />
                        )}
                        {step === 3 && type === 'Replace' && (
                            <StepReasonDescription
                                title="Chi tiết đổi 1-1"
                                reasons={REPLACE_REASONS}
                                reason={reason}
                                setReason={setReason}
                                description={description}
                                setDescription={setDescription}
                            />
                        )}
                        {step === 3 && type === 'Exchange' && (
                            <StepExchangePicker
                                query={exchangeQuery}
                                setQuery={setExchangeQuery}
                                isSearching={isSearching}
                                results={exchangeResults}
                                exchangeProduct={exchangeProduct}
                                setExchangeProduct={setExchangeProduct}
                                variants={exchangeVariants}
                                variantId={exchangeVariantId}
                                setVariantId={setExchangeVariantId}
                                priceDiff={exchangePriceDiff}
                                description={description}
                                setDescription={setDescription}
                            />
                        )}
                        {step === 4 && (
                            <div>
                                <h2 className="text-base font-bold text-gray-900 mb-3">Ảnh minh chứng</h2>
                                <p className="text-sm text-gray-500 mb-4">
                                    Kèm ảnh giúp bộ phận CSKH xử lý nhanh hơn. Tuỳ chọn — không bắt buộc.
                                </p>
                                <ReturnAttachmentUpload value={attachmentUrls} onChange={setAttachmentUrls} />
                            </div>
                        )}
                        {step === 5 && (
                            <StepConfirm
                                item={selectedItem}
                                type={type}
                                reason={reason}
                                description={description}
                                policy={policy}
                                exchangeProduct={exchangeProduct}
                                exchangeVariant={selectedVariant}
                                priceDiff={exchangePriceDiff}
                                attachments={attachmentUrls}
                            />
                        )}
                    </div>
                </AnimatedSection>

                {/* Nav */}
                <div className="flex items-center justify-between mt-6">
                    <button
                        type="button"
                        onClick={() => setStep((s) => Math.max(1, s - 1))}
                        disabled={step === 1}
                        className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        Quay lại
                    </button>

                    {step < 5 ? (
                        <button
                            type="button"
                            onClick={() => setStep((s) => Math.min(5, s + 1))}
                            disabled={!canGoNextStep()}
                            className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            Tiếp tục
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};


export default NewReturnRequestPage;

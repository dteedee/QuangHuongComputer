import {
    ShoppingBag, MapPin, CreditCard, Wallet, QrCode, Smartphone,
    Truck, RotateCcw, ShieldCheck, Calculator,
} from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { useSystemConfig } from '../../context/SystemConfigContext';
import { useCompanyInfo } from '../../hooks/use-company-info';

interface ProductBuyingGuideTabProps {
    price: number;
    warrantyInfo?: string;
}

const INSTALLMENT_MIN = 5_000_000;
const INSTALLMENT_TERMS = [6, 9, 12] as const;

/**
 * Tab hướng dẫn mua & trả góp.
 * Phí ship / ngưỡng freeship / số ngày đổi trả đọc từ System Config
 * (khoá: SHIPPING_COST, FREESHIP_THRESHOLD, RETURN_WINDOW_DAYS — GET /api/config/public),
 * hotline đọc từ useCompanyInfo. Trả góp vẫn là ước tính minh hoạ (đã ghi chú rõ trong UI).
 */
export default function ProductBuyingGuideTab({ price, warrantyInfo }: ProductBuyingGuideTabProps) {
    const { getNumber } = useSystemConfig();
    const { companyInfo } = useCompanyInfo();
    const showInstallment = price >= INSTALLMENT_MIN;

    const shippingCost = getNumber('SHIPPING_COST', 30000);
    // FREESHIP_THRESHOLD là key chuẩn (FREE_SHIPPING_THRESHOLD đã xóa khỏi seed vì trùng lặp)
    const freeShipThreshold = getNumber('FREESHIP_THRESHOLD', 500000);
    const returnWindowDays = getNumber('RETURN_WINDOW_DAYS', 7);

    return (
        <div className="space-y-5">
            <h3 className="text-xl font-bold text-gray-900">Hướng dẫn mua &amp; trả góp</h3>

            {/* Cách đặt hàng */}
            <section className="bg-white rounded-xl border border-gray-100 p-5">
                <h4 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-3">
                    <ShoppingBag className="w-4 h-4 text-[var(--accent-primary)]" />
                    Cách đặt hàng
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <p className="font-semibold text-gray-900 mb-1.5">1. Đặt online</p>
                        <ol className="space-y-1 list-decimal list-inside text-xs leading-relaxed text-gray-600">
                            <li>Chọn cấu hình (biến thể) mong muốn</li>
                            <li>Bấm "Mua ngay" hoặc "Thêm vào giỏ"</li>
                            <li>Điền thông tin nhận hàng, chọn thanh toán</li>
                            <li>Nhân viên xác nhận qua điện thoại trong 15 phút</li>
                        </ol>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <p className="flex items-center gap-1.5 font-semibold text-gray-900 mb-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            2. Mua tại showroom
                        </p>
                        <p className="text-xs leading-relaxed text-gray-600">
                            Ghé chi nhánh Quang Hưởng gần nhất, kỹ thuật viên hỗ trợ trải nghiệm sản phẩm trực tiếp
                            trước khi quyết định. Xem tồn kho ở cột bên phải.
                        </p>
                    </div>
                </div>
            </section>

            {/* Phương thức thanh toán */}
            <section className="bg-white rounded-xl border border-gray-100 p-5">
                <h4 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-3">
                    <CreditCard className="w-4 h-4 text-[var(--accent-primary)]" />
                    Phương thức thanh toán
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { icon: Wallet, label: 'COD', sub: 'Nhận hàng trả tiền' },
                        { icon: QrCode, label: 'QR Ngân hàng', sub: 'Chuyển khoản' },
                        { icon: CreditCard, label: 'VNPay', sub: 'Thẻ / QR' },
                        { icon: Smartphone, label: 'MoMo', sub: 'Ví điện tử' },
                        { icon: Smartphone, label: 'ZaloPay', sub: 'Ví điện tử' },
                    ].map(({ icon: Icon, label, sub }) => (
                        <div key={label} className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                            <Icon className="w-5 h-5 mx-auto text-gray-500 mb-1.5" />
                            <p className="text-xs font-semibold text-gray-900">{label}</p>
                            <p className="text-[11px] text-gray-500">{sub}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Trả góp 0% */}
            {showInstallment && (
                <section className="bg-white rounded-xl border border-gray-100 p-5">
                    <h4 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-3">
                        <Calculator className="w-4 h-4 text-[var(--accent-primary)]" />
                        Trả góp 0% qua thẻ tín dụng
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">
                        Áp dụng cho đơn từ {formatCurrency(INSTALLMENT_MIN)}. Không cần chứng minh thu nhập.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {INSTALLMENT_TERMS.map((term) => {
                            const monthly = Math.round(price / term / 1000) * 1000;
                            return (
                                <div key={term} className="p-3 rounded-lg border border-gray-100 bg-gradient-to-b from-red-50/40 to-white">
                                    <p className="text-xs text-gray-500 mb-1">Kỳ hạn</p>
                                    <p className="text-2xl font-bold text-[var(--accent-primary)]">{term} tháng</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Trả trước 0đ · Mỗi tháng
                                    </p>
                                    <p className="text-base font-semibold text-gray-900 mt-1">
                                        {formatCurrency(monthly)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-[11px] text-gray-400 italic mt-3">
                        * Số tiền chỉ mang tính minh hoạ. Ngân hàng có thể áp phí chuyển đổi 1.5–3%.
                    </p>
                </section>
            )}

            {/* Vận chuyển */}
            <section className="bg-white rounded-xl border border-gray-100 p-5">
                <h4 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-3">
                    <Truck className="w-4 h-4 text-[var(--accent-primary)]" />
                    Phí vận chuyển
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 flex justify-between">
                        <span>Nội thành / Tỉnh</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(shippingCost)}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 flex justify-between">
                        <span>Hotline hỗ trợ giao hàng</span>
                        <span className="font-semibold text-gray-900">{companyInfo.hotline}</span>
                    </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                    Miễn phí vận chuyển cho đơn từ {formatCurrency(freeShipThreshold)} trở lên.
                </p>
            </section>

            {/* Đổi trả + Bảo hành */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <h4 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-2">
                        <RotateCcw className="w-4 h-4 text-[var(--accent-primary)]" />
                        Đổi trả {returnWindowDays} ngày
                    </h4>
                    <p className="text-xs leading-relaxed text-gray-600">
                        Đổi trả miễn phí trong {returnWindowDays} ngày nếu sản phẩm còn nguyên tem, hộp, phụ kiện.
                        Lỗi nhà sản xuất được đổi mới theo chính sách bảo hành.
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <h4 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-2">
                        <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
                        Bảo hành chính hãng
                    </h4>
                    <p className="text-xs leading-relaxed text-gray-600">
                        {warrantyInfo || 'Bảo hành 24 tháng chính hãng tại showroom Quang Hưởng và các trung tâm bảo hành toàn quốc.'}
                    </p>
                </div>
            </section>
        </div>
    );
}

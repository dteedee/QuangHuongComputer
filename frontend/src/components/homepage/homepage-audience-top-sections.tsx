import { Link } from 'react-router-dom';
import { BadgeCheck, FileText, Wrench, Percent, GraduationCap, Package } from 'lucide-react';
import { AnimatedSection } from '../motion/animated-section';

// ---------------------------------------------------------------------------
// Section top theo audience — nội dung hardcode ở phase này.
// Phase 08 sẽ chuyển sang lọc HomepageSection.audienceTag phía server.
// Tách khỏi HomePage.tsx để giữ file < 200 dòng (DRY/KISS).
// ---------------------------------------------------------------------------

export const StudentTopSection = () => (
    <AnimatedSection className="max-w-6xl mx-auto px-4 pt-6">
        <div
            className="rounded-2xl p-6 md:p-8 border shadow-sm"
            style={{
                backgroundColor: 'var(--accent-primary-light, #FEF2F2)',
                borderColor: 'var(--accent-primary, #D22B2B)',
            }}
        >
            <div className="flex items-center gap-3 mb-3">
                <GraduationCap size={28} style={{ color: 'var(--accent-primary)' }} />
                <h2 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--ink-900, #1A1A1A)' }}>
                    Ưu đãi Học sinh–Sinh viên
                </h2>
            </div>
            <p className="text-sm md:text-base mb-5" style={{ color: 'var(--ink-600, #525252)' }}>
                Trang bị máy tính học tập gọn nhẹ, giá tốt. Xuất trình thẻ HS-SV để nhận thêm ưu đãi tại cửa hàng.
            </p>
            <div className="flex flex-wrap gap-3">
                <Link
                    to="/products?installment=0"
                    className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full bg-white border text-sm font-medium hover:brightness-95"
                    style={{ borderColor: 'var(--accent-primary, #D22B2B)', color: 'var(--accent-primary, #D22B2B)' }}
                >
                    <Percent size={18} />
                    Trả góp 0%
                </Link>
                <Link
                    to="/products?maxPrice=15000000"
                    className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full bg-white border text-sm font-medium hover:brightness-95"
                    style={{ borderColor: 'var(--accent-primary, #D22B2B)', color: 'var(--accent-primary, #D22B2B)' }}
                >
                    <BadgeCheck size={18} />
                    Giá dưới 15 triệu
                </Link>
                <Link
                    to="/products?tag=combo-hoc-tap"
                    className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full bg-white border text-sm font-medium hover:brightness-95"
                    style={{ borderColor: 'var(--accent-primary, #D22B2B)', color: 'var(--accent-primary, #D22B2B)' }}
                >
                    <Package size={18} />
                    Combo học tập
                </Link>
            </div>
        </div>
    </AnimatedSection>
);

export const BusinessTopSection = () => (
    <AnimatedSection className="max-w-6xl mx-auto px-4 pt-6">
        <div
            className="rounded-2xl p-6 md:p-8 border shadow-sm bg-white"
            style={{ borderColor: 'var(--accent-primary, #D22B2B)' }}
        >
            <div className="mb-4">
                <h2 className="text-xl md:text-2xl font-bold mb-1" style={{ color: 'var(--ink-900, #1A1A1A)' }}>
                    Doanh nghiệp mua số lượng
                </h2>
                <p className="text-sm md:text-base" style={{ color: 'var(--ink-600, #525252)' }}>
                    Giải pháp trang bị máy tính cho văn phòng, xuất hoá đơn VAT đầy đủ, bảo hành linh hoạt.
                </p>
            </div>

            <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <li className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border, #E5E5E5)' }}>
                    <FileText size={22} style={{ color: 'var(--accent-primary)' }} />
                    <div>
                        <p className="font-semibold" style={{ color: 'var(--ink-900, #1A1A1A)' }}>Xuất hoá đơn VAT</p>
                        <p className="text-sm" style={{ color: 'var(--ink-600, #525252)' }}>Đầy đủ chứng từ, hỗ trợ kế toán.</p>
                    </div>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border, #E5E5E5)' }}>
                    <Wrench size={22} style={{ color: 'var(--accent-primary)' }} />
                    <div>
                        <p className="font-semibold" style={{ color: 'var(--ink-900, #1A1A1A)' }}>Bảo hành tận nơi</p>
                        <p className="text-sm" style={{ color: 'var(--ink-600, #525252)' }}>Kỹ thuật tới văn phòng, tối thiểu gián đoạn.</p>
                    </div>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border, #E5E5E5)' }}>
                    <BadgeCheck size={22} style={{ color: 'var(--accent-primary)' }} />
                    <div>
                        <p className="font-semibold" style={{ color: 'var(--ink-900, #1A1A1A)' }}>Giá ưu đãi số lượng lớn</p>
                        <p className="text-sm" style={{ color: 'var(--ink-600, #525252)' }}>Từ 5 máy trở lên nhận báo giá riêng.</p>
                    </div>
                </li>
            </ul>

            <Link
                to="/contact?type=quote"
                className="inline-flex items-center gap-2 min-h-[44px] px-5 py-3 rounded-full text-white text-sm font-semibold hover:brightness-95"
                style={{ backgroundColor: 'var(--accent-primary, #D22B2B)' }}
            >
                Yêu cầu báo giá
            </Link>
        </div>
    </AnimatedSection>
);

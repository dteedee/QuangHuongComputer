import { Link } from 'react-router-dom';
import { ROUTES } from '../../routes/route-paths';
import { LifeBuoy, Wrench, ShieldCheck, PackageSearch, Phone, Mail, MessageCircle } from 'lucide-react';
import { useCompanyInfo } from '../../hooks/use-company-info';
import { useAuth } from '../../context/AuthContext';
import { AnimatedSection } from '../../components/motion/animated-section';
import { ChatSupport } from '../../components/ChatSupport';
import SEO from '../../components/SEO';

// Câu hỏi chung, không thay đổi theo dữ liệu vận hành (khác các bảng chính sách/bảo hành —
// những cái đó đọc trực tiếp từ endpoint công khai, xem `components/policy/policy-matrix-table`).
// KHÔNG có endpoint FAQ-từ-CMS trong `docs/api-contracts/content-promotions.md` hôm nay — xem
// integration-requests-w3.md. Nội dung dưới là thật, không phải lorem ipsum.
const FAQS = [
    {
        q: 'Tôi muốn theo dõi đơn hàng đã đặt thì làm ở đâu?',
        a: 'Vào "Tra cứu đơn hàng" nếu bạn đặt không cần đăng nhập, hoặc mục "Đơn hàng của tôi" trong tài khoản nếu đã đăng nhập.',
    },
    {
        q: 'Sản phẩm của tôi còn bảo hành không?',
        a: 'Dùng "Tra cứu bảo hành" bằng số Serial hoặc SĐT + mã đơn hàng — không cần đăng nhập, kết quả trả về ngay.',
    },
    {
        q: 'Tôi muốn đổi/trả sản phẩm thì cần biết gì trước?',
        a: 'Xem "Chính sách đổi trả" — phân biệt rõ trường hợp miễn phí hoàn toàn (lỗi kỹ thuật, giao sai, không đúng mô tả) và trường hợp nhập lại tự nguyện (có khấu trừ).',
    },
    {
        q: 'Máy đang sửa ở cửa hàng, tôi theo dõi tiến độ ở đâu?',
        a: 'Dùng "Tra cứu sửa chữa" bằng mã phiếu (in trên biên nhận) + số điện thoại đã đăng ký khi gửi máy.',
    },
];

/**
 * `/ho-tro` — help centre thật (thay `ChatSupport` mount trực tiếp ở route `/support`, spec:
 * "`/support` renders an empty body ... do not leave a blank page"). FAQ tĩnh (không có endpoint
 * FAQ-từ-CMS trong contract hiện tại) + lối vào 4 công cụ tự phục vụ + kênh liên hệ trực tiếp.
 */
export const HelpCenterPage = () => {
    const { companyInfo } = useCompanyInfo();
    const { isAuthenticated } = useAuth();

    const quickLinks = [
        { to: ROUTES.GUEST_ORDER_LOOKUP, icon: PackageSearch, title: 'Tra cứu đơn hàng', desc: 'Xem trạng thái đơn — không cần đăng nhập' },
        { to: ROUTES.WARRANTY, icon: ShieldCheck, title: 'Tra cứu bảo hành', desc: 'Theo Serial hoặc SĐT + mã đơn' },
        { to: ROUTES.REPAIR_TRACKING, icon: Wrench, title: 'Tra cứu sửa chữa', desc: 'Theo mã phiếu + số điện thoại' },
        { to: ROUTES.CONTACT, icon: MessageCircle, title: 'Liên hệ CSKH', desc: 'Gửi câu hỏi trực tiếp cho cửa hàng' },
    ];

    return (
        <div className="bg-gray-50 min-h-screen py-10">
            <SEO title="Trung tâm trợ giúp" description="Câu hỏi thường gặp, tra cứu đơn hàng, bảo hành và sửa chữa, kênh liên hệ với Quang Hưởng Computer." />
            <div className="max-w-4xl mx-auto px-4">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/10 text-accent rounded-2xl mb-3">
                        <LifeBuoy size={26} />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Trung tâm trợ giúp</h1>
                    <p className="text-gray-500 mt-2">Tự tra cứu nhanh, hoặc liên hệ trực tiếp với Quang Hưởng Computer.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                    {quickLinks.map((l) => (
                        <Link
                            key={l.to}
                            to={l.to}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-accent/40 transition-all group flex items-start gap-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gray-50 text-accent flex items-center justify-center shrink-0 group-hover:bg-accent/10">
                                <l.icon size={20} />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 group-hover:text-accent">{l.title}</p>
                                <p className="text-sm text-gray-500">{l.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                <AnimatedSection>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 mb-10">
                        {FAQS.map((item, i) => (
                            <details key={i} className="group">
                                <summary className="flex justify-between items-center gap-3 p-5 cursor-pointer text-sm font-semibold text-gray-900 hover:bg-gray-50">
                                    <span>{item.q}</span>
                                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
                                </summary>
                                <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">{item.a}</p>
                            </details>
                        ))}
                    </div>
                </AnimatedSection>

                {/* Chat trực tiếp với CSKH — nhân viên. Widget AI nổi (mọi trang) là kênh AI; đây là
                    kênh người thật, chỉ dành cho khách đã đăng nhập (yêu cầu của SignalR hub). */}
                {isAuthenticated ? (
                    <div className="mb-10 -mx-4">
                        <ChatSupport />
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-10 flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <p className="font-semibold text-gray-900">Muốn chat trực tiếp với nhân viên?</p>
                            <p className="text-sm text-gray-500">Đăng nhập để mở khung chat trực tuyến với CSKH.</p>
                        </div>
                        <Link to={ROUTES.LOGIN} className="px-4 py-2.5 bg-gray-900 text-white font-semibold rounded-xl text-sm">Đăng nhập</Link>
                    </div>
                )}

                <div className="bg-gray-900 rounded-2xl p-6 text-white flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="font-bold">Chưa tìm được câu trả lời?</p>
                        <p className="text-gray-400 text-sm">Liên hệ trực tiếp với chúng tôi.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <a href={`tel:${companyInfo.hotline.replace(/[^0-9+]/g, '')}`} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-900 font-semibold rounded-xl text-sm">
                            <Phone size={16} /> {companyInfo.hotline}
                        </a>
                        <a href={`mailto:${companyInfo.email}`} className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white font-semibold rounded-xl text-sm">
                            <Mail size={16} /> {companyInfo.email}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpCenterPage;

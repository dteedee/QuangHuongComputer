import { useState } from 'react';
import { ShieldCheck, HelpCircle, Phone, Mail, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WarrantyLookupForm } from '../components/warranty/warranty-lookup-form';
import { WarrantyTimeline } from '../components/warranty/warranty-timeline';
import { AnimatedSection } from '../components/motion/animated-section';
import type { PublicWarrantyLookupResult } from '../api/warranty';

// ============================================================================
// Trang tra cứu bảo hành CÔNG KHAI — không cần đăng nhập.
// Trả về thông tin tối thiểu (không PII).
// ============================================================================

const FAQ_ITEMS = [
    {
        q: 'Tôi cần chuẩn bị thông tin gì để tra cứu?',
        a: 'Bạn cần số Serial (S/N) in trên tem sản phẩm, HOẶC số điện thoại đã mua kèm mã đơn hàng để xác thực chéo.',
    },
    {
        q: 'Vì sao kết quả không hiển thị tên/địa chỉ chủ máy?',
        a: 'Để bảo vệ dữ liệu cá nhân, tra cứu công khai chỉ hiển thị trạng thái bảo hành. Muốn xem chi tiết cá nhân, vui lòng đăng nhập hoặc liên hệ CSKH.',
    },
    {
        q: 'Máy còn bảo hành thì làm gì?',
        a: 'Mang máy đến cửa hàng hoặc đặt lịch online — bộ phận kỹ thuật sẽ tiếp nhận, in phiếu và gửi hãng (RMA) nếu cần.',
    },
    {
        q: 'Bảo hành hãng và bảo hành shop khác nhau thế nào?',
        a: 'Bảo hành hãng do nhà sản xuất bảo đảm theo cam kết (thường 12-24 tháng). Bảo hành shop là gia hạn thêm do Quang Hưởng Computer cung cấp cho khách hàng.',
    },
    {
        q: 'Tôi có cần giữ hoá đơn không?',
        a: 'Nên giữ. Trong nhiều trường hợp hãng yêu cầu hoá đơn để xác nhận ngày mua khi bảo hành.',
    },
];

export const WarrantyPage = () => {
    const [result, setResult] = useState<PublicWarrantyLookupResult | null>(null);

    return (
        <div className="bg-gradient-to-b from-red-50/40 via-gray-50 to-white min-h-screen">
            {/* Hero */}
            <AnimatedSection>
                <section className="pt-12 pb-8 px-4 sm:px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/10 text-accent rounded-2xl mb-4">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                            Tra cứu bảo hành Quang Hưởng Computer
                        </h1>
                        <p className="text-gray-500 text-base max-w-2xl mx-auto">
                            Kiểm tra thời hạn và trạng thái bảo hành bằng số serial hoặc số điện thoại mua hàng.
                            Không cần đăng nhập.
                        </p>
                    </div>
                </section>
            </AnimatedSection>

            {/* Lookup */}
            <section className="px-4 sm:px-6 pb-10">
                <div className="max-w-3xl mx-auto">
                    <WarrantyLookupForm onResult={setResult} />

                    {result && (
                        <AnimatedSection>
                            <div className="mt-6">
                                <WarrantyTimeline result={result} />
                            </div>
                        </AnimatedSection>
                    )}
                </div>
            </section>

            {/* FAQ */}
            <AnimatedSection>
                <section className="px-4 sm:px-6 pb-12">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center gap-2 mb-4">
                            <HelpCircle className="w-5 h-5 text-accent" />
                            <h2 className="text-xl font-bold text-gray-900">Câu hỏi thường gặp</h2>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
                            {FAQ_ITEMS.map((item, i) => (
                                <details key={i} className="group">
                                    <summary className="flex justify-between items-center gap-3 p-5 cursor-pointer text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded-t-2xl">
                                        <span>{item.q}</span>
                                        <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
                                    </summary>
                                    <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">
                                        {item.a}
                                    </p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>
            </AnimatedSection>

            {/* Policy + Contact */}
            <AnimatedSection>
                <section className="px-4 sm:px-6 pb-16">
                    <div className="max-w-3xl mx-auto grid gap-4 md:grid-cols-2">
                        <Link
                            to="/policy/warranty"
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-accent/40 transition-all group cursor-pointer"
                        >
                            <p className="text-xs uppercase tracking-wide text-accent font-bold mb-1">Chính sách</p>
                            <p className="text-base font-bold text-gray-900 group-hover:text-accent transition-colors">
                                Chi tiết chính sách bảo hành
                            </p>
                            <p className="text-sm text-gray-500 mt-1">Phạm vi, thời hạn, các trường hợp loại trừ</p>
                        </Link>
                        <Link
                            to="/contact"
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-accent/40 transition-all group cursor-pointer"
                        >
                            <p className="text-xs uppercase tracking-wide text-accent font-bold mb-1">Cần trợ giúp?</p>
                            <p className="text-base font-bold text-gray-900 group-hover:text-accent transition-colors">
                                Liên hệ CSKH
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Hotline</span>
                                <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</span>
                                <span className="inline-flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> Chat</span>
                            </div>
                        </Link>
                    </div>
                </section>
            </AnimatedSection>
        </div>
    );
};

export default WarrantyPage;

import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, CreditCard, ChevronRight, Zap, FileText } from 'lucide-react';

const policies: Record<string, { title: string; content: React.ReactNode; icon: any }> = {
    'warranty': {
        title: 'Chính sách bảo hành',
        icon: ShieldCheck,
        content: (
            <div className="space-y-6 text-gray-700">
                <p className="text-lg">Chúng tôi cam kết bảo hành các sản phẩm theo đúng quy định của nhà sản xuất. Thời gian bảo hành được ghi rõ trên phiếu bảo hành và tem bảo hành.</p>

                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Điều kiện bảo hành</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Sản phẩm còn trong thời hạn bảo hành.</li>
                        <li>Tem bảo hành còn nguyên vẹn, không bị rách, vá, tẩy xóa.</li>
                        <li>Sản phẩm không bị hư hỏng do tác động vật lý (rơi, vỡ, va đập) hoặc do người sử dụng.</li>
                        <li>Không có dấu hiệu can thiệp, sửa chữa bởi bên thứ ba không được ủy quyền.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Phương thức bảo hành</h2>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Tại cửa hàng</h3>
                    <p>Khách hàng có thể mang sản phẩm đến trực tiếp các trung tâm bảo hành của chúng tôi hoặc gửi qua đường bưu điện.</p>

                    <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">Qua bưu điện</h3>
                    <p>Gửi sản phẩm kèm phiếu bảo hành về địa chỉ: 91 Nguyễn Xiển, Hạ Đình, Thanh Xuân, Hà Nội</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Thời gian bảo hành</h2>
                    <p>Thời gian bảo hành sẽ được xử lý trong vòng 5-7 ngày làm việc kể từ khi nhận sản phẩm.</p>
                </section>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-6">
                    <p className="text-sm">
                        <strong>Liên hệ hỗ trợ:</strong> Hotline <a href="tel:18006321" className="text-[#D70018] font-bold">1800.6321</a> hoặc email{' '}
                        <a href="mailto:kinhdoanh@qhcomputer.com" className="text-[#D70018] font-bold">kinhdoanh@qhcomputer.com</a>
                    </p>
                </div>
            </div>
        )
    },
    'return': {
        title: 'Chính sách đổi trả',
        icon: RotateCcw,
        content: (
            <div className="space-y-6 text-gray-700">
                <p className="text-lg">Quang Hưởng Computer cam kết mang đến trải nghiệm mua sắm tốt nhất với chính sách đổi trả linh hoạt và minh bạch.</p>

                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Điều kiện đổi trả</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Sản phẩm còn nguyên tem, mác, hộp đựng và phụ kiện đầy đủ</li>
                        <li>Sản phẩm chưa qua sử dụng, không có dấu hiệu hư hỏng do người dùng</li>
                        <li>Có hóa đơn mua hàng hợp lệ</li>
                        <li>Trong thời hạn đổi trả theo quy định</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Thời hạn đổi trả</h2>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Đổi mới sản phẩm</h3>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Trong vòng 7 ngày nếu phát hiện lỗi do nhà sản xuất</li>
                        <li>Trong vòng 15 ngày đổi sang sản phẩm khác có giá trị tương đương</li>
                    </ul>

                    <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">Hoàn tiền</h3>
                    <p>Trong vòng 3 ngày nếu sản phẩm có lỗi nghiêm trọng không thể khắc phục</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Quy trình đổi trả</h2>
                    <ol className="list-decimal pl-5 space-y-2">
                        <li>Liên hệ hotline hoặc đến trực tiếp cửa hàng</li>
                        <li>Cung cấp thông tin đơn hàng và lý do đổi trả</li>
                        <li>Mang sản phẩm và hóa đơn đến cửa hàng hoặc gửi qua bưu điện</li>
                        <li>Nhân viên kiểm tra và xác nhận đổi trả</li>
                        <li>Nhận sản phẩm mới hoặc hoàn tiền</li>
                    </ol>
                </section>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-6">
                    <p className="text-sm">
                        <strong>Cần hỗ trợ?</strong> Liên hệ <Link to="/contact" className="text-[#D70018] font-bold">tại đây</Link> hoặc gọi hotline{' '}
                        <a href="tel:18006321" className="text-[#D70018] font-bold">1800.6321</a>
                    </p>
                </div>
            </div>
        )
    },
    'shipping': {
        title: 'Chính sách vận chuyển',
        icon: Truck,
        content: (
            <div className="space-y-6 text-gray-700">
                <p className="text-lg">Chúng tôi hỗ trợ giao hàng toàn quốc với dịch vụ vận chuyển nhanh chóng và an toàn.</p>

                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Thời gian giao hàng</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Nội thành Hà Nội:</strong> 1-2 ngày làm việc</li>
                        <li><strong>Các tỉnh thành lớn:</strong> 2-3 ngày làm việc</li>
                        <li><strong>Các tỉnh khác:</strong> 3-5 ngày làm việc</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Phí vận chuyển</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Miễn phí vận chuyển cho đơn hàng trên 5.000.000đ</li>
                        <li>Phí vận chuyển cố định 30.000đ cho đơn hàng dưới 5.000.000đ</li>
                    </ul>
                </section>
            </div>
        )
    },
    'payment': {
        title: 'Hướng dẫn thanh toán',
        icon: CreditCard,
        content: (
            <div className="space-y-6 text-gray-700">
                <p className="text-lg">Chúng tôi chấp nhận nhiều hình thức thanh toán để thuận tiện cho khách hàng.</p>

                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Phương thức thanh toán</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Chuyển khoản ngân hàng:</strong> Chuyển trực tiếp vào tài khoản công ty</li>
                        <li><strong>VNPAY-QR:</strong> Thanh toán qua ứng dụng ngân hàng</li>
                        <li><strong>Tiền mặt (COD):</strong> Thanh toán khi nhận hàng</li>
                        <li><strong>Thẻ tín dụng/ghi nợ:</strong> Visa, Mastercard</li>
                    </ul>
                </section>
            </div>
        )
    },
    'news': {
        title: 'Tin tức & Blog',
        icon: FileText,
        content: (
            <div className="space-y-6 text-gray-700">
                <p className="text-lg">Cập nhật tin tức công nghệ và các bài viết hữu ích từ Quang Hưởng Computer.</p>
                <p className="text-gray-500 italic">Nội dung đang được cập nhật...</p>
            </div>
        )
    },
    'promotions': {
        title: 'Khuyến mãi',
        icon: Zap,
        content: (
            <div className="space-y-6 text-gray-700">
                <p className="text-lg">Các chương trình khuyến mãi hấp dẫn tại Quang Hưởng Computer.</p>
                <p className="text-gray-500 italic">Nội dung đang được cập nhật...</p>
            </div>
        )
    }
};

export const PolicyPage = () => {
    const { type } = useParams<{ type: string }>();
    const policy = policies[type || 'warranty'];

    if (!policy) return <div className="p-10 text-center">Chính sách không tồn tại.</div>;

    const Icon = policy.icon;

    return (
        <div className="bg-gray-50 min-h-screen pb-10">
            {/* Breadcrumb */}
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="container mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-[#D70018]">Trang chủ</Link>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">Chính sách</span>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-8 flex flex-col lg:flex-row gap-8 font-sans">
                {/* Sidebar */}
                <div className="w-full lg:w-1/4">
                    <div className="bg-white rounded-[32px] shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
                        <div className="bg-[#D70018] text-white p-6 font-black uppercase text-xs italic tracking-widest">Danh mục chính sách</div>
                        <div className="flex flex-col">
                            {Object.entries(policies).map(([key, item]) => (
                                <Link
                                    key={key}
                                    to={`/policy/${key}`}
                                    className={`p-5 border-b border-gray-50 flex items-center justify-between hover:bg-gray-50 hover:text-[#D70018] transition-all ${key === type ? 'text-[#D70018] font-black bg-red-50' : 'text-gray-500 font-bold'}`}
                                >
                                    <div className="flex items-center gap-3 text-sm">
                                        <item.icon size={18} />
                                        <span>{item.title}</span>
                                    </div>
                                    <ChevronRight size={16} />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-white p-10 md:p-16 rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-50">
                    <div className="flex items-center gap-5 mb-10 border-b border-gray-100 pb-8">
                        <div className="p-5 bg-red-50 text-[#D70018] rounded-2xl shadow-inner">
                            <Icon size={40} />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">{policy.title}</h1>
                    </div>
                    <div className="prose prose-red max-w-none text-gray-600 font-medium leading-relaxed italic">
                        {policy.content}
                    </div>
                </div>
            </div>
        </div>
    );
};

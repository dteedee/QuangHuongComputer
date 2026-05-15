import { Link } from 'react-router-dom';
import { FileText, ChevronRight } from 'lucide-react';

export const TermsPage = () => {
    return (
        <div className="bg-gray-50 min-h-screen py-8 font-sans">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-200 mb-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-accent transition-colors">Trang chủ</Link>
                    <ChevronRight size={14} />
                    <span className="text-gray-900 font-medium">Điều khoản sử dụng</span>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                {/* Hero header */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-red-50 text-accent rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Điều khoản sử dụng</h1>
                            <p className="text-gray-500 text-sm mt-1">Vui lòng đọc kỹ trước khi sử dụng dịch vụ</p>
                        </div>
                    </div>
                    <p className="mt-6 text-gray-600 text-sm leading-relaxed">
                        Chào mừng bạn đến với website của Công ty Cổ phần Máy tính Quang Hưởng. Khi sử dụng website này,
                        bạn đồng ý tuân thủ các điều khoản và điều kiện sử dụng được quy định dưới đây.
                    </p>
                </div>

                {/* Content sections */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-3">1. Quyền sở hữu trí tuệ</h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Tất cả nội dung trên website này, bao gồm văn bản, hình ảnh, logo, đồ họa, và phần mềm
                            đều thuộc quyền sở hữu của Quang Hưởng Computer hoặc các đối tác được cấp phép.
                            Nghiêm cấm sao chép, phân phối, hoặc sử dụng bất kỳ nội dung nào mà không có sự cho phép bằng văn bản.
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">2. Sử dụng website</h2>
                        <div className="space-y-4 text-gray-600 text-sm">
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2">Quyền của người dùng</h3>
                                <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
                                    <li>Truy cập và sử dụng các dịch vụ trên website</li>
                                    <li>Tạo tài khoản và quản lý thông tin cá nhân</li>
                                    <li>Đặt hàng và thanh toán trực tuyến</li>
                                    <li>Tham gia các chương trình khuyến mãi</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2">Trách nhiệm của người dùng</h3>
                                <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
                                    <li>Cung cấp thông tin chính xác và trung thực</li>
                                    <li>Bảo mật thông tin tài khoản và mật khẩu</li>
                                    <li>Không sử dụng website cho mục đích bất hợp pháp</li>
                                    <li>Không can thiệp vào hoạt động bình thường của hệ thống</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-3">3. Giao dịch và thanh toán</h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Tất cả các giao dịch mua bán trên website đều tuân theo các điều khoản và điều kiện được
                            công bố tại thời điểm giao dịch. Giá cả, chương trình khuyến mãi có thể thay đổi mà không cần báo trước.
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-3">4. Giới hạn trách nhiệm</h2>
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                            Quang Hưởng Computer không chịu trách nhiệm cho bất kỳ thiệt hại trực tiếp hoặc gián tiếp nào
                            phát sinh từ việc sử dụng hoặc không thể sử dụng website, bao gồm nhưng không giới hạn ở:
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 leading-relaxed">
                            <li>Lỗi kỹ thuật hoặc gián đoạn dịch vụ</li>
                            <li>Mất mát hoặc hư hỏng dữ liệu</li>
                            <li>Virus hoặc phần mềm độc hại</li>
                            <li>Hành vi của bên thứ ba</li>
                        </ul>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-3">5. Thay đổi điều khoản</h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Chúng tôi có quyền thay đổi, chỉnh sửa, hoặc cập nhật các điều khoản sử dụng này bất cứ lúc nào
                            mà không cần thông báo trước. Việc tiếp tục sử dụng website sau khi có thay đổi đồng nghĩa với
                            việc bạn chấp nhận các điều khoản mới.
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-3">6. Luật áp dụng</h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Các điều khoản này được điều chỉnh và giải thích theo pháp luật Việt Nam.
                            Mọi tranh chấp phát sinh sẽ được giải quyết tại Tòa án có thẩm quyền tại Hà Nội.
                        </p>
                    </div>

                    {/* Contact notice */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                        <p className="text-sm text-gray-700">
                            <strong>Thông tin liên hệ:</strong> Nếu bạn có bất kỳ thắc mắc nào về điều khoản sử dụng,
                            vui lòng{' '}
                            <Link to="/contact" className="text-accent font-semibold hover:underline cursor-pointer">liên hệ với chúng tôi</Link>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

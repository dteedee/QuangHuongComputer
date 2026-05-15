import { Link } from 'react-router-dom';
import { Shield, ChevronRight } from 'lucide-react';

export const PrivacyPage = () => {
    return (
        <div className="bg-gray-50 min-h-screen py-8 font-sans">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-200 mb-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-accent transition-colors">Trang chủ</Link>
                    <ChevronRight size={14} />
                    <span className="text-gray-900 font-medium">Chính sách bảo mật</span>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                {/* Hero header */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-red-50 text-accent rounded-xl flex items-center justify-center flex-shrink-0">
                            <Shield size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Chính sách bảo mật</h1>
                            <p className="text-gray-500 text-sm mt-1">Cập nhật lần cuối: Tháng 1, 2026</p>
                        </div>
                    </div>
                    <p className="mt-6 text-gray-600 leading-relaxed">
                        Quang Hưởng Computer cam kết bảo vệ quyền riêng tư và thông tin cá nhân của khách hàng.
                        Chính sách bảo mật này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn.
                    </p>
                </div>

                {/* Content sections */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">1. Thông tin chúng tôi thu thập</h2>
                        <div className="space-y-4 text-gray-600">
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2">Thông tin cá nhân</h3>
                                <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
                                    <li>Họ tên, số điện thoại, địa chỉ email</li>
                                    <li>Địa chỉ giao hàng và thanh toán</li>
                                    <li>Thông tin tài khoản (tên đăng nhập, mật khẩu)</li>
                                    <li>Lịch sử mua hàng và giao dịch</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2">Thông tin tự động</h3>
                                <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
                                    <li>Địa chỉ IP, loại trình duyệt</li>
                                    <li>Hành vi duyệt web và tương tác với website</li>
                                    <li>Cookie và công nghệ theo dõi tương tự</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">2. Mục đích sử dụng thông tin</h2>
                        <p className="text-gray-600 text-sm mb-3">Chúng tôi sử dụng thông tin của bạn cho các mục đích sau:</p>
                        <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 leading-relaxed">
                            <li><strong className="text-gray-800">Xử lý đơn hàng:</strong> Xác nhận, đóng gói và giao hàng</li>
                            <li><strong className="text-gray-800">Dịch vụ khách hàng:</strong> Hỗ trợ, giải đáp thắc mắc</li>
                            <li><strong className="text-gray-800">Marketing:</strong> Gửi thông tin khuyến mãi, sản phẩm mới (nếu bạn đồng ý)</li>
                            <li><strong className="text-gray-800">Cải thiện dịch vụ:</strong> Phân tích hành vi để tối ưu trải nghiệm</li>
                            <li><strong className="text-gray-800">Bảo mật:</strong> Phát hiện và ngăn chặn gian lận</li>
                        </ul>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">3. Chia sẻ thông tin</h2>
                        <p className="text-gray-600 text-sm mb-3">Chúng tôi có thể chia sẻ thông tin của bạn với:</p>
                        <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 leading-relaxed mb-4">
                            <li><strong className="text-gray-800">Đối tác vận chuyển:</strong> Để giao hàng đến địa chỉ của bạn</li>
                            <li><strong className="text-gray-800">Nhà cung cấp thanh toán:</strong> Để xử lý giao dịch</li>
                            <li><strong className="text-gray-800">Cơ quan pháp luật:</strong> Khi có yêu cầu hợp pháp</li>
                        </ul>
                        <p className="text-sm font-semibold text-gray-800">
                            Chúng tôi KHÔNG bán hoặc cho thuê thông tin cá nhân của bạn cho bên thứ ba.
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">4. Bảo mật thông tin</h2>
                        <p className="text-gray-600 text-sm mb-3">Chúng tôi áp dụng các biện pháp bảo mật sau:</p>
                        <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 leading-relaxed">
                            <li>Mã hóa SSL cho tất cả giao dịch trực tuyến</li>
                            <li>Hệ thống tường lửa và phát hiện xâm nhập</li>
                            <li>Kiểm soát truy cập nghiêm ngặt với dữ liệu khách hàng</li>
                            <li>Sao lưu dữ liệu định kỳ</li>
                            <li>Đào tạo nhân viên về bảo mật thông tin</li>
                        </ul>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">5. Quyền của bạn</h2>
                        <p className="text-gray-600 text-sm mb-3">Bạn có quyền:</p>
                        <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 leading-relaxed">
                            <li><strong className="text-gray-800">Truy cập:</strong> Xem thông tin cá nhân chúng tôi lưu trữ</li>
                            <li><strong className="text-gray-800">Chỉnh sửa:</strong> Cập nhật hoặc sửa đổi thông tin của bạn</li>
                            <li><strong className="text-gray-800">Xóa:</strong> Yêu cầu xóa tài khoản và dữ liệu</li>
                            <li><strong className="text-gray-800">Từ chối:</strong> Không nhận email marketing</li>
                            <li><strong className="text-gray-800">Khiếu nại:</strong> Báo cáo vi phạm quyền riêng tư</li>
                        </ul>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">6. Cookie</h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Website sử dụng cookie để cải thiện trải nghiệm người dùng. Bạn có thể quản lý cookie
                            trong cài đặt trình duyệt. Tuy nhiên, việc vô hiệu hóa cookie có thể ảnh hưởng đến
                            một số tính năng của website.
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">7. Thời gian lưu trữ</h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Chúng tôi lưu trữ thông tin cá nhân của bạn trong thời gian cần thiết để thực hiện các
                            mục đích đã nêu hoặc theo yêu cầu của pháp luật. Sau đó, thông tin sẽ được xóa hoặc
                            ẩn danh hóa một cách an toàn.
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">8. Cập nhật chính sách</h2>
                        <p className="text-sm text-gray-600 leading-relaxed mb-3">
                            Chính sách bảo mật này có thể được cập nhật định kỳ. Chúng tôi sẽ thông báo về các thay đổi
                            quan trọng qua email hoặc thông báo trên website.
                        </p>
                    </div>

                    {/* Contact notice */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                        <p className="text-sm text-gray-700">
                            <strong>Liên hệ về bảo mật:</strong> Nếu bạn có câu hỏi về chính sách bảo mật hoặc muốn thực hiện
                            quyền của mình, vui lòng{' '}
                            <Link to="/contact" className="text-accent font-semibold hover:underline cursor-pointer">liên hệ với chúng tôi</Link>
                            {' '}hoặc email:{' '}
                            <a href="mailto:privacy@qhcomputer.com" className="text-accent font-semibold hover:underline">privacy@qhcomputer.com</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

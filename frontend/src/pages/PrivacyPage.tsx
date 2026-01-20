import { Link } from 'react-router-dom';
import { Shield, ChevronRight } from 'lucide-react';

export const PrivacyPage = () => {
    return (
        <div className="bg-gray-50 min-h-screen pb-10">
            {/* Breadcrumb */}
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="container mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-[#D70018]">Trang chủ</Link>
                    <ChevronRight size={14} />
                    <span className="text-gray-900 font-medium">Chính sách bảo mật</span>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-8">
                <div className="bg-white p-10 md:p-16 rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-50">
                    <div className="flex items-center gap-5 mb-10 border-b border-gray-100 pb-8">
                        <div className="p-5 bg-red-50 text-[#D70018] rounded-2xl shadow-inner">
                            <Shield size={40} />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
                            Chính sách bảo mật
                        </h1>
                    </div>

                    <div className="space-y-6 text-gray-700">
                        <p className="text-lg">
                            Quang Hưởng Computer cam kết bảo vệ quyền riêng tư và thông tin cá nhân của khách hàng.
                            Chính sách bảo mật này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn.
                        </p>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Thông tin chúng tôi thu thập</h2>
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Thông tin cá nhân</h3>
                            <ul className="list-disc pl-5 space-y-2 mb-4">
                                <li>Họ tên, số điện thoại, địa chỉ email</li>
                                <li>Địa chỉ giao hàng và thanh toán</li>
                                <li>Thông tin tài khoản (tên đăng nhập, mật khẩu)</li>
                                <li>Lịch sử mua hàng và giao dịch</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Thông tin tự động</h3>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Địa chỉ IP, loại trình duyệt</li>
                                <li>Hành vi duyệt web và tương tác với website</li>
                                <li>Cookie và công nghệ theo dõi tương tự</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Mục đích sử dụng thông tin</h2>
                            <p>Chúng tôi sử dụng thông tin của bạn cho các mục đích sau:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li><strong>Xử lý đơn hàng:</strong> Xác nhận, đóng gói và giao hàng</li>
                                <li><strong>Dịch vụ khách hàng:</strong> Hỗ trợ, giải đáp thắc mắc</li>
                                <li><strong>Marketing:</strong> Gửi thông tin khuyến mãi, sản phẩm mới (nếu bạn đồng ý)</li>
                                <li><strong>Cải thiện dịch vụ:</strong> Phân tích hành vi để tối ưu trải nghiệm</li>
                                <li><strong>Bảo mật:</strong> Phát hiện và ngăn chặn gian lận</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Chia sẻ thông tin</h2>
                            <p>Chúng tôi có thể chia sẻ thông tin của bạn với:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li><strong>Đối tác vận chuyển:</strong> Để giao hàng đến địa chỉ của bạn</li>
                                <li><strong>Nhà cung cấp thanh toán:</strong> Để xử lý giao dịch</li>
                                <li><strong>Cơ quan pháp luật:</strong> Khi có yêu cầu hợp pháp</li>
                            </ul>
                            <p className="mt-4 font-semibold">
                                Chúng tôi KHÔNG bán hoặc cho thuê thông tin cá nhân của bạn cho bên thứ ba.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Bảo mật thông tin</h2>
                            <p>Chúng tôi áp dụng các biện pháp bảo mật sau:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li>Mã hóa SSL cho tất cả giao dịch trực tuyến</li>
                                <li>Hệ thống tường lửa và phát hiện xâm nhập</li>
                                <li>Kiểm soát truy cập nghiêm ngặt với dữ liệu khách hàng</li>
                                <li>Sao lưu dữ liệu định kỳ</li>
                                <li>Đào tạo nhân viên về bảo mật thông tin</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Quyền của bạn</h2>
                            <p>Bạn có quyền:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li><strong>Truy cập:</strong> Xem thông tin cá nhân chúng tôi lưu trữ</li>
                                <li><strong>Chỉnh sửa:</strong> Cập nhật hoặc sửa đổi thông tin của bạn</li>
                                <li><strong>Xóa:</strong> Yêu cầu xóa tài khoản và dữ liệu</li>
                                <li><strong>Từ chối:</strong> Không nhận email marketing</li>
                                <li><strong>Khiếu nại:</strong> Báo cáo vi phạm quyền riêng tư</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Cookie</h2>
                            <p>
                                Website sử dụng cookie để cải thiện trải nghiệm người dùng. Bạn có thể quản lý cookie
                                trong cài đặt trình duyệt. Tuy nhiên, việc vô hiệu hóa cookie có thể ảnh hưởng đến
                                một số tính năng của website.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Thời gian lưu trữ</h2>
                            <p>
                                Chúng tôi lưu trữ thông tin cá nhân của bạn trong thời gian cần thiết để thực hiện các
                                mục đích đã nêu hoặc theo yêu cầu của pháp luật. Sau đó, thông tin sẽ được xóa hoặc
                                ẩn danh hóa một cách an toàn.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Cập nhật chính sách</h2>
                            <p>
                                Chính sách bảo mật này có thể được cập nhật định kỳ. Chúng tôi sẽ thông báo về các thay đổi
                                quan trọng qua email hoặc thông báo trên website.
                            </p>
                            <p className="mt-2 font-semibold">
                                Cập nhật lần cuối: Tháng 1, 2026
                            </p>
                        </section>

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-8">
                            <p className="text-sm">
                                <strong>Liên hệ về bảo mật:</strong> Nếu bạn có câu hỏi về chính sách bảo mật hoặc muốn thực hiện
                                quyền của mình, vui lòng <Link to="/contact" className="text-[#D70018] font-bold">liên hệ với chúng tôi</Link> hoặc
                                email: <a href="mailto:privacy@qhcomputer.com" className="text-[#D70018] font-bold">privacy@qhcomputer.com</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

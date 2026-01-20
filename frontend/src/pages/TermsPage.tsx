import { Link } from 'react-router-dom';
import { FileText, ChevronRight } from 'lucide-react';

export const TermsPage = () => {
    return (
        <div className="bg-gray-50 min-h-screen pb-10">
            {/* Breadcrumb */}
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="container mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-[#D70018]">Trang chủ</Link>
                    <ChevronRight size={14} />
                    <span className="text-gray-900 font-medium">Điều khoản sử dụng</span>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-8">
                <div className="bg-white p-10 md:p-16 rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-50">
                    <div className="flex items-center gap-5 mb-10 border-b border-gray-100 pb-8">
                        <div className="p-5 bg-red-50 text-[#D70018] rounded-2xl shadow-inner">
                            <FileText size={40} />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
                            Điều khoản sử dụng
                        </h1>
                    </div>

                    <div className="space-y-6 text-gray-700">
                        <p className="text-lg">
                            Chào mừng bạn đến với website của Công ty Cổ phần Máy tính Quang Hưởng. Khi sử dụng website này,
                            bạn đồng ý tuân thủ các điều khoản và điều kiện sử dụng được quy định dưới đây.
                        </p>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Quyền sở hữu trí tuệ</h2>
                            <p>
                                Tất cả nội dung trên website này, bao gồm văn bản, hình ảnh, logo, đồ họa, và phần mềm
                                đều thuộc quyền sở hữu của Quang Hưởng Computer hoặc các đối tác được cấp phép.
                                Nghiêm cấm sao chép, phân phối, hoặc sử dụng bất kỳ nội dung nào mà không có sự cho phép bằng văn bản.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Sử dụng website</h2>
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Quyền của người dùng</h3>
                            <ul className="list-disc pl-5 space-y-2 mb-4">
                                <li>Truy cập và sử dụng các dịch vụ trên website</li>
                                <li>Tạo tài khoản và quản lý thông tin cá nhân</li>
                                <li>Đặt hàng và thanh toán trực tuyến</li>
                                <li>Tham gia các chương trình khuyến mãi</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Trách nhiệm của người dùng</h3>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Cung cấp thông tin chính xác và trung thực</li>
                                <li>Bảo mật thông tin tài khoản và mật khẩu</li>
                                <li>Không sử dụng website cho mục đích bất hợp pháp</li>
                                <li>Không can thiệp vào hoạt động bình thường của hệ thống</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Giao dịch và thanh toán</h2>
                            <p>
                                Tất cả các giao dịch mua bán trên website đều tuân theo các điều khoản và điều kiện được
                                công bố tại thời điểm giao dịch. Giá cả, chương trình khuyến mãi có thể thay đổi mà không cần báo trước.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Giới hạn trách nhiệm</h2>
                            <p>
                                Quang Hưởng Computer không chịu trách nhiệm cho bất kỳ thiệt hại trực tiếp hoặc gián tiếp nào
                                phát sinh từ việc sử dụng hoặc không thể sử dụng website, bao gồm nhưng không giới hạn ở:
                            </p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li>Lỗi kỹ thuật hoặc gián đoạn dịch vụ</li>
                                <li>Mất mát hoặc hư hỏng dữ liệu</li>
                                <li>Virus hoặc phần mềm độc hại</li>
                                <li>Hành vi của bên thứ ba</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Thay đổi điều khoản</h2>
                            <p>
                                Chúng tôi có quyền thay đổi, chỉnh sửa, hoặc cập nhật các điều khoản sử dụng này bất cứ lúc nào
                                mà không cần thông báo trước. Việc tiếp tục sử dụng website sau khi có thay đổi đồng nghĩa với
                                việc bạn chấp nhận các điều khoản mới.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Luật áp dụng</h2>
                            <p>
                                Các điều khoản này được điều chỉnh và giải thích theo pháp luật Việt Nam.
                                Mọi tranh chấp phát sinh sẽ được giải quyết tại Tòa án có thẩm quyền tại Hà Nội.
                            </p>
                        </section>

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-8">
                            <p className="text-sm">
                                <strong>Thông tin liên hệ:</strong> Nếu bạn có bất kỳ thắc mắc nào về điều khoản sử dụng,
                                vui lòng <Link to="/contact" className="text-[#D70018] font-bold">liên hệ với chúng tôi</Link>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

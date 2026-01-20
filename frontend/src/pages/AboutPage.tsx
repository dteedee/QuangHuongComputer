import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Target, Users, Award, TrendingUp } from 'lucide-react';

export const AboutPage = () => {
    return (
        <div className="bg-gray-50 min-h-screen pb-10">
            {/* Breadcrumb */}
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="container mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-[#D70018]">Trang chủ</Link>
                    <ChevronRight size={14} />
                    <span className="text-gray-900 font-medium">Giới thiệu</span>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-8">
                <div className="bg-white p-10 md:p-16 rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-50">
                    <div className="flex items-center gap-5 mb-10 border-b border-gray-100 pb-8">
                        <div className="p-5 bg-red-50 text-[#D70018] rounded-2xl shadow-inner">
                            <Building2 size={40} />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
                            Giới thiệu công ty
                        </h1>
                    </div>

                    <div className="space-y-8 text-gray-700">
                        <section>
                            <p className="text-lg leading-relaxed">
                                <strong className="text-2xl text-[#D70018]">Quang Hưởng Computer</strong> là một trong những
                                đơn vị hàng đầu tại Việt Nam chuyên cung cấp các giải pháp máy tính, linh kiện và dịch vụ
                                sửa chữa bảo hành chuyên nghiệp. Với hơn 10 năm kinh nghiệm trong ngành, chúng tôi tự hào
                                là đối tác tin cậy của hàng ngàn khách hàng cá nhân và doanh nghiệp.
                            </p>
                        </section>

                        <section className="grid md:grid-cols-2 gap-6 my-8">
                            <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-2xl border border-red-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-[#D70018] rounded-lg">
                                        <Target className="text-white" size={24} />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">Sứ mệnh</h2>
                                </div>
                                <p>
                                    Mang đến những sản phẩm và dịch vụ công nghệ chất lượng cao với giá cả hợp lý,
                                    giúp khách hàng nâng cao hiệu suất làm việc và trải nghiệm giải trí.
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border border-blue-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-blue-600 rounded-lg">
                                        <TrendingUp className="text-white" size={24} />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">Tầm nhìn</h2>
                                </div>
                                <p>
                                    Trở thành chuỗi cửa hàng máy tính hàng đầu tại Việt Nam, được công nhận
                                    bởi chất lượng sản phẩm, dịch vụ xuất sắc và sự tin cậy của khách hàng.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Award className="text-[#D70018]" size={28} />
                                Giá trị cốt lõi
                            </h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-[#D70018] text-white rounded-full flex items-center justify-center font-bold">
                                        1
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 mb-1">Chất lượng</h3>
                                        <p className="text-sm">Cam kết cung cấp sản phẩm chính hãng, chất lượng cao</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-[#D70018] text-white rounded-full flex items-center justify-center font-bold">
                                        2
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 mb-1">Uy tín</h3>
                                        <p className="text-sm">Minh bạch trong giá cả và chính sách bảo hành</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-[#D70018] text-white rounded-full flex items-center justify-center font-bold">
                                        3
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 mb-1">Tận tâm</h3>
                                        <p className="text-sm">Luôn lắng nghe và hỗ trợ khách hàng tận tình</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-[#D70018] text-white rounded-full flex items-center justify-center font-bold">
                                        4
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 mb-1">Đổi mới</h3>
                                        <p className="text-sm">Cập nhật công nghệ mới nhất trên thị trường</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Users className="text-[#D70018]" size={28} />
                                Đội ngũ của chúng tôi
                            </h2>
                            <p className="mb-4">
                                Quang Hưởng Computer tự hào có đội ngũ nhân viên chuyên nghiệp, được đào tạo bài bản
                                và có kinh nghiệm nhiều năm trong ngành công nghệ:
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Đội ngũ kỹ thuật viên am hiểu sâu về phần cứng và phần mềm</li>
                                <li>Nhân viên tư vấn nhiệt tình, chuyên nghiệp</li>
                                <li>Bộ phận chăm sóc khách hàng luôn sẵn sàng hỗ trợ 24/7</li>
                                <li>Chuyên gia xây dựng cấu hình PC tối ưu cho mọi nhu cầu</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Sản phẩm & Dịch vụ</h2>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <h3 className="font-bold text-gray-900 mb-2">Sản phẩm</h3>
                                    <ul className="text-sm space-y-1">
                                        <li>• Laptop, PC Gaming</li>
                                        <li>• Linh kiện máy tính</li>
                                        <li>• Màn hình, bàn phím</li>
                                        <li>• Phụ kiện gaming</li>
                                    </ul>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <h3 className="font-bold text-gray-900 mb-2">Dịch vụ</h3>
                                    <ul className="text-sm space-y-1">
                                        <li>• Xây dựng cấu hình PC</li>
                                        <li>• Sửa chữa, bảo hành</li>
                                        <li>• Nâng cấp máy tính</li>
                                        <li>• Tư vấn giải pháp IT</li>
                                    </ul>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <h3 className="font-bold text-gray-900 mb-2">Hỗ trợ</h3>
                                    <ul className="text-sm space-y-1">
                                        <li>• Tư vấn miễn phí</li>
                                        <li>• Giao hàng toàn quốc</li>
                                        <li>• Thanh toán linh hoạt</li>
                                        <li>• Bảo hành uy tín</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Thông tin công ty</h2>
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="font-semibold mb-1">Tên công ty:</p>
                                        <p>Công ty Cổ phần Máy tính Quang Hưởng</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold mb-1">Mã số thuế:</p>
                                        <p>0123456789</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold mb-1">Địa chỉ:</p>
                                        <p>91 Nguyễn Xiển, Hạ Đình, Thanh Xuân, Hà Nội</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold mb-1">Hotline:</p>
                                        <p className="text-[#D70018] font-bold">1800.6321</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold mb-1">Email:</p>
                                        <p>kinhdoanh@qhcomputer.com</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold mb-1">Giờ làm việc:</p>
                                        <p>Thứ 2 - Chủ nhật: 8:00 - 21:00</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="bg-gradient-to-r from-[#D70018] to-red-600 text-white p-8 rounded-2xl mt-8">
                            <h2 className="text-2xl font-bold mb-4">Cam kết của chúng tôi</h2>
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div className="flex gap-2">
                                    <span className="text-2xl">✓</span>
                                    <p>100% sản phẩm chính hãng, nguồn gốc rõ ràng</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-2xl">✓</span>
                                    <p>Giá cả cạnh tranh nhất thị trường</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-2xl">✓</span>
                                    <p>Bảo hành chính hãng, hỗ trợ tận tâm</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-2xl">✓</span>
                                    <p>Đổi trả dễ dàng trong 7 ngày</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-8">
                            <p className="text-sm">
                                <strong>Liên hệ với chúng tôi:</strong> Để biết thêm thông tin về sản phẩm và dịch vụ,
                                vui lòng <Link to="/contact" className="text-[#D70018] font-bold">liên hệ tại đây</Link> hoặc
                                gọi hotline <a href="tel:18006321" className="text-[#D70018] font-bold">1800.6321</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

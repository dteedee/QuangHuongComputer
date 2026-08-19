import { Link } from 'react-router-dom';
import { ChevronRight, Target, TrendingUp, Award, Users, ShieldCheck, Clock, Headphones, Package } from 'lucide-react';
import SEO from '../components/SEO';
import { useCompanyInfo } from '../hooks/use-company-info';

const stats = [
    { value: '10+', label: 'Năm kinh nghiệm' },
    { value: '5000+', label: 'Sản phẩm đã bán' },
    { value: '3000+', label: 'Khách hàng tin tưởng' },
    { value: '99%', label: 'Hài lòng' },
];

const values = [
    { num: '1', title: 'Chất lượng', desc: 'Cam kết cung cấp sản phẩm chính hãng, chất lượng cao' },
    { num: '2', title: 'Uy tín', desc: 'Minh bạch trong giá cả và chính sách bảo hành' },
    { num: '3', title: 'Tận tâm', desc: 'Luôn lắng nghe và hỗ trợ khách hàng tận tình' },
    { num: '4', title: 'Đổi mới', desc: 'Cập nhật công nghệ mới nhất trên thị trường' },
];

const commitments = [
    '100% sản phẩm chính hãng, nguồn gốc rõ ràng',
    'Giá cả cạnh tranh nhất thị trường',
    'Bảo hành chính hãng, hỗ trợ tận tâm',
    'Đổi trả dễ dàng trong 7 ngày',
];

export const AboutPage = () => {
    const { companyInfo: company } = useCompanyInfo();
    return (
        <div className="bg-gray-50 min-h-screen pb-16">
            <SEO title="Giới thiệu" description="Tìm hiểu về Quang Hưởng Computer - Đơn vị hàng đầu cung cấp giải pháp máy tính, linh kiện và dịch vụ sửa chữa chuyên nghiệp với hơn 10 năm kinh nghiệm." />

            {/* Breadcrumb */}
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-accent font-medium cursor-pointer">Trang chủ</Link>
                    <ChevronRight size={14} className="text-gray-400" />
                    <span className="text-gray-900 font-medium">Giới thiệu</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-8 space-y-8">
                {/* Hero */}
                <div className="bg-gradient-to-br from-accent to-red-700 rounded-xl p-8 md:p-12 text-white">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Quang Hưởng Computer</h1>
                    <p className="text-white/90 text-lg max-w-2xl leading-relaxed">
                        Một trong những đơn vị hàng đầu tại Việt Nam chuyên cung cấp các giải pháp máy tính,
                        linh kiện và dịch vụ sửa chữa bảo hành chuyên nghiệp. Với hơn 10 năm kinh nghiệm,
                        chúng tôi tự hào là đối tác tin cậy của hàng ngàn khách hàng cá nhân và doanh nghiệp.
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((s) => (
                        <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
                            <div className="text-3xl font-black text-accent mb-1">{s.value}</div>
                            <div className="text-sm text-gray-500 font-medium">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Mission & Vision */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-red-50 rounded-lg"><Target className="text-accent" size={22} /></div>
                            <h2 className="text-xl font-bold text-gray-900">Sứ mệnh</h2>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                            Mang đến những sản phẩm và dịch vụ công nghệ chất lượng cao với giá cả hợp lý,
                            giúp khách hàng nâng cao hiệu suất làm việc và trải nghiệm giải trí.
                        </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-blue-50 rounded-lg"><TrendingUp className="text-blue-600" size={22} /></div>
                            <h2 className="text-xl font-bold text-gray-900">Tầm nhìn</h2>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                            Trở thành chuỗi cửa hàng máy tính hàng đầu tại Việt Nam, được công nhận bởi
                            chất lượng sản phẩm, dịch vụ xuất sắc và sự tin cậy của khách hàng.
                        </p>
                    </div>
                </div>

                {/* Core Values */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 md:p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Award className="text-accent" size={24} /> Giá trị cốt lõi
                    </h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        {values.map((v) => (
                            <div key={v.num} className="flex gap-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center font-bold text-sm">{v.num}</div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-0.5">{v.title}</h3>
                                    <p className="text-sm text-gray-600">{v.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Team */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 md:p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Users className="text-accent" size={24} /> Đội ngũ của chúng tôi
                    </h2>
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: Award, text: 'Kỹ thuật viên am hiểu sâu về phần cứng và phần mềm' },
                            { icon: Headphones, text: 'Nhân viên tư vấn nhiệt tình, chuyên nghiệp' },
                            { icon: Clock, text: 'Bộ phận CSKH hỗ trợ 24/7' },
                            { icon: Package, text: 'Chuyên gia xây dựng cấu hình PC tối ưu' },
                        ].map((item, i) => (
                            <div key={i} className="flex gap-3 items-start">
                                <item.icon size={18} className="text-accent mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-600">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Commitments */}
                <div className="bg-gradient-to-r from-accent to-red-700 rounded-xl p-6 md:p-8 text-white">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <ShieldCheck size={22} /> Cam kết của chúng tôi
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                        {commitments.map((c, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <ShieldCheck size={16} className="flex-shrink-0" /> {c}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Company Info */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 md:p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Thông tin công ty</h2>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div><span className="text-gray-500">Tên công ty:</span> <span className="font-medium text-gray-900">{company.name}</span></div>
                        <div><span className="text-gray-500">MST:</span> <span className="font-medium text-gray-900">{company.taxCode}</span></div>
                        <div className="sm:col-span-2"><span className="text-gray-500">Địa chỉ:</span> <span className="font-medium text-gray-900">{company.address}</span></div>
                        <div><span className="text-gray-500">Hotline:</span> <span className="font-bold text-accent">{company.phone2} - {company.phone}</span></div>
                        <div><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-900">{company.email}</span></div>
                        <div><span className="text-gray-500">Giờ làm việc:</span> <span className="font-medium text-gray-900">{company.workingHours}</span></div>
                    </div>
                </div>

                {/* CTA */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
                    <p className="text-sm text-gray-700">
                        <strong>Liên hệ với chúng tôi:</strong> Vui lòng{' '}
                        <Link to="/contact" className="text-accent font-bold hover:underline cursor-pointer">liên hệ tại đây</Link> hoặc
                        gọi hotline <a href={`tel:${company.phone2.replace(/\D/g, '')}`} className="text-accent font-bold cursor-pointer">{company.phone2}</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

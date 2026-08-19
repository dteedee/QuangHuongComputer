import { Link } from 'react-router-dom';
import { ChevronRight, Target, TrendingUp, Award, Users, ShieldCheck, Clock, Headphones, Package } from 'lucide-react';
import SEO from '../components/SEO';
import { useCompanyInfo } from '../hooks/use-company-info';

const stats = [
    { value: '10+', label: 'Nam kinh nghiem' },
    { value: '5000+', label: 'San pham da ban' },
    { value: '3000+', label: 'Khach hang tin tuong' },
    { value: '99%', label: 'Hai long' },
];

const values = [
    { num: '1', title: 'Chat luong', desc: 'Cam ket cung cap san pham chinh hang, chat luong cao' },
    { num: '2', title: 'Uy tin', desc: 'Minh bach trong gia ca va chinh sach bao hanh' },
    { num: '3', title: 'Tan tam', desc: 'Luon lang nghe va ho tro khach hang tan tinh' },
    { num: '4', title: 'Doi moi', desc: 'Cap nhat cong nghe moi nhat tren thi truong' },
];

const commitments = [
    '100% san pham chinh hang, nguon goc ro rang',
    'Gia ca canh tranh nhat thi truong',
    'Bao hanh chinh hang, ho tro tan tam',
    'Doi tra de dang trong 7 ngay',
];

export const AboutPage = () => {
    const { companyInfo: company } = useCompanyInfo();
    return (
        <div className="bg-gray-50 min-h-screen pb-16">
            <SEO title="Gioi thieu" description="Tim hieu ve Quang Huong Computer - Don vi hang dau cung cap giai phap may tinh, linh kien va dich vu sua chua chuyen nghiep voi hon 10 nam kinh nghiem." />

            {/* Breadcrumb */}
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-accent font-medium cursor-pointer">Trang chu</Link>
                    <ChevronRight size={14} className="text-gray-400" />
                    <span className="text-gray-900 font-medium">Gioi thieu</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-8 space-y-8">
                {/* Hero */}
                <div className="bg-gradient-to-br from-accent to-red-700 rounded-xl p-8 md:p-12 text-white">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Quang Huong Computer</h1>
                    <p className="text-white/90 text-lg max-w-2xl leading-relaxed">
                        Mot trong nhung don vi hang dau tai Viet Nam chuyen cung cap cac giai phap may tinh,
                        linh kien va dich vu sua chua bao hanh chuyen nghiep. Voi hon 10 nam kinh nghiem,
                        chung toi tu hao la doi tac tin cay cua hang ngan khach hang ca nhan va doanh nghiep.
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
                            <h2 className="text-xl font-bold text-gray-900">Su menh</h2>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                            Mang den nhung san pham va dich vu cong nghe chat luong cao voi gia ca hop ly,
                            giup khach hang nang cao hieu suat lam viec va trai nghiem giai tri.
                        </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-blue-50 rounded-lg"><TrendingUp className="text-blue-600" size={22} /></div>
                            <h2 className="text-xl font-bold text-gray-900">Tam nhin</h2>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                            Tro thanh chuoi cua hang may tinh hang dau tai Viet Nam, duoc cong nhan boi
                            chat luong san pham, dich vu xuat sac va su tin cay cua khach hang.
                        </p>
                    </div>
                </div>

                {/* Core Values */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 md:p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Award className="text-accent" size={24} /> Gia tri cot loi
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
                        <Users className="text-accent" size={24} /> Doi ngu cua chung toi
                    </h2>
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: Award, text: 'Ky thuat vien am hieu sau ve phan cung va phan mem' },
                            { icon: Headphones, text: 'Nhan vien tu van nhiet tinh, chuyen nghiep' },
                            { icon: Clock, text: 'Bo phan CSKH ho tro 24/7' },
                            { icon: Package, text: 'Chuyen gia xay dung cau hinh PC toi uu' },
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
                        <ShieldCheck size={22} /> Cam ket cua chung toi
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
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Thong tin cong ty</h2>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div><span className="text-gray-500">Ten cong ty:</span> <span className="font-medium text-gray-900">{company.name}</span></div>
                        <div><span className="text-gray-500">MST:</span> <span className="font-medium text-gray-900">{company.taxCode}</span></div>
                        <div className="sm:col-span-2"><span className="text-gray-500">Dia chi:</span> <span className="font-medium text-gray-900">{company.address}</span></div>
                        <div><span className="text-gray-500">Hotline:</span> <span className="font-bold text-accent">{company.phone2} - {company.phone}</span></div>
                        <div><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-900">{company.email}</span></div>
                        <div><span className="text-gray-500">Gio lam viec:</span> <span className="font-medium text-gray-900">{company.workingHours}</span></div>
                    </div>
                </div>

                {/* CTA */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
                    <p className="text-sm text-gray-700">
                        <strong>Lien he voi chung toi:</strong> Vui long{' '}
                        <Link to="/contact" className="text-accent font-bold hover:underline cursor-pointer">lien he tai day</Link> hoac
                        goi hotline <a href={`tel:${company.phone2.replace(/\D/g, '')}`} className="text-accent font-bold cursor-pointer">{company.phone2}</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

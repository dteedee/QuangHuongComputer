import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    ChevronRight,
    Briefcase,
    MapPin,
    Clock,
    DollarSign,
    Search,
    Filter,
    ArrowRight,
    Loader2,
    Calendar,
    Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import { hrApi, type JobListing } from '../api/hr';

export const RecruitmentPage = () => {
    const [jobs, setJobs] = useState<JobListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('All');

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const data = await hrApi.getPublicJobListings();
                setJobs(data);
            } catch (error) {
                console.error('Failed to fetch jobs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, []);

    const departments = ['All', ...new Set(jobs.map(job => job.department))];

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = selectedDepartment === 'All' || job.department === selectedDepartment;
        return matchesSearch && matchesDept;
    });

    return (
        <div className="bg-gray-50 min-h-screen">
            <SEO
                title="Tuyển dụng"
                description="Gia nhập đội ngũ Quang Hưởng Computer. Chúng tôi luôn tìm kiếm những tài năng trẻ, nhiệt huyết để cùng nhau xây dựng hệ sinh thái công nghệ hàng đầu."
            />

            {/* Breadcrumb */}
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="container mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-[#D70018]">Trang chủ</Link>
                    <ChevronRight size={14} />
                    <span className="text-gray-900 font-medium">Tuyển dụng</span>
                </div>
            </div>

            {/* Hero Section */}
            <div className="bg-[#D70018] py-16 md:py-24 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-red-600 skew-x-12 transform translate-x-1/2 opacity-50"></div>
                <div className="container mx-auto px-4 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="max-w-3xl"
                    >
                        <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-6">
                            Gia nhập đội ngũ <br />
                            <span className="text-yellow-400">Tài năng</span> của chúng tôi
                        </h1>
                        <p className="text-xl md:text-2xl text-red-100 mb-8 font-light">
                            Xây dựng sự nghiệp tại Quang Hưởng Computer - Nơi đam mê công nghệ được tỏa sáng.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
                                <Users size={20} />
                                <span>+100 Nhân sự</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
                                <Briefcase size={20} />
                                <span>Môi trường năng động</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
                                <DollarSign size={20} />
                                <span>Chế độ hấp dẫn</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="container mx-auto px-4 -mt-8 relative z-20">
                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-gray-100 grid md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm vị trí..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <select
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all appearance-none"
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                        >
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept === 'All' ? 'Tất cả phòng ban' : dept}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center justify-center bg-gray-50 rounded-xl px-4 py-2 text-sm text-gray-500 font-medium">
                        Tìm thấy {filteredJobs.length} vị trí đang tuyển
                    </div>
                </div>
            </div>

            {/* Jobs List */}
            <div className="container mx-auto px-4 py-12">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-[#D70018]" size={48} />
                        <p className="mt-4 text-gray-500 font-medium">Đang tải danh sách công việc...</p>
                    </div>
                ) : filteredJobs.length > 0 ? (
                    <div className="grid gap-6">
                        {filteredJobs.map((job, index) => (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="group bg-white p-6 md:p-8 rounded-[32px] shadow-sm hover:shadow-xl transition-all border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="px-3 py-1 bg-red-50 text-[#D70018] text-xs font-bold rounded-full uppercase">
                                            {job.department}
                                        </span>
                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase">
                                            {job.jobType}
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-[#D70018] transition-colors">
                                        {job.title}
                                    </h3>
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin size={16} />
                                            <span>{job.location}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={16} />
                                            <span>Hạn nộp: {new Date(job.expiryDate).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        {job.salaryRangeMin && (
                                            <div className="flex items-center gap-1.5 text-green-600 font-semibold">
                                                <DollarSign size={16} />
                                                <span>
                                                    {job.salaryRangeMin.toLocaleString()} - {job.salaryRangeMax?.toLocaleString()} VNĐ
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Link
                                    to={`/recruitment/${job.id}`}
                                    className="flex items-center justify-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#D70018] transition-all transform hover:scale-105"
                                >
                                    Xem chi tiết
                                    <ArrowRight size={20} />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-[40px] p-20 text-center border border-dashed border-gray-300">
                        <Briefcase size={64} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-bold text-gray-900">Không tìm thấy vị trí phù hợp</h3>
                        <p className="text-gray-500">Hãy thử thay đổi từ khóa tìm kiếm hoặc lọc theo phòng ban khác.</p>
                    </div>
                )}
            </div>

            {/* Why Join Us */}
            <div className="bg-white py-20 border-t border-gray-100">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter mb-4">
                            Tại sao nên làm việc tại <br />
                            <span className="text-[#D70018]">Quang Hưởng Computer?</span>
                        </h2>
                        <div className="w-24 h-1.5 bg-[#D70018] mx-auto rounded-full"></div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Users size={32} />,
                                title: "Môi trường chuyên nghiệp",
                                desc: "Làm việc cùng những chuyên gia hàng đầu trong lĩnh vực công nghệ thông tin và bán lẻ."
                            },
                            {
                                icon: <Calendar size={32} />,
                                title: "Cơ hội thăng tiến",
                                desc: "Lộ trình nghề nghiệp rõ ràng, cơ hội đào tạo và phát triển bản thân không giới hạn."
                            },
                            {
                                icon: <Briefcase size={32} />,
                                title: "Phúc lợi xứng đáng",
                                desc: "Lương thưởng hấp dẫn, bảo hiểm đầy đủ và các hoạt động team building sôi động."
                            }
                        ].map((item, i) => (
                            <div key={i} className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-xl transition-all group">
                                <div className="p-4 bg-white text-[#D70018] w-16 h-16 rounded-2xl shadow-sm mb-6 flex items-center justify-center group-hover:bg-[#D70018] group-hover:text-white transition-all">
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

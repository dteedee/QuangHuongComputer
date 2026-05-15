import { useState, useEffect } from 'react';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Link } from 'react-router-dom';
import {
    ChevronRight,
    Briefcase,
    MapPin,
    Clock,
    DollarSign,
    Search,
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
        const matchesSearch =
            job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = selectedDepartment === 'All' || job.department === selectedDepartment;
        return matchesSearch && matchesDept;
    });

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            <SEO
                title="Tuyển dụng"
                description="Gia nhập đội ngũ Quang Hưởng Computer. Chúng tôi luôn tìm kiếm những tài năng trẻ, nhiệt huyết để cùng nhau xây dựng hệ sinh thái công nghệ hàng đầu."
            />

            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-accent transition-colors">Trang chủ</Link>
                    <ChevronRight size={14} />
                    <span className="text-gray-900 font-medium">Tuyển dụng</span>
                </div>
            </div>

            {/* Hero */}
            <div className="bg-accent py-14 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-red-600 skew-x-12 transform translate-x-1/2 opacity-50" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="max-w-3xl"
                    >
                        <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
                            Gia nhập đội ngũ <br />
                            <span className="text-yellow-400">Tài năng</span> của chúng tôi
                        </h1>
                        <p className="text-lg text-red-100 mb-7">
                            Xây dựng sự nghiệp tại Quang Hưởng Computer — nơi đam mê công nghệ được tỏa sáng.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm border border-white/20">
                                <Users size={16} />
                                <span>+100 Nhân sự</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm border border-white/20">
                                <Briefcase size={16} />
                                <span>Môi trường năng động</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm border border-white/20">
                                <DollarSign size={16} />
                                <span>Chế độ hấp dẫn</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Filter bar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-7 relative z-20">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 grid md:grid-cols-3 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm vị trí..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div>
                        <SearchableSelect
                            value={selectedDepartment}
                            onChange={(val) => setSelectedDepartment(val)}
                            options={departments.map(dept => ({
                                value: dept,
                                label: dept === 'All' ? 'Tất cả phòng ban' : dept,
                            }))}
                            placeholder="Chọn phòng ban"
                        />
                    </div>
                    <div className="flex items-center justify-center bg-gray-50 rounded-xl px-4 py-2 text-sm text-gray-500 font-medium">
                        Tìm thấy {filteredJobs.length} vị trí đang tuyển
                    </div>
                </div>
            </div>

            {/* Jobs list */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="animate-spin text-accent" size={40} />
                        <p className="mt-4 text-gray-500 text-sm">Đang tải danh sách công việc...</p>
                    </div>
                ) : filteredJobs.length > 0 ? (
                    <div className="grid gap-4">
                        {filteredJobs.map((job, index) => (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.07 }}
                                className="group bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-gray-200 hover:shadow-md transition-all"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2.5 py-0.5 bg-red-50 text-accent text-xs font-semibold rounded-full">
                                            {job.department}
                                        </span>
                                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                                            {job.jobType}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-accent transition-colors">
                                        {job.title}
                                    </h3>
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin size={15} />
                                            <span>{job.location}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={15} />
                                            <span>Hạn nộp: {new Date(job.expiryDate).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        {job.salaryRangeMin && (
                                            <div className="flex items-center gap-1.5 text-green-600 font-semibold">
                                                <DollarSign size={15} />
                                                <span>
                                                    {job.salaryRangeMin.toLocaleString()} - {job.salaryRangeMax?.toLocaleString()} VNĐ
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Link
                                    to={`/recruitment/${job.id}`}
                                    className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-accent text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer"
                                >
                                    Xem chi tiết
                                    <ArrowRight size={16} />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
                        <Briefcase size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Không tìm thấy vị trí phù hợp</h3>
                        <p className="text-gray-500 text-sm">Hãy thử thay đổi từ khóa tìm kiếm hoặc lọc theo phòng ban khác.</p>
                    </div>
                )}
            </div>

            {/* Why Join Us */}
            <div className="bg-white py-16 border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Tại sao nên làm việc tại{' '}
                            <span className="text-accent">Quang Hưởng Computer?</span>
                        </h2>
                        <div className="w-16 h-1 bg-accent mx-auto rounded-full" />
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: <Users size={28} />,
                                title: 'Môi trường chuyên nghiệp',
                                desc: 'Làm việc cùng những chuyên gia hàng đầu trong lĩnh vực công nghệ thông tin và bán lẻ.'
                            },
                            {
                                icon: <Calendar size={28} />,
                                title: 'Cơ hội thăng tiến',
                                desc: 'Lộ trình nghề nghiệp rõ ràng, cơ hội đào tạo và phát triển bản thân không giới hạn.'
                            },
                            {
                                icon: <Briefcase size={28} />,
                                title: 'Phúc lợi xứng đáng',
                                desc: 'Lương thưởng hấp dẫn, bảo hiểm đầy đủ và các hoạt động team building sôi động.'
                            }
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all group"
                            >
                                <div className="w-12 h-12 bg-red-50 text-accent rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent group-hover:text-white transition-all">
                                    {item.icon}
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

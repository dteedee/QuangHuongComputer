import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ChevronRight,
    MapPin,
    Clock,
    DollarSign,
    Calendar,
    Briefcase,
    Share2,
    CheckCircle2,
    ArrowLeft,
    Loader2,
    Building2,
    Send,
    ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import { hrApi, type JobListing } from '../api/hr';
import { toast } from 'react-hot-toast';

export const JobDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const [job, setJob] = useState<JobListing | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const fetchJobDetail = async () => {
            try {
                const data = await hrApi.getPublicJobDetail(id);
                setJob(data);
            } catch (error) {
                console.error('Failed to fetch job detail:', error);
                toast.error('Không tìm thấy thông tin tuyển dụng');
            } finally {
                setLoading(false);
            }
        };
        fetchJobDetail();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="animate-spin text-[#D70018] mx-auto" size={48} />
                    <p className="mt-4 text-gray-500 font-medium">Đang tải thông tin...</p>
                </div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <Briefcase size={64} className="text-gray-300 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Vị trí không tồn tại</h1>
                <p className="text-gray-500 mb-6 text-center">Tin tuyển dụng này có thể đã hết hạn hoặc bị gỡ bỏ.</p>
                <Link to="/recruitment" className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-[#D70018] transition-all">
                    Quay lại danh sách
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <SEO
                title={job.title}
                description={job.description.substring(0, 160)}
            />

            {/* Breadcrumb */}
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="container mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-[#D70018]">Trang chủ</Link>
                    <ChevronRight size={14} />
                    <Link to="/recruitment" className="hover:text-[#D70018]">Tuyển dụng</Link>
                    <ChevronRight size={14} />
                    <span className="text-gray-900 font-medium truncate max-w-[200px] md:max-w-none">{job.title}</span>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-8">
                <Link to="/recruitment" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#D70018] font-medium mb-6 transition-colors">
                    <ArrowLeft size={18} />
                    Quay lại danh sách tuyển dụng
                </Link>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-8 md:p-10 rounded-[40px] shadow-sm border border-gray-100"
                        >
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="px-3 py-1 bg-red-50 text-[#D70018] text-xs font-bold rounded-full uppercase">
                                    {job.department}
                                </span>
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase">
                                    {job.jobType}
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-6">
                                {job.title}
                            </h1>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-8 border-b border-gray-100">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Địa điểm</p>
                                    <div className="flex items-center gap-1.5 text-gray-900 font-bold">
                                        <MapPin size={16} className="text-[#D70018]" />
                                        <span>{job.location}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Mức lương</p>
                                    <div className="flex items-center gap-1.5 text-green-600 font-bold">
                                        <DollarSign size={16} />
                                        <span>{job.salaryRangeMin ? `${job.salaryRangeMin.toLocaleString()} - ${job.salaryRangeMax?.toLocaleString()}` : 'Thỏa thuận'}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Hạn nộp</p>
                                    <div className="flex items-center gap-1.5 text-gray-900 font-bold">
                                        <Calendar size={16} className="text-[#D70018]" />
                                        <span>{new Date(job.expiryDate).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Hình thức</p>
                                    <div className="flex items-center gap-1.5 text-gray-900 font-bold">
                                        <Clock size={16} className="text-[#D70018]" />
                                        <span>{job.jobType}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="py-8 space-y-10">
                                <section>
                                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <div className="w-1.5 h-6 bg-[#D70018] rounded-full"></div>
                                        Mô tả công việc
                                    </h2>
                                    <div className="text-gray-600 leading-relaxed whitespace-pre-wrap pl-3">
                                        {job.description}
                                    </div>
                                </section>

                                <section>
                                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <div className="w-1.5 h-6 bg-[#D70018] rounded-full"></div>
                                        Yêu cầu ứng viên
                                    </h2>
                                    <div className="text-gray-600 leading-relaxed whitespace-pre-wrap pl-3">
                                        {job.requirements}
                                    </div>
                                </section>

                                <section>
                                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <div className="w-1.5 h-6 bg-[#D70018] rounded-full"></div>
                                        Quyền lợi được hưởng
                                    </h2>
                                    <div className="text-gray-600 leading-relaxed whitespace-pre-wrap pl-3">
                                        {job.benefits}
                                    </div>
                                </section>
                            </div>
                        </motion.div>
                    </div>

                    {/* Sidebar / Action Panel */}
                    <div className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-gray-900 text-white p-8 rounded-[40px] shadow-xl sticky top-24"
                        >
                            <h3 className="text-2xl font-bold mb-6 italic uppercase tracking-tighter">Ứng tuyển ngay</h3>
                            <p className="text-gray-400 text-sm mb-8">
                                Hãy gửi CV của bạn và gia nhập đội ngũ Quang Hưởng Computer để cùng chúng tôi chinh phục những thử thách mới.
                            </p>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-white/10 rounded-lg">
                                        <CheckCircle2 size={18} />
                                    </div>
                                    <p className="text-sm">Phản hồi nhanh chóng trong 24h</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-white/10 rounded-lg">
                                        <CheckCircle2 size={18} />
                                    </div>
                                    <p className="text-sm">Phỏng vấn trực tiếp hoặc Online</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-white/10 rounded-lg">
                                        <CheckCircle2 size={18} />
                                    </div>
                                    <p className="text-sm">Môi trường làm việc linh hoạt</p>
                                </div>
                            </div>

                            <button className="w-full bg-[#D70018] text-white py-4 rounded-2xl font-black uppercase italic text-lg hover:bg-red-600 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-red-900/20">
                                <Send size={24} />
                                Nộp đơn ứng tuyển
                            </button>

                            <button className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/10 hover:bg-white/5 transition-all font-medium">
                                <Share2 size={18} />
                                Chia sẻ tin tuyển dụng
                            </button>
                        </motion.div>

                        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 italic uppercase">Về Quang Hưởng Computer</h3>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-red-50 text-[#D70018] rounded-2xl">
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">QH Computer Joint Stock Company</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Thành lập từ 2014</p>
                                </div>
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed mb-6">
                                Một trong những đơn vị hàng đầu tại Việt Nam cung cấp giải pháp máy tính và thiết bị công nghệ.
                            </p>
                            <Link to="/about" className="text-[#D70018] font-bold text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
                                Tìm hiểu thêm về chúng tôi
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

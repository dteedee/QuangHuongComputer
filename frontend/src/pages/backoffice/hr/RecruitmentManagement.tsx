import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    MoreHorizontal,
    Eye,
    X,
    Check,
    Briefcase,
    Calendar,
    Loader2,
    Save,
    MapPin,
    DollarSign,
    Clock
} from 'lucide-react';
import { hrApi, type JobListing } from '../../../api/hr';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export const RecruitmentManagement = () => {
    const [jobs, setJobs] = useState<JobListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<Partial<JobListing> | null>(null);
    const [saving, setSaving] = useState(false);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const data = await hrApi.getAdminJobListings();
            setJobs(data);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
            toast.error('Không thể tải danh sách tuyển dụng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const handleOpenModal = (job: JobListing | null = null) => {
        if (job) {
            setEditingJob({ ...job });
        } else {
            setEditingJob({
                title: '',
                description: '',
                requirements: '',
                benefits: '',
                department: '',
                location: 'Hồ Chí Minh',
                jobType: 'Full-time',
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'Draft',
                salaryRangeMin: 0,
                salaryRangeMax: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingJob) return;

        setSaving(true);
        try {
            if (editingJob.id) {
                await hrApi.updateJobListing(editingJob.id, editingJob);
                toast.success('Cập nhật tin tuyển dụng thành công');
            } else {
                await hrApi.createJobListing(editingJob);
                toast.success('Đăng tin tuyển dụng thành công');
            }
            setIsModalOpen(false);
            fetchJobs();
        } catch (error) {
            toast.error('Lỗi khi lưu thông tin');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa tin tuyển dụng này?')) return;

        try {
            await hrApi.deleteJobListing(id);
            toast.success('Đã xóa tin tuyển dụng');
            fetchJobs();
        } catch (error) {
            toast.error('Lỗi khi xóa');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">Quản lý tuyển dụng</h1>
                    <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-bold">Quản lý tin đăng và ứng viên</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-[#D70018] text-white px-6 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-900/10 active:scale-95"
                >
                    <Plus size={20} />
                    Đăng tin mới
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm tin tuyển dụng..."
                            className="bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2 w-full text-sm focus:ring-2 focus:ring-red-500/20"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 uppercase text-[10px] font-black tracking-widest text-gray-500">
                            <tr>
                                <th className="px-6 py-4">Vị trí & Phòng ban</th>
                                <th className="px-6 py-4">Loại hình & Lương</th>
                                <th className="px-6 py-4">Thời hạn</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <Loader2 className="animate-spin text-[#D70018] mx-auto" size={32} />
                                    </td>
                                </tr>
                            ) : jobs.length > 0 ? (
                                jobs.map(job => (
                                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 group-hover:text-[#D70018] transition-colors">{job.title}</div>
                                            <div className="text-xs text-gray-500 font-bold uppercase tracking-tighter">{job.department}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 font-medium text-gray-700">
                                                <Clock size={14} className="text-blue-500" />
                                                {job.jobType}
                                            </div>
                                            <div className="flex items-center gap-1 text-green-600 font-bold">
                                                <DollarSign size={14} />
                                                {job.salaryRangeMin?.toLocaleString()} - {job.salaryRangeMax?.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <Calendar size={14} className="text-red-500" />
                                                {new Date(job.expiryDate).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${job.status === 'Active' ? 'bg-green-100 text-green-700' :
                                                job.status === 'Draft' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {job.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(job)}
                                                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(job.id)}
                                                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-bold uppercase italic">Chưa có tin tuyển dụng nào</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                        ></motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none">
                                        {editingJob?.id ? 'Chỉnh sửa tin' : 'Đăng tin mới'}
                                    </h2>
                                    <p className="text-gray-500 text-xs mt-1 uppercase font-bold tracking-widest leading-none">Điền thông tin vào các trường bên dưới</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white hover:shadow-sm rounded-2xl transition-all">
                                    <X size={24} className="text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-8 overflow-y-auto custom-scrollbar">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Tiêu đề vị trí</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-3.5 focus:ring-2 focus:ring-red-500/20 font-bold"
                                            value={editingJob?.title}
                                            onChange={e => setEditingJob({ ...editingJob!, title: e.target.value })}
                                            placeholder="VD: Kỹ thuật viên phần cứng..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Phòng ban</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-3.5 focus:ring-2 focus:ring-red-500/20 font-bold"
                                            value={editingJob?.department}
                                            onChange={e => setEditingJob({ ...editingJob!, department: e.target.value })}
                                            placeholder="VD: Kỹ thuật, Kinh doanh..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Địa điểm</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-3.5 focus:ring-2 focus:ring-red-500/20 font-bold"
                                            value={editingJob?.location}
                                            onChange={e => setEditingJob({ ...editingJob!, location: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Loại hình</label>
                                        <select
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-3.5 focus:ring-2 focus:ring-red-500/20 font-bold appearance-none"
                                            value={editingJob?.jobType}
                                            onChange={e => setEditingJob({ ...editingJob!, jobType: e.target.value })}
                                        >
                                            <option value="Full-time">Toàn thời gian</option>
                                            <option value="Part-time">Bán thời gian</option>
                                            <option value="Contract">Hợp đồng</option>
                                            <option value="Freelance">Freelance</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Hạn nộp hồ sơ</label>
                                        <input
                                            required
                                            type="date"
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-3.5 focus:ring-2 focus:ring-red-500/20 font-bold"
                                            value={editingJob?.expiryDate?.split('T')[0]}
                                            onChange={e => setEditingJob({ ...editingJob!, expiryDate: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Lương tối thiểu (VNĐ)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-3.5 focus:ring-2 focus:ring-red-500/20 font-bold"
                                            value={editingJob?.salaryRangeMin}
                                            onChange={e => setEditingJob({ ...editingJob!, salaryRangeMin: Number(e.target.value) })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Lương tối đa (VNĐ)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-3.5 focus:ring-2 focus:ring-red-500/20 font-bold"
                                            value={editingJob?.salaryRangeMax}
                                            onChange={e => setEditingJob({ ...editingJob!, salaryRangeMax: Number(e.target.value) })}
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Mô tả công việc</label>
                                        <textarea
                                            rows={3}
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-3.5 focus:ring-2 focus:ring-red-500/20 font-bold"
                                            value={editingJob?.description}
                                            onChange={e => setEditingJob({ ...editingJob!, description: e.target.value })}
                                        ></textarea>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Yêu cầu ứng viên</label>
                                        <textarea
                                            rows={3}
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-3.5 focus:ring-2 focus:ring-red-500/20 font-bold"
                                            value={editingJob?.requirements}
                                            onChange={e => setEditingJob({ ...editingJob!, requirements: e.target.value })}
                                        ></textarea>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Quyền lợi</label>
                                        <textarea
                                            rows={3}
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-3.5 focus:ring-2 focus:ring-red-500/20 font-bold"
                                            value={editingJob?.benefits}
                                            onChange={e => setEditingJob({ ...editingJob!, benefits: e.target.value })}
                                        ></textarea>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Trạng thái</label>
                                        <select
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-3.5 focus:ring-2 focus:ring-red-500/20 font-bold appearance-none"
                                            value={editingJob?.status}
                                            onChange={e => setEditingJob({ ...editingJob!, status: e.target.value as any })}
                                        >
                                            <option value="Draft">Nháp</option>
                                            <option value="Active">Hoạt động</option>
                                            <option value="Closed">Đóng</option>
                                            <option value="Archived">Lưu trữ</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-10">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-3xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 bg-gray-900 text-white py-4 rounded-3xl font-black uppercase italic text-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-gray-200"
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                                        Lưu thông tin
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

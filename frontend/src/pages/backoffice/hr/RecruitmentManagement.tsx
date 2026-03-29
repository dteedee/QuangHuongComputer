import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Eye,
    X,
    Check,
    Briefcase,
    Calendar,
    Loader2,
    Save,
    MapPin,
    DollarSign,
    Clock,
    Power,
    PowerOff
} from 'lucide-react';
import { hrApi, type JobListing } from '../../../api/hr';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfirm } from '../../../context/ConfirmContext';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';

export const RecruitmentManagement = () => {
    const [jobs, setJobs] = useState<JobListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<Partial<JobListing> | null>(null);
    const [saving, setSaving] = useState(false);
    const confirm = useConfirm();

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

    const handleToggleStatus = async (job: JobListing) => {
        const newStatus = job.status === 'Active' ? 'Closed' : 'Active';
        const action = newStatus === 'Active' ? 'kích hoạt' : 'đóng';
        const ok = await confirm({ message: `Bạn có chắc chắn muốn ${action} tin tuyển dụng "${job.title}"?`, variant: 'warning' });
        if (!ok) return;

        try {
            await hrApi.updateJobListing(job.id, { ...job, status: newStatus });
            toast.success(newStatus === 'Active' ? 'Đã kích hoạt tin tuyển dụng!' : 'Đã đóng tin tuyển dụng!');
            fetchJobs();
        } catch (error) {
            toast.error('Lỗi khi cập nhật trạng thái');
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
                    className="bg-accent text-white px-6 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-accent-hover transition-all shadow-lg shadow-accent-dark/10 active:scale-95"
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
                            className="bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2 w-full text-sm text-gray-900 focus:ring-2 focus:ring-accent/20 placeholder:text-gray-400"
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
                                        <Loader2 className="animate-spin text-accent mx-auto" size={32} />
                                    </td>
                                </tr>
                            ) : jobs.length > 0 ? (
                                jobs.map(job => (
                                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 group-hover:text-accent transition-colors">{job.title}</div>
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
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(job)}
                                                    className={`p-2 rounded-lg transition-all ${
                                                        job.status === 'Active'
                                                            ? 'hover:bg-amber-50 text-amber-600'
                                                            : 'hover:bg-emerald-50 text-emerald-600'
                                                    }`}
                                                    title={job.status === 'Active' ? 'Đóng tin' : 'Kích hoạt'}
                                                >
                                                    {job.status === 'Active' ? <PowerOff size={16} /> : <Power size={16} />}
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
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingJob?.id ? 'Chỉnh sửa tin' : 'Đăng tin mới'}
                description="Điền thông tin vào các trường bên dưới"
            >
                <form onSubmit={handleSave} className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input
                                label="Tiêu đề vị trí *"
                                required
                                value={editingJob?.title}
                                onChange={e => setEditingJob({ ...editingJob!, title: e.target.value })}
                                placeholder="VD: Kỹ thuật viên phần cứng..."
                            />
                        </div>

                        <Input
                            label="Phòng ban *"
                            required
                            value={editingJob?.department}
                            onChange={e => setEditingJob({ ...editingJob!, department: e.target.value })}
                            placeholder="VD: Kỹ thuật, Kinh doanh..."
                        />

                        <Input
                            label="Địa điểm *"
                            required
                            value={editingJob?.location}
                            onChange={e => setEditingJob({ ...editingJob!, location: e.target.value })}
                        />

                        <Select
                            label="Loại hình *"
                            value={editingJob?.jobType || 'Full-time'}
                            onChange={e => setEditingJob({ ...editingJob!, jobType: e.target.value })}
                            options={[
                                { label: 'Toàn thời gian', value: 'Full-time' },
                                { label: 'Bán thời gian', value: 'Part-time' },
                                { label: 'Hợp đồng', value: 'Contract' },
                                { label: 'Freelance', value: 'Freelance' }
                            ]}
                        />

                        <Input
                            label="Hạn nộp hồ sơ *"
                            required
                            type="date"
                            value={editingJob?.expiryDate?.split('T')[0] || ''}
                            onChange={e => setEditingJob({ ...editingJob!, expiryDate: e.target.value })}
                        />

                        <Input
                            label="Lương tối thiểu (VNĐ)"
                            type="number"
                            value={editingJob?.salaryRangeMin || 0}
                            onChange={e => setEditingJob({ ...editingJob!, salaryRangeMin: Number(e.target.value) })}
                        />

                        <Input
                            label="Lương tối đa (VNĐ)"
                            type="number"
                            value={editingJob?.salaryRangeMax || 0}
                            onChange={e => setEditingJob({ ...editingJob!, salaryRangeMax: Number(e.target.value) })}
                        />

                        <div className="md:col-span-2">
                            <Textarea
                                label="Mô tả công việc"
                                rows={3}
                                value={editingJob?.description || ''}
                                onChange={e => setEditingJob({ ...editingJob!, description: e.target.value })}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <Textarea
                                label="Yêu cầu ứng viên"
                                rows={3}
                                value={editingJob?.requirements || ''}
                                onChange={e => setEditingJob({ ...editingJob!, requirements: e.target.value })}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <Textarea
                                label="Quyền lợi"
                                rows={3}
                                value={editingJob?.benefits || ''}
                                onChange={e => setEditingJob({ ...editingJob!, benefits: e.target.value })}
                            />
                        </div>

                        <Select
                            label="Trạng thái *"
                            value={editingJob?.status || 'Draft'}
                            onChange={e => setEditingJob({ ...editingJob!, status: e.target.value as any })}
                            options={[
                                { label: 'Nháp', value: 'Draft' },
                                { label: 'Hoạt động', value: 'Active' },
                                { label: 'Đóng', value: 'Closed' },
                                { label: 'Lưu trữ', value: 'Archived' }
                            ]}
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 uppercase text-sm tracking-widest"
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            loading={saving}
                            icon={Save}
                            className="flex-[2] uppercase text-sm tracking-widest bg-gray-900 border-none hover:bg-gray-800"
                        >
                            Lưu thông tin
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

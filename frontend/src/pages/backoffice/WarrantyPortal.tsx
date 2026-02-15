import { useState, useEffect } from 'react';
import {
    Shield, Search, CheckCircle, XCircle, Clock, AlertCircle, Package, Calendar,
    FileText, Check, X, Wrench, RefreshCw, Eye, ChevronRight, Filter,
    MessageSquare, User, ArrowRight
} from 'lucide-react';
import { warrantyApi } from '../../api/warranty';
import type { ClaimStatus } from '../../api/warranty';
import toast from 'react-hot-toast';

type TabType = 'warranties' | 'claims';

interface ClaimDetailModalProps {
    claim: any;
    onClose: () => void;
    onApprove: (id: string) => void;
    onReject: (id: string, reason: string) => void;
    onResolve: (id: string, notes: string) => void;
}

const ClaimDetailModal = ({ claim, onClose, onApprove, onReject, onResolve }: ClaimDetailModalProps) => {
    const [rejectReason, setRejectReason] = useState('');
    const [resolveNotes, setResolveNotes] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [showResolveForm, setShowResolveForm] = useState(false);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Approved': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Chi tiết yêu cầu bảo hành</h2>
                            <p className="text-gray-400 text-sm mt-1">ID: {claim.id.substring(0, 8)}...</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <X className="w-6 h-6 text-white" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                        <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${getStatusColor(claim.status)}`}>
                            {claim.status === 'Pending' && 'Chờ xử lý'}
                            {claim.status === 'Approved' && 'Đã duyệt'}
                            {claim.status === 'Resolved' && 'Hoàn thành'}
                            {claim.status === 'Rejected' && 'Từ chối'}
                        </span>
                        <span className="text-sm text-gray-500">
                            {new Date(claim.filedDate).toLocaleDateString('vi-VN', {
                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                    </div>

                    {/* Serial & Customer */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-gray-50 rounded-2xl p-5">
                            <p className="text-xs text-gray-500 font-bold uppercase mb-2">Serial Number</p>
                            <p className="font-mono font-black text-gray-900">{claim.serialNumber}</p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-5">
                            <p className="text-xs text-gray-500 font-bold uppercase mb-2">Phương thức mong muốn</p>
                            <p className="font-bold text-gray-900">
                                {claim.preferredResolution === 'Repair' && 'Sửa chữa'}
                                {claim.preferredResolution === 'Replace' && 'Đổi mới'}
                                {claim.preferredResolution === 'Refund' && 'Hoàn tiền'}
                            </p>
                        </div>
                    </div>

                    {/* Issue Description */}
                    <div className="bg-gray-50 rounded-2xl p-5">
                        <p className="text-xs text-gray-500 font-bold uppercase mb-2">Mô tả lỗi</p>
                        <p className="text-gray-900">{claim.issueDescription}</p>
                    </div>

                    {/* Warranty Info */}
                    {claim.warranty && (
                        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                            <p className="text-xs text-blue-600 font-bold uppercase mb-3 flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Thông tin bảo hành
                            </p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Ngày mua:</span>
                                    <span className="ml-2 font-bold">{new Date(claim.warranty.purchaseDate).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Hết hạn:</span>
                                    <span className="ml-2 font-bold">{new Date(claim.warranty.expirationDate).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Thời hạn:</span>
                                    <span className="ml-2 font-bold">{claim.warranty.warrantyPeriodMonths} tháng</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Trạng thái:</span>
                                    <span className={`ml-2 font-bold ${claim.warranty.isValid ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {claim.warranty.isValid ? 'Còn hiệu lực' : 'Hết hạn'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Resolution Notes */}
                    {claim.resolutionNotes && (
                        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                            <p className="text-xs text-amber-600 font-bold uppercase mb-2">Ghi chú xử lý</p>
                            <p className="text-gray-900">{claim.resolutionNotes}</p>
                            {claim.resolvedDate && (
                                <p className="text-sm text-gray-500 mt-2">
                                    Xử lý lúc: {new Date(claim.resolvedDate).toLocaleDateString('vi-VN', {
                                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Reject Form */}
                    {showRejectForm && (
                        <div className="bg-red-50 rounded-2xl p-5 border border-red-100 space-y-4">
                            <p className="text-sm font-bold text-red-700">Lý do từ chối:</p>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Nhập lý do từ chối..."
                                className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:border-red-400 outline-none resize-none"
                                rows={3}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { onReject(claim.id, rejectReason); onClose(); }}
                                    disabled={!rejectReason.trim()}
                                    className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl disabled:opacity-50"
                                >
                                    Xác nhận từ chối
                                </button>
                                <button onClick={() => setShowRejectForm(false)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl">
                                    Hủy
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Resolve Form */}
                    {showResolveForm && (
                        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 space-y-4">
                            <p className="text-sm font-bold text-emerald-700">Ghi chú hoàn thành:</p>
                            <textarea
                                value={resolveNotes}
                                onChange={(e) => setResolveNotes(e.target.value)}
                                placeholder="Mô tả công việc đã thực hiện..."
                                className="w-full px-4 py-3 border-2 border-emerald-200 rounded-xl focus:border-emerald-400 outline-none resize-none"
                                rows={3}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { onResolve(claim.id, resolveNotes); onClose(); }}
                                    disabled={!resolveNotes.trim()}
                                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50"
                                >
                                    Hoàn thành xử lý
                                </button>
                                <button onClick={() => setShowResolveForm(false)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl">
                                    Hủy
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {claim.status !== 'Resolved' && claim.status !== 'Rejected' && !showRejectForm && !showResolveForm && (
                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                        {claim.status === 'Pending' && (
                            <>
                                <button
                                    onClick={() => { onApprove(claim.id); onClose(); }}
                                    className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                                >
                                    <Check className="w-5 h-5" /> Duyệt yêu cầu
                                </button>
                                <button
                                    onClick={() => setShowRejectForm(true)}
                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                                >
                                    <X className="w-5 h-5" /> Từ chối
                                </button>
                            </>
                        )}
                        {claim.status === 'Approved' && (
                            <button
                                onClick={() => setShowResolveForm(true)}
                                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                            >
                                <Wrench className="w-5 h-5" /> Hoàn thành xử lý
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export const WarrantyPortal = () => {
    const [activeTab, setActiveTab] = useState<TabType>('claims');
    const [warranties, setWarranties] = useState<any[]>([]);
    const [claims, setClaims] = useState<any[]>([]);
    const [claimStats, setClaimStats] = useState<any>(null);
    const [searchSerial, setSearchSerial] = useState('');
    const [searchResult, setSearchResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [selectedClaim, setSelectedClaim] = useState<any>(null);

    useEffect(() => {
        fetchData();
    }, [activeTab, statusFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'warranties') {
                const data = await warrantyApi.admin.getAllWarranties();
                setWarranties(data);
            } else {
                const [claimsData, statsData] = await Promise.all([
                    warrantyApi.admin.getAllClaims(statusFilter || undefined),
                    warrantyApi.admin.getClaimStats()
                ]);
                setClaims(claimsData);
                setClaimStats(statsData);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
            toast.error('Không thể tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchSerial.trim()) return;
        setLoading(true);
        try {
            const res = await warrantyApi.lookupLegacy(searchSerial);
            setSearchResult(res);
        } catch (error: any) {
            setSearchResult({ error: 'Không tìm thấy số Serial này trong hệ thống' });
        } finally {
            setLoading(false);
        }
    };

    const handleApproveClaim = async (id: string) => {
        try {
            await warrantyApi.admin.approveClaim(id);
            toast.success('Đã duyệt yêu cầu bảo hành');
            fetchData();
        } catch (error) {
            toast.error('Không thể duyệt yêu cầu');
        }
    };

    const handleRejectClaim = async (id: string, reason: string) => {
        try {
            await warrantyApi.admin.rejectClaim(id, reason);
            toast.success('Đã từ chối yêu cầu bảo hành');
            fetchData();
        } catch (error) {
            toast.error('Không thể từ chối yêu cầu');
        }
    };

    const handleResolveClaim = async (id: string, notes: string) => {
        try {
            await warrantyApi.admin.resolveClaim(id, notes);
            toast.success('Đã hoàn thành xử lý yêu cầu');
            fetchData();
        } catch (error) {
            toast.error('Không thể hoàn thành yêu cầu');
        }
    };

    const viewClaimDetail = async (claim: any) => {
        try {
            const detail = await warrantyApi.admin.getClaimById(claim.id);
            setSelectedClaim(detail);
        } catch (error) {
            toast.error('Không thể tải chi tiết');
        }
    };

    const getStatusBadge = (status: number) => {
        switch (status) {
            case 0: return <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black uppercase">Hiệu lực</span>;
            case 1: return <span className="px-4 py-1.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-xl text-[10px] font-black uppercase">Hết hạn</span>;
            case 2: return <span className="px-4 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-[10px] font-black uppercase">Đã hủy</span>;
            default: return <span className="px-4 py-1.5 bg-gray-50 text-gray-400 border border-gray-100 rounded-xl text-[10px] font-black uppercase">N/A</span>;
        }
    };

    const getClaimStatusBadge = (status: string) => {
        switch (status) {
            case 'Pending': return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">Chờ xử lý</span>;
            case 'Approved': return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">Đã duyệt</span>;
            case 'Resolved': return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">Hoàn thành</span>;
            case 'Rejected': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">Từ chối</span>;
            default: return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">{status}</span>;
        }
    };

    const isExpired = (expirationDate: string) => new Date(expirationDate) < new Date();

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">
                        Quản lý <span className="text-[#D70018]">Bảo hành</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-2">
                        Theo dõi và xử lý bảo hành sản phẩm khách hàng
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                >
                    <RefreshCw className="w-5 h-5" />
                    Làm mới
                </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-2xl p-1.5 gap-1">
                <button
                    onClick={() => setActiveTab('claims')}
                    className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'claims' ? 'bg-white text-[#D70018] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <FileText className="w-5 h-5" />
                    Yêu cầu bảo hành
                    {claimStats?.pending > 0 && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{claimStats.pending}</span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('warranties')}
                    className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'warranties' ? 'bg-white text-[#D70018] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Shield className="w-5 h-5" />
                    Danh sách bảo hành
                </button>
            </div>

            {/* Claims Tab */}
            {activeTab === 'claims' && (
                <>
                    {/* Stats Cards */}
                    {claimStats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div
                                onClick={() => setStatusFilter('Pending')}
                                className={`bg-white rounded-2xl p-6 border-2 cursor-pointer transition-all hover:shadow-lg ${statusFilter === 'Pending' ? 'border-amber-400 bg-amber-50' : 'border-gray-100'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold text-amber-600 uppercase">Chờ xử lý</span>
                                </div>
                                <h3 className="text-4xl font-black text-gray-900">{claimStats.pending}</h3>
                            </div>
                            <div
                                onClick={() => setStatusFilter('Approved')}
                                className={`bg-white rounded-2xl p-6 border-2 cursor-pointer transition-all hover:shadow-lg ${statusFilter === 'Approved' ? 'border-blue-400 bg-blue-50' : 'border-gray-100'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                        <Check className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold text-blue-600 uppercase">Đã duyệt</span>
                                </div>
                                <h3 className="text-4xl font-black text-gray-900">{claimStats.approved}</h3>
                            </div>
                            <div
                                onClick={() => setStatusFilter('Resolved')}
                                className={`bg-white rounded-2xl p-6 border-2 cursor-pointer transition-all hover:shadow-lg ${statusFilter === 'Resolved' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold text-emerald-600 uppercase">Hoàn thành</span>
                                </div>
                                <h3 className="text-4xl font-black text-gray-900">{claimStats.resolved}</h3>
                            </div>
                            <div
                                onClick={() => setStatusFilter('')}
                                className={`bg-white rounded-2xl p-6 border-2 cursor-pointer transition-all hover:shadow-lg ${statusFilter === '' ? 'border-gray-400 bg-gray-50' : 'border-gray-100'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-gray-900 text-white rounded-xl">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-600 uppercase">Tổng cộng</span>
                                </div>
                                <h3 className="text-4xl font-black text-gray-900">{claimStats.total}</h3>
                            </div>
                        </div>
                    )}

                    {/* Claims List */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">Danh sách yêu cầu</h3>
                            {statusFilter && (
                                <button
                                    onClick={() => setStatusFilter('')}
                                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                                >
                                    <X className="w-4 h-4" /> Bỏ lọc
                                </button>
                            )}
                        </div>

                        {loading ? (
                            <div className="p-12 text-center">
                                <div className="animate-spin w-10 h-10 border-3 border-red-500 border-t-transparent rounded-full mx-auto"></div>
                                <p className="text-gray-500 mt-4">Đang tải...</p>
                            </div>
                        ) : claims.length === 0 ? (
                            <div className="p-12 text-center">
                                <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-500">Không có yêu cầu bảo hành nào</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {claims.map((claim) => (
                                    <div
                                        key={claim.id}
                                        className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => viewClaimDetail(claim)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="font-mono font-bold text-gray-900">{claim.serialNumber}</span>
                                                    {getClaimStatusBadge(claim.status)}
                                                    {claim.isManagerOverride && (
                                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-bold">Override</span>
                                                    )}
                                                </div>
                                                <p className="text-gray-600 text-sm line-clamp-2">{claim.issueDescription}</p>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(claim.filedDate).toLocaleDateString('vi-VN')}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Wrench className="w-3 h-3" />
                                                        {claim.preferredResolution === 'Repair' && 'Sửa chữa'}
                                                        {claim.preferredResolution === 'Replace' && 'Đổi mới'}
                                                        {claim.preferredResolution === 'Refund' && 'Hoàn tiền'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {claim.status === 'Pending' && (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleApproveClaim(claim.id); }}
                                                            className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                                                            title="Duyệt"
                                                        >
                                                            <Check className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                )}
                                                <button className="p-2 hover:bg-gray-200 text-gray-400 rounded-lg transition-colors">
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Warranties Tab */}
            {activeTab === 'warranties' && (
                <>
                    {/* Search Box */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Search className="text-[#D70018]" size={20} />
                            <h3 className="text-lg font-bold text-gray-900">Tra cứu bảo hành</h3>
                        </div>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                value={searchSerial}
                                onChange={(e) => setSearchSerial(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Nhập số Serial..."
                                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-mono focus:border-[#D70018] focus:outline-none transition-colors"
                            />
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className="px-8 py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                Tra cứu
                            </button>
                        </div>

                        {searchResult && (
                            <div className="mt-6 p-6 bg-gray-50 rounded-2xl">
                                {searchResult.error ? (
                                    <div className="flex items-center gap-3 text-red-600">
                                        <XCircle size={24} />
                                        <span className="font-bold">{searchResult.error}</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Serial</p>
                                            <p className="font-mono font-bold text-gray-900">{searchResult.serialNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Trạng thái</p>
                                            <span className={`px-3 py-1 rounded-lg text-sm font-bold ${searchResult.isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {searchResult.status}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Ngày hết hạn</p>
                                            <p className="font-bold text-gray-900">{new Date(searchResult.expirationDate).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Mã sản phẩm</p>
                                            <p className="font-mono text-xs text-gray-500">{searchResult.productId?.substring(0, 12)}...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl p-6 border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-black text-gray-900">
                                {warranties.filter(w => !isExpired(w.expirationDate) && w.status === 0).length}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Đang hiệu lực</p>
                        </div>
                        <div className="bg-white rounded-2xl p-6 border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-black text-gray-900">
                                {warranties.filter(w => {
                                    const daysLeft = Math.ceil((new Date(w.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                    return daysLeft > 0 && daysLeft <= 30;
                                }).length}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Sắp hết hạn</p>
                        </div>
                        <div className="bg-white rounded-2xl p-6 border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-gray-100 text-gray-600 rounded-xl">
                                    <Clock className="w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-black text-gray-900">
                                {warranties.filter(w => isExpired(w.expirationDate) || w.status === 1).length}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Đã hết hạn</p>
                        </div>
                        <div className="bg-white rounded-2xl p-6 border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                    <Package className="w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-black text-gray-900">{warranties.length}</h3>
                            <p className="text-sm text-gray-500 mt-1">Tổng số bảo hành</p>
                        </div>
                    </div>

                    {/* Warranties Table */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900">Danh sách bảo hành</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Serial</th>
                                        <th className="px-6 py-4 text-left">Mã SP</th>
                                        <th className="px-6 py-4 text-left">Ngày kích hoạt</th>
                                        <th className="px-6 py-4 text-left">Hạn bảo hành</th>
                                        <th className="px-6 py-4 text-left">Thời gian</th>
                                        <th className="px-6 py-4 text-left">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {warranties.slice(0, 20).map((warranty) => (
                                        <tr key={warranty.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-red-50 text-[#D70018] flex items-center justify-center">
                                                        <Shield size={16} />
                                                    </div>
                                                    <span className="font-mono font-bold text-gray-900">{warranty.serialNumber}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-gray-500 font-mono">{warranty.productId.substring(0, 8)}...</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-900">{new Date(warranty.purchaseDate).toLocaleDateString('vi-VN')}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-sm font-bold ${isExpired(warranty.expirationDate) ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {new Date(warranty.expirationDate).toLocaleDateString('vi-VN')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-600">{warranty.warrantyPeriodMonths} tháng</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(warranty.status)}
                                            </td>
                                        </tr>
                                    ))}
                                    {warranties.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center">
                                                <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                                <p className="text-gray-500">Chưa có thông tin bảo hành nào</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Claim Detail Modal */}
            {selectedClaim && (
                <ClaimDetailModal
                    claim={selectedClaim}
                    onClose={() => setSelectedClaim(null)}
                    onApprove={handleApproveClaim}
                    onReject={handleRejectClaim}
                    onResolve={handleResolveClaim}
                />
            )}
        </div>
    );
};

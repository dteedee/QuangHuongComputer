/**
 * Warranty overview dashboard ("Tổng quan bảo hành"). W3-15: the claims list +
 * approve/reject/resolve modal that used to live here was a duplicate of
 * `warranty/warranty-claims-page.tsx` (which additionally has assign, SLA bar,
 * receipt print — the D08 fields this track adds live there). Demolished the
 * duplicate; this page now shows stats + links out to the one claims
 * workspace, and keeps the coverage/serial lookup feature that only existed
 * here.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Shield, CheckCircle, Clock, Package,
    FileText, RefreshCw, ArrowRight, ShieldCheck, Boxes, LineChart,
} from 'lucide-react';
import { warrantyApi } from '../../api/warranty';
import toast from 'react-hot-toast';
import { WarrantyCoverageLookupTab } from './warranty/warranty-coverage-lookup-tab';

type TabType = 'warranties' | 'overview';

export const WarrantyPortal = () => {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [warranties, setWarranties] = useState<any[]>([]);
    const [claimStats, setClaimStats] = useState<any>(null);
    const [searchSerial, setSearchSerial] = useState('');
    const [searchResult, setSearchResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        void fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'warranties') {
                const data = await warrantyApi.admin.getAllWarranties();
                setWarranties(data);
            } else {
                const statsData = await warrantyApi.admin.getClaimStats();
                setClaimStats(statsData);
            }
        } catch {
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
        } catch {
            setSearchResult({ error: 'Không tìm thấy số Serial này trong hệ thống' });
        } finally {
            setLoading(false);
        }
    };

    const quickLinks = [
        { to: '/backoffice/warranty/claims', icon: FileText, label: 'Yêu cầu bảo hành', desc: 'Duyệt, phân xử lý, giải quyết claim', badge: claimStats?.pending },
        { to: '/backoffice/warranty/rma', icon: Boxes, label: 'RMA gửi hãng', desc: 'Theo dõi máy gửi hãng sửa/đổi' },
        { to: '/backoffice/warranty/loaner-devices', icon: Package, label: 'Máy mượn', desc: 'Cho khách mượn khi chờ xử lý' },
        { to: '/backoffice/warranty/policies', icon: ShieldCheck, label: 'Chính sách bảo hành', desc: 'Thời hạn theo danh mục, SLA nội bộ' },
        { to: '/backoffice/warranty/reports', icon: LineChart, label: 'Báo cáo bảo hành', desc: 'Số liệu vận hành' },
    ];

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Tổng quan <span className="text-accent">Bảo hành</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-2">
                        Theo dõi bảo hành sản phẩm khách hàng và điều hướng tới các nghiệp vụ
                    </p>
                </div>
                <button
                    onClick={() => void fetchData()}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                >
                    <RefreshCw className="w-5 h-5" />
                    Làm mới
                </button>
            </div>

            <div className="flex bg-gray-100 rounded-xl p-1.5 gap-1">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'overview' ? 'bg-white text-accent shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <LineChart className="w-5 h-5" />
                    Tổng quan
                </button>
                <button
                    onClick={() => setActiveTab('warranties')}
                    className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'warranties' ? 'bg-white text-accent shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Shield className="w-5 h-5" />
                    Tra cứu / Danh sách bảo hành
                </button>
            </div>

            {activeTab === 'overview' && (
                <>
                    {claimStats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
                                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl w-fit mb-4"><Clock className="w-6 h-6" /></div>
                                <h3 className="text-4xl font-semibold text-gray-900">{claimStats.pending ?? 0}</h3>
                                <p className="text-sm text-gray-500 mt-1">Chờ xử lý</p>
                            </div>
                            <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl w-fit mb-4"><CheckCircle className="w-6 h-6" /></div>
                                <h3 className="text-4xl font-semibold text-gray-900">{claimStats.approved ?? 0}</h3>
                                <p className="text-sm text-gray-500 mt-1">Đã duyệt</p>
                            </div>
                            <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl w-fit mb-4"><CheckCircle className="w-6 h-6" /></div>
                                <h3 className="text-4xl font-semibold text-gray-900">{claimStats.resolved ?? 0}</h3>
                                <p className="text-sm text-gray-500 mt-1">Hoàn thành</p>
                            </div>
                            <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
                                <div className="p-3 bg-gray-900 text-white rounded-xl w-fit mb-4"><Package className="w-6 h-6" /></div>
                                <h3 className="text-4xl font-semibold text-gray-900">{claimStats.total ?? 0}</h3>
                                <p className="text-sm text-gray-500 mt-1">Tổng cộng</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {quickLinks.map(({ to, icon: Icon, label, desc, badge }) => (
                            <Link
                                key={to}
                                to={to}
                                className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-5 hover:border-accent hover:shadow-md transition-all group"
                            >
                                <div className="p-3 bg-red-50 text-accent rounded-xl"><Icon className="w-6 h-6" /></div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900 flex items-center gap-2">
                                        {label}
                                        {!!badge && badge > 0 && (
                                            <span className="px-2 py-0.5 bg-accent text-white text-xs rounded-full">{badge}</span>
                                        )}
                                    </p>
                                    <p className="text-sm text-gray-500">{desc}</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-accent transition-colors" />
                            </Link>
                        ))}
                    </div>
                </>
            )}

            {activeTab === 'warranties' && (
                <WarrantyCoverageLookupTab
                    warranties={warranties}
                    loading={loading}
                    searchSerial={searchSerial}
                    setSearchSerial={setSearchSerial}
                    searchResult={searchResult}
                    onSearch={() => void handleSearch()}
                />
            )}
        </div>
    );
};

export default WarrantyPortal;

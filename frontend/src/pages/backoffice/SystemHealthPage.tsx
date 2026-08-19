import {
    Activity, Server, Database, HardDrive, Cpu,
    Wifi, AlertTriangle, CheckCircle2,
    RefreshCw, Shield, Globe, Loader2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getSystemHealth } from '../../api/reporting';

export default function SystemHealthPage() {
    const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } = useQuery({
        queryKey: ['system-health'],
        queryFn: getSystemHealth,
        refetchInterval: 10000,
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'operational': return 'text-green-500';
            case 'degraded': return 'text-orange-500';
            case 'outage': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'operational': return 'bg-green-50 border-green-200';
            case 'degraded': return 'bg-orange-50 border-orange-200';
            case 'outage': return 'bg-red-50 border-red-200';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    const MetricCard = ({ title, value, icon, unit = '%' }: { title: string, value: number, icon: React.ReactNode, unit?: string }) => {
        const isWarning = value > 80;
        const isDanger = value > 90;

        return (
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-gray-500 font-medium">
                        {icon}
                        {title}
                    </div>
                    {isDanger ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : isWarning ? (
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                    ) : (
                        <Activity className="w-5 h-5 text-green-500" />
                    )}
                </div>

                <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl font-semibold text-gray-900">{value.toFixed(1)}</span>
                    <span className="text-gray-500 text-lg mb-1">{unit}</span>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${
                            isDanger ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-accent'
                        }`}
                        style={{ width: `${Math.min(100, value)}%` }}
                    />
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="p-6 max-w-7xl mx-auto flex items-center justify-center h-96 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Đang tải dữ liệu hệ thống...
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-red-700 font-semibold mb-1">Không thể tải dữ liệu tình trạng hệ thống</p>
                    <p className="text-sm text-red-500 mb-4">Vui lòng kiểm tra kết nối đến máy chủ báo cáo.</p>
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 rounded-xl font-bold hover:bg-red-50 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" /> Thử lại
                    </button>
                </div>
            </div>
        );
    }

    const { metrics, services, status } = data;
    const isHealthy = status === 'healthy';

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
                        <Activity className="w-7 h-7 text-accent" />
                        System Health
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full animate-pulse ${isHealthy ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                        {isHealthy ? 'Hệ thống đang hoạt động bình thường' : 'Hệ thống đang gặp suy giảm'} • Cập nhật: {new Date(dataUpdatedAt).toLocaleTimeString()}
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    Làm mới
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="CPU Usage" value={metrics.cpu} icon={<Cpu className="w-4 h-4" />} />
                <MetricCard title="Memory Usage" value={metrics.memory} icon={<Server className="w-4 h-4" />} />
                <MetricCard title="Storage" value={metrics.storage} icon={<HardDrive className="w-4 h-4" />} />
                <MetricCard title="Network Traffic" value={metrics.network} icon={<Wifi className="w-4 h-4" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Services Status */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Globe className="w-5 h-5 text-gray-500" />
                                Trạng thái Dịch vụ
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {services.map((service, idx) => (
                                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg border ${getStatusBg(service.status)}`}>
                                            <Database className={`w-5 h-5 ${getStatusColor(service.status)}`} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{service.name}</h3>
                                            <p className="text-xs text-gray-500 flex items-center gap-2">
                                                <span>Uptime: {service.uptime}</span>
                                                <span>•</span>
                                                <span>{service.latency}ms latency</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {service.status === 'operational' ? (
                                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Hoạt động tốt
                                            </span>
                                        ) : service.status === 'degraded' ? (
                                            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Suy giảm
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Gián đoạn
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Environment Info */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-gray-500" />
                            Thông tin Hệ thống
                        </h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500">Trạng thái tổng quan</span>
                                <span className={`font-bold px-2 py-0.5 rounded ${isHealthy ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {isHealthy ? 'Healthy' : 'Degraded'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500">Môi trường</span>
                                <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{import.meta.env.MODE}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-gray-500">Cập nhật lần cuối</span>
                                <span className="font-medium text-gray-900">{new Date(data.updatedAt).toLocaleString('vi-VN')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

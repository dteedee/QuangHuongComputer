import { useState, useEffect } from 'react';
import { 
    Activity, Server, Database, HardDrive, Cpu, 
    Wifi, AlertTriangle, CheckCircle2, Clock, 
    RefreshCw, Shield, Globe, Terminal
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
// In a real app, this would use a real system health API endpoint
// For now we'll mock the data since the endpoint might not exist yet

interface HealthMetrics {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
}

interface ServiceStatus {
    name: string;
    status: 'operational' | 'degraded' | 'outage';
    latency: number;
    uptime: string;
}

export default function SystemHealthPage() {
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    
    // Mock simulation for live metrics
    const [metrics, setMetrics] = useState<HealthMetrics>({
        cpu: 24,
        memory: 68,
        storage: 45,
        network: 15
    });

    useEffect(() => {
        // Simulate live metric updates
        const interval = setInterval(() => {
            setMetrics(prev => ({
                cpu: Math.min(100, Math.max(0, prev.cpu + (Math.random() * 10 - 5))),
                memory: Math.min(100, Math.max(0, prev.memory + (Math.random() * 4 - 2))),
                storage: prev.storage, // Storage rarely changes quickly
                network: Math.min(100, Math.max(0, prev.network + (Math.random() * 20 - 10)))
            }));
            setLastUpdated(new Date());
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const services: ServiceStatus[] = [
        { name: 'API Gateway', status: 'operational', latency: 45, uptime: '99.99%' },
        { name: 'Database (PostgreSQL)', status: 'operational', latency: 12, uptime: '99.95%' },
        { name: 'Authentication Service', status: 'operational', latency: 25, uptime: '99.99%' },
        { name: 'Payment Gateway', status: 'operational', latency: 120, uptime: '99.90%' },
        { name: 'Background Workers', status: 'degraded', latency: 450, uptime: '98.50%' },
        { name: 'Cache Layer (Redis)', status: 'operational', latency: 2, uptime: '99.99%' },
        { name: 'Search Service', status: 'operational', latency: 65, uptime: '99.95%' },
        { name: 'Notification Service', status: 'operational', latency: 40, uptime: '99.95%' }
    ];

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
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
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
                    <span className="text-3xl font-black text-gray-900">{value.toFixed(1)}</span>
                    <span className="text-gray-500 text-lg mb-1">{unit}</span>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                            isDanger ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-accent'
                        }`}
                        style={{ width: `${value}%` }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Activity className="w-7 h-7 text-accent" />
                        System Health
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Hệ thống đang hoạt động bình thường • Cập nhật: {lastUpdated.toLocaleTimeString()}
                    </p>
                </div>
                <button 
                    onClick={() => setLastUpdated(new Date())}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <RefreshCw className="w-4 h-4" />
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
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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

                {/* System Info & Logs */}
                <div className="space-y-6">
                    {/* Environment Info */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-gray-500" />
                            Thông tin Hệ thống
                        </h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500">Môi trường</span>
                                <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">Production</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500">Phiên bản API</span>
                                <span className="font-medium text-gray-900">v1.2.4</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500">Phiên bản Frontend</span>
                                <span className="font-medium text-gray-900">v2.1.0</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500">Khu vực</span>
                                <span className="font-medium text-gray-900">ap-southeast-1</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-gray-500">Thời gian chạy</span>
                                <span className="font-medium text-gray-900">45 ngày, 12 giờ</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Logs */}
                    <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-gray-400" />
                                System Events
                            </h2>
                        </div>
                        <div className="p-4 space-y-2 font-mono text-xs overflow-y-auto max-h-[250px]">
                            <div className="text-gray-400">
                                <span className="text-blue-400">[{new Date(Date.now() - 50000).toLocaleTimeString()}]</span> INFO: Backup completed successfully
                            </div>
                            <div className="text-gray-400">
                                <span className="text-blue-400">[{new Date(Date.now() - 120000).toLocaleTimeString()}]</span> INFO: User sync finished (452 records)
                            </div>
                            <div className="text-orange-400">
                                <span className="text-orange-400">[{new Date(Date.now() - 240000).toLocaleTimeString()}]</span> WARN: Background worker high latency detected
                            </div>
                            <div className="text-gray-400">
                                <span className="text-blue-400">[{new Date(Date.now() - 360000).toLocaleTimeString()}]</span> INFO: Cache invalidated for /api/products
                            </div>
                            <div className="text-gray-400">
                                <span className="text-blue-400">[{new Date(Date.now() - 480000).toLocaleTimeString()}]</span> INFO: Service restarted: EmailWorker
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

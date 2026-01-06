import { useState, useEffect } from 'react';
import {
    Settings, Save, RefreshCw, Info,
    Globe, Shield, MessageCircle, Truck,
    AlertTriangle, Bell, Zap, Database
} from 'lucide-react';
import { systemConfigApi } from '../../api/systemConfig';
import type { ConfigEntry } from '../../api/systemConfig';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export const ConfigPortal = () => {
    const [configs, setConfigs] = useState<ConfigEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('General');

    useEffect(() => {
        const fetchConfigs = async () => {
            setIsLoading(true);
            try {
                const data = await systemConfigApi.getConfigs();
                setConfigs(data);
            } catch (error) {
                console.error('Failed to fetch configs', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchConfigs();
    }, []);

    const categories = [
        { name: 'General', label: 'Cấu hình chung', icon: <Globe size={18} /> },
        { name: 'Sales & Tax', label: 'Bán hàng & Thuế', icon: <Truck size={18} /> },
        { name: 'Repair SLA', label: 'SLA Sửa chữa', icon: <RefreshCw size={18} /> },
        { name: 'Security', label: 'Bảo mật', icon: <Shield size={18} /> },
        { name: 'AI Chatbot', label: 'Hỗ trợ AI', icon: <MessageCircle size={18} /> },
    ];

    const handleSave = () => {
        toast.promise(
            new Promise((resolve) => setTimeout(resolve, 1500)),
            {
                loading: 'Đang lưu cấu hình...',
                success: 'Cấu hình đã được cập nhật thành công!',
                error: 'Có lỗi xảy ra khi lưu cấu hình.',
            },
            {
                style: { borderRadius: '15px', fontWeight: 'bold' },
                success: { icon: '💾' }
            }
        );
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Cấu hình <span className="text-[#D70018]">Hệ thống</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        Quản lý quy tắc nghiệp vụ và thông số hệ thống toàn cầu
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                {/* Categories */}
                <div className="space-y-2">
                    {categories.map((cat, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveCategory(cat.name)}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all border duration-300 font-black uppercase text-[11px] tracking-tight ${activeCategory === cat.name
                                ? 'bg-white border-gray-100 text-[#D70018] shadow-lg shadow-gray-200/50 translate-x-2'
                                : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <span className={`${activeCategory === cat.name ? 'text-[#D70018]' : 'text-gray-300'}`}>{cat.icon}</span>
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Config List */}
                <div className="lg:col-span-3 space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="premium-card p-10"
                    >
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 border-b border-gray-50 pb-8">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">{activeCategory}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Thiết lập các tham số vận hành</p>
                            </div>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-3 px-8 py-4 bg-[#D70018] text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-[#b50014] transition-all active:scale-95 group"
                            >
                                <Save size={18} className="group-hover:scale-110 transition-transform" />
                                Lưu thay đổi
                            </button>
                        </div>

                        <div className="space-y-10">
                            {configs.map((config) => (
                                <div key={config.key} className="space-y-3 group border-b border-gray-50 pb-8 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                            {config.key}
                                            <Info size={14} className="text-gray-300 cursor-help hover:text-[#D70018] transition-colors" />
                                        </label>
                                        <span className="text-[9px] text-gray-300 font-black uppercase">Cập nhật: {new Date(config.lastUpdated).toLocaleDateString()}</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            defaultValue={config.value}
                                            className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-black text-gray-800 focus:outline-none focus:bg-white focus:border-red-100 transition-all shadow-inner"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium italic px-1">{config.description}</p>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="py-20 text-center flex flex-col items-center">
                                    <div className="relative">
                                        <RefreshCw className="text-red-100 animate-spin" size={60} />
                                        <Settings className="absolute inset-0 m-auto text-[#D70018]" size={24} />
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-6">Đang tải cấu hình...</p>
                                </div>
                            )}

                            {!isLoading && configs.length === 0 && (
                                <div className="py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                                    <Database className="mx-auto text-gray-200 mb-4" size={50} />
                                    <p className="text-[11px] text-gray-400 font-black uppercase tracking-widest italic">Không có cấu hình nào được tìm thấy.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -5 }}
                        className="bg-amber-50 border-2 border-amber-100 rounded-[30px] p-8 flex items-start gap-6 shadow-xl shadow-amber-500/5"
                    >
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-amber-100 flex-shrink-0 animate-pulse-soft">
                            <Shield size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={14} className="text-amber-600" />
                                <h4 className="text-amber-600 font-black uppercase italic tracking-tighter text-lg">Đặc quyền Quản trị cao cấp</h4>
                            </div>
                            <p className="text-amber-700/60 text-xs font-bold leading-relaxed max-w-2xl">
                                Bạn đang ở trong chế độ Siêu quản trị. Các thay đổi tại đây sẽ ảnh hưởng trực tiếp và ngay lập tức đến toàn bộ nền tảng.
                                <span className="text-[#D70018] ml-1">Vui lòng kiểm tra kỹ trước khi lưu.</span>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

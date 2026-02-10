import { useState, useEffect } from 'react';
import {
    Settings, Save, RefreshCw, Info,
    Globe, Shield, MessageCircle, Truck,
    AlertTriangle, Bell, Zap, Database
} from 'lucide-react';
import { systemConfigApi } from '../../api/systemConfig';
import type { ConfigEntry } from '../../api/systemConfig';
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
        { name: 'General', label: 'Cấu hình chung', icon: <Globe size={20} /> },
        { name: 'Sales & Tax', label: 'Bán hàng & Thuế', icon: <Truck size={20} /> },
        { name: 'Repair SLA', label: 'SLA Sửa chữa', icon: <RefreshCw size={20} /> },
        { name: 'Security', label: 'Bảo mật', icon: <Shield size={20} /> },
        { name: 'AI Chatbot', label: 'Hỗ trợ AI', icon: <MessageCircle size={20} /> },
    ];

    const handleSave = async () => {
        try {
            await toast.promise(
                systemConfigApi.updateConfigs(configs),
                {
                    loading: 'Đang lưu cấu hình...',
                    success: 'Cấu hình đã được cập nhật thành công!',
                    error: 'Có lỗi xảy ra khi lưu cấu hình.',
                },
                {
                    style: { borderRadius: '20px', fontWeight: '900', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em' },
                    success: { icon: '💾' }
                }
            );
        } catch (error) {
            console.error('Failed to save configs', error);
        }
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in admin-area">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-3">
                        Cấu hình <span className="text-[#D70018]">Hệ thống</span>
                    </h1>
                    <p className="text-gray-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                        Quản lý quy tắc nghiệp vụ và thông số hệ thống toàn cầu
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                {/* Categories */}
                <div className="space-y-3">
                    {categories.map((cat, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveCategory(cat.name)}
                            className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] transition-all border-2 duration-300 font-black uppercase text-xs tracking-tight shadow-sm ${activeCategory === cat.name
                                ? 'bg-gray-950 border-gray-950 text-white translate-x-3 shadow-xl'
                                : 'bg-white border-gray-50 text-gray-400 hover:text-gray-900 hover:border-gray-200'
                                }`}
                        >
                            <span className={`${activeCategory === cat.name ? 'text-[#D70018]' : 'text-gray-300'}`}>{cat.icon}</span>
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Config List */}
                <div className="lg:col-span-3 space-y-8">
                    <div className="premium-card p-10 border-2 bg-white">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12 border-b-2 border-gray-50 pb-10">
                            <div>
                                <h3 className="text-3xl font-black text-gray-950 uppercase italic tracking-tighter">{categories.find(c => c.name === activeCategory)?.label || activeCategory}</h3>
                                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mt-2">Thiết lập tham số vận hành định danh</p>
                            </div>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-4 px-10 py-5 bg-[#D70018] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-[#b50014] transition-all active:scale-95 group"
                            >
                                <Save size={20} className="group-hover:scale-110 transition-transform" />
                                Lưu cấu hình mới
                            </button>
                        </div>

                        <div className="space-y-12">
                            {configs.map((config) => (
                                <div key={config.key} className="space-y-4 group border-b-2 border-gray-50 pb-10 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-black text-gray-950 uppercase tracking-widest flex items-center gap-3">
                                            <span className="bg-gray-900 text-white px-3 py-1 rounded-lg text-[10px] italic">KEY</span>
                                            {config.key}
                                            <Info size={16} className="text-gray-400 cursor-help hover:text-[#D70018] transition-colors" />
                                        </label>
                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Lần cuối: {new Date(config.lastUpdated).toLocaleDateString()}</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            defaultValue={config.value}
                                            className="w-full px-8 py-5 bg-gray-50 border-2 border-transparent rounded-[1.5rem] text-base font-black text-gray-950 focus:outline-none focus:bg-white focus:border-[#D70018] transition-all shadow-inner font-mono italic"
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 font-bold italic px-2 leading-relaxed uppercase tracking-tight opacity-70 group-hover:opacity-100 transition-opacity">{config.description}</p>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="py-24 text-center flex flex-col items-center">
                                    <div className="relative">
                                        <RefreshCw className="text-red-50 animate-spin" size={100} strokeWidth={1} />
                                        <Settings className="absolute inset-0 m-auto text-[#D70018]" size={48} />
                                    </div>
                                    <p className="text-sm text-gray-900 font-black uppercase tracking-widest mt-8 italic">Đang đồng bộ cấu hình hệ thống...</p>
                                </div>
                            )}

                            {!isLoading && configs.length === 0 && (
                                <div className="py-24 text-center bg-gray-50 rounded-[2rem] border-4 border-dashed border-gray-100 italic">
                                    <Database className="mx-auto text-gray-100 mb-6" size={80} />
                                    <p className="text-sm text-gray-400 font-black uppercase tracking-widest text-center px-12">Hiện tại không tìm thấy bất kỳ bản ghi cấu hình nào trong danh mục này.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-amber-50 border-4 border-amber-100 rounded-[2rem] p-10 flex items-start gap-8 shadow-2xl shadow-amber-500/5 animate-pulse-soft">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-lg border-2 border-amber-100 flex-shrink-0">
                            <Shield size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <AlertTriangle size={20} className="text-amber-600" />
                                <h4 className="text-amber-600 font-black uppercase italic tracking-tighter text-2xl">Đặc quyền Siêu quản trị (SuperAdmin)</h4>
                            </div>
                            <p className="text-amber-700/80 text-sm font-black leading-relaxed max-w-3xl uppercase tracking-tight">
                                CẢNH BÁO: Mọi thay đổi tại đây sẽ làm thay đổi cấu trúc vận hành của toàn bộ hệ thống ngay lập tức.
                                <span className="text-[#D70018] ml-2 underline underline-offset-4 decoration-2">Vui lòng xác thực thông tin trước khi áp dụng.</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

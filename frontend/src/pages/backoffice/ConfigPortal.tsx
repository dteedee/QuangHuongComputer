import { useState, useEffect } from 'react';
import {
    Settings, Save, RefreshCw, Info,
    Globe, Shield, MessageCircle, Truck
} from 'lucide-react';
import { systemConfigApi } from '../../api/systemConfig';
import type { ConfigEntry } from '../../api/systemConfig';

export const ConfigPortal = () => {
    const [configs, setConfigs] = useState<ConfigEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
        { name: 'General', icon: <Globe size={20} /> },
        { name: 'Sales & Tax', icon: <Truck size={20} /> },
        { name: 'Repair SLA', icon: <RefreshCw size={20} /> },
        { name: 'Security', icon: <Shield size={20} /> },
        { name: 'AI Chatbot', icon: <MessageCircle size={20} /> },
    ];

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">System Configuration</h1>
                <p className="text-slate-400 mt-1">Manage global system settings and business rules.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Categories */}
                <div className="space-y-2">
                    {categories.map((cat, i) => (
                        <button
                            key={i}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${i === 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                }`}
                        >
                            {cat.icon}
                            <span className="font-bold text-sm">{cat.name}</span>
                        </button>
                    ))}
                </div>

                {/* Config List */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold text-white">General Settings</h3>
                            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-blue-400 font-bold rounded-xl hover:bg-slate-700 transition-all border border-blue-500/20">
                                <Save size={18} />
                                Save Changes
                            </button>
                        </div>

                        <div className="space-y-6">
                            {configs.map((config) => (
                                <div key={config.key} className="space-y-2 group">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-white flex items-center gap-2">
                                            {config.key}
                                            <Info size={14} className="text-slate-500 cursor-help" />
                                        </label>
                                        <span className="text-[10px] text-slate-500 font-mono">Last updated: {new Date(config.lastUpdated).toLocaleDateString()}</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            defaultValue={config.value}
                                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 italic px-1">{config.description}</p>
                                </div>
                            ))}

                            {configs.length === 0 && (
                                <div className="py-12 text-center">
                                    <RefreshCw className="mx-auto text-slate-700 mb-4 animate-spin" size={40} />
                                    <p className="text-slate-500 font-medium">Loading configurations...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex items-start gap-4">
                        <div className="p-2 bg-amber-500/20 rounded-xl text-amber-500 mt-1">
                            <Shield size={20} />
                        </div>
                        <div>
                            <h4 className="text-amber-500 font-bold mb-1">Administrative Privileges</h4>
                            <p className="text-amber-500/70 text-sm">You are currently in Super Admin mode. Changes will affect all modules immediately across the entire platform. Please exercise caution.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


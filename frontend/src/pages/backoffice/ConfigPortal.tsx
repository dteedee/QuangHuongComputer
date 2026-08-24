import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Settings, Save, RefreshCw, Info,
    AlertTriangle, Database,
    DollarSign, Clock, Percent, Phone,
    Mail, MapPin, Award,
    CheckCircle, XCircle, ToggleLeft, ToggleRight,
    Download, Upload, History, Plus, Trash2, LayoutGrid
} from 'lucide-react';
import { systemConfigApi } from '../../api/systemConfig';
import type { ConfigurationEntry, ConfigValueType } from '../../api/systemConfig';
import { ConfigKeyEditorDialog } from '../../components/admin/config-key-editor-dialog';

import toast from 'react-hot-toast';

// ============================================
// Config Validation System
// ============================================
type ConfigType = 'boolean' | 'number' | 'percentage' | 'currency' | 'url' | 'email' | 'phone' | 'text';

interface ValidationRule {
    type: ConfigType;
    min?: number;
    max?: number;
    required?: boolean;
}

const getConfigType = (key: string, value: string): ConfigType => {
    // Boolean
    if (value === 'true' || value === 'false' ||
        key.includes('ENABLED') || key.includes('REQUIRE_') ||
        key.includes('_NOTIFICATIONS') || key.includes('CONFIRMATION')) return 'boolean';
    // URL
    if (key.includes('_URL') || key.includes('WEBSITE')) return 'url';
    // Email
    if (key.includes('EMAIL') && !key.includes('NOTIFICATION')) return 'email';
    // Phone
    if (key.includes('PHONE') || key.includes('ZALO')) return 'phone';
    // Percentage/Rate
    if (key.includes('RATE') || key.includes('PERCENT')) return 'percentage';
    // Currency
    if (key.includes('SALARY') || key.includes('FEE') || key.includes('AMOUNT') ||
        key.includes('THRESHOLD')) return 'currency';
    // Number
    if (key.includes('DAYS') || key.includes('HOURS') || key.includes('MONTHS') ||
        key.includes('TIMEOUT') || key.includes('ATTEMPTS') || key.includes('LENGTH') ||
        key.includes('MAX_') || key.includes('MIN_') || key.includes('DELAY') ||
        key.includes('PERIOD') || key.includes('PER_')) return 'number';
    // Check if value is numeric
    if (/^\d+(\.\d+)?$/.test(value)) return 'number';
    return 'text';
};

const getValidationRule = (key: string, value: string): ValidationRule => {
    const type = getConfigType(key, value);
    switch (type) {
        case 'percentage':
            return { type, min: 0, max: 1, required: true };
        case 'currency':
            return { type, min: 0, required: true };
        case 'number':
            return { type, min: 0, required: true };
        default:
            return { type, required: true };
    }
};

const validateConfig = (key: string, value: string): string | null => {
    if (!value && value !== '0') return 'Giá trị không được để trống';
    const rule = getValidationRule(key, value);

    switch (rule.type) {
        case 'boolean':
            if (value !== 'true' && value !== 'false') return 'Chỉ chấp nhận true hoặc false';
            break;
        case 'percentage': {
            const pct = parseFloat(value);
            if (isNaN(pct)) return 'Phải là số thập phân (VD: 0.08)';
            if (pct < 0 || pct > 1) return 'Tỷ lệ phải từ 0 đến 1 (VD: 0.08 = 8%)';
            break;
        }
        case 'currency':
        case 'number': {
            const num = parseFloat(value);
            if (isNaN(num)) return 'Phải là số hợp lệ';
            if (rule.min !== undefined && num < rule.min) return `Giá trị tối thiểu là ${rule.min}`;
            if (rule.max !== undefined && num > rule.max) return `Giá trị tối đa là ${rule.max}`;
            break;
        }
        case 'url':
            if (value && !/^https?:\/\/.+/.test(value)) return 'URL phải bắt đầu bằng http:// hoặc https://';
            break;
        case 'email':
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email không hợp lệ';
            break;
        case 'phone':
            if (value && !/^[0-9.\-\s+()]+$/.test(value)) return 'Số điện thoại không hợp lệ';
            break;
    }
    return null;
};

// ============================================
// Import helpers
// ============================================

// Ánh xạ kiểu suy luận trên UI sang ConfigValueType mà backend lưu trữ.
const CONFIG_TYPE_TO_VALUE_TYPE: Record<ConfigType, ConfigValueType> = {
    boolean: 'Boolean',
    number: 'Number',
    percentage: 'Percentage',
    currency: 'Number',
    url: 'Url',
    email: 'Email',
    phone: 'String',
    text: 'String',
};

/**
 * Chuẩn hoá 1 mục đọc từ file JSON import về đúng ConfigurationEntry.
 * File import do người dùng cung cấp nên không thể tin cấu trúc; thiếu trường nào
 * thì điền mặc định, sai kiểu thì loại bỏ — tránh gửi payload hỏng lên backend.
 */
const normalizeImportedConfig = (raw: unknown, index: number): ConfigurationEntry | null => {
    if (!raw || typeof raw !== 'object') return null;
    const entry = raw as Partial<ConfigurationEntry>;
    if (typeof entry.key !== 'string' || typeof entry.value !== 'string') return null;

    return {
        key: entry.key,
        value: entry.value,
        description: entry.description ?? '',
        category: entry.category ?? 'Khác',
        module: entry.module ?? 'Global',
        valueType: entry.valueType ?? CONFIG_TYPE_TO_VALUE_TYPE[getConfigType(entry.key, entry.value)],
        jsonValue: entry.jsonValue ?? null,
        isSystem: entry.isSystem ?? false,
        sortOrder: entry.sortOrder ?? index,
        lastUpdated: entry.lastUpdated ?? new Date().toISOString(),
    };
};

const ALL_CATEGORY = '__all__';
const UNCATEGORIZED = 'Khác';

export const ConfigPortal = () => {
    const [configs, setConfigs] = useState<ConfigurationEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
    const [hasChanges, setHasChanges] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [deletingKey, setDeletingKey] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Bản gốc từ backend — dùng để tính diff (dirty entries) khi Save bulk, tránh gửi cả list.
    const originalConfigsRef = useRef<Map<string, ConfigurationEntry>>(new Map());

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(configs, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `qhc-config-${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        toast.success('Đã xuất file cấu hình JSON thành công');
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported: unknown = JSON.parse(event.target?.result as string);
                if (!Array.isArray(imported)) {
                    toast.error('File cấu hình phải là một mảng JSON');
                    return;
                }

                const validImport = imported
                    .map(normalizeImportedConfig)
                    .filter((entry): entry is ConfigurationEntry => entry !== null);

                if (validImport.length === 0) {
                    toast.error('Không có mục cấu hình hợp lệ nào trong file');
                    return;
                }

                setConfigs(validImport);
                setHasChanges(true);
                toast.success(`Đã nạp ${validImport.length} mục cấu hình. Vui lòng kiểm tra và lưu lại.`);
            } catch {
                toast.error('File JSON không hợp lệ');
            }
        };
        reader.readAsText(file);
        // Reset input so the same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const fetchConfigs = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await systemConfigApi.getConfigs();
            setConfigs(data ?? []);
            originalConfigsRef.current = new Map((data ?? []).map(c => [c.key, c]));
        } catch (error) {
            console.error('Failed to fetch configs', error);
            toast.error('Không tải được cấu hình từ máy chủ');
            setConfigs([]);
            originalConfigsRef.current = new Map();
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfigs();
    }, [fetchConfigs]);

    // Danh mục sinh động từ dữ liệu backend — không lọc mất key thuộc category lạ.
    const categories = useMemo(() => {
        const names = Array.from(new Set(configs.map(c => c.category?.trim() || UNCATEGORIZED))).sort();
        return [ALL_CATEGORY, ...names];
    }, [configs]);

    const categoryLabel = (name: string) => name === ALL_CATEGORY ? 'Tất cả' : name;

    const handleSave = async () => {
        // Validate all configs before saving
        const errors: Record<string, string | null> = {};
        let hasErrors = false;
        configs.forEach(c => {
            const err = validateConfig(c.key, c.value);
            if (err) { errors[c.key] = err; hasErrors = true; }
        });
        setValidationErrors(errors);
        if (hasErrors) {
            toast.error('Vui lòng sửa các lỗi cấu hình trước khi lưu!');
            return;
        }

        // Chỉ gửi các entry đã thay đổi so với bản gốc — giảm payload + đúng ngữ nghĩa bulk.
        const original = originalConfigsRef.current;
        const dirtyConfigs = configs.filter(c => {
            const orig = original.get(c.key);
            return !orig || JSON.stringify(orig) !== JSON.stringify(c);
        });
        if (dirtyConfigs.length === 0) {
            setHasChanges(false);
            return;
        }

        try {
            await toast.promise(
                systemConfigApi.updateConfigs(dirtyConfigs),
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
            setHasChanges(false);
            await fetchConfigs();
        } catch (error) {
            console.error('Failed to save configs', error);
        }
    };

    const handleConfigChange = useCallback((key: string, newValue: string) => {
        setConfigs(prev => prev.map(config =>
            config.key === key
                ? { ...config, value: newValue, lastUpdated: new Date().toISOString() }
                : config
        ));
        // Validate on change
        const error = validateConfig(key, newValue);
        setValidationErrors(prev => ({ ...prev, [key]: error }));
        setHasChanges(true);
    }, []);

    const handleAddKey = async (entry: ConfigurationEntry) => {
        try {
            await systemConfigApi.config.upsert(entry);
            toast.success(`Đã thêm cấu hình "${entry.key}"`);
            setShowAddDialog(false);
            await fetchConfigs();
        } catch (error) {
            console.error('Failed to add config', error);
            toast.error('Không thêm được cấu hình mới');
        }
    };

    const handleDeleteKey = async (key: string) => {
        try {
            await systemConfigApi.config.delete(key);
            toast.success(`Đã xóa cấu hình "${key}"`);
            setDeletingKey(null);
            await fetchConfigs();
        } catch (error) {
            console.error('Failed to delete config', error);
            toast.error('Không xóa được cấu hình (có thể là cấu hình hệ thống)');
        }
    };

    const filteredConfigs = configs.filter(config => {
        const cat = config.category?.trim() || UNCATEGORIZED;
        const matchesCategory = activeCategory === ALL_CATEGORY || cat === activeCategory;
        const matchesSearch = searchQuery === '' || config.key.toLowerCase().includes(searchQuery.toLowerCase()) || config.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const getConfigIcon = (key: string) => {
        if (key.includes('PHONE')) return <Phone size={16} />;
        if (key.includes('EMAIL')) return <Mail size={16} />;
        if (key.includes('ADDRESS')) return <MapPin size={16} />;
        if (key.includes('RATE') || key.includes('PERCENT')) return <Percent size={16} />;
        if (key.includes('SALARY') || key.includes('FEE') || key.includes('AMOUNT')) return <DollarSign size={16} />;
        if (key.includes('TIME') || key.includes('DAYS') || key.includes('HOURS')) return <Clock size={16} />;
        return <Settings size={16} />;
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in admin-area">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 leading-none mb-3">
                        Cấu hình <span className="text-accent">Hệ thống</span>
                    </h1>
                    <p className="text-gray-700 font-semibold text-xs flex items-center gap-2">
                        <Database size={16} />
                        Quản lý toàn bộ thông số vận hành doanh nghiệp
                    </p>
                </div>
                {hasChanges && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-2 border-amber-200 rounded-xl">
                        <AlertTriangle size={20} className="text-amber-600" />
                        <span className="text-xs font-semibold text-amber-800 uppercase">
                            Có thay đổi chưa lưu
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                {/* Categories */}
                <div className="space-y-3">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`w-full flex items-center gap-5 px-6 py-5 rounded-xl transition-all border-2 duration-300 font-semibold text-xs tracking-tight shadow-sm ${activeCategory === cat
                                ? 'bg-gray-950 border-gray-950 text-white translate-x-3 shadow-sm'
                                : 'bg-white border-gray-50 text-gray-400 hover:text-gray-900 hover:border-gray-200'
                                }`}
                        >
                            <span className={activeCategory === cat ? 'text-accent' : 'text-gray-500'}>
                                {cat === ALL_CATEGORY ? <LayoutGrid size={20} /> : <Settings size={20} />}
                            </span>
                            {categoryLabel(cat)}
                            {activeCategory === cat && (
                                <span className="ml-auto bg-accent text-white px-2 py-1 rounded-full text-xs">
                                    {filteredConfigs.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Config List */}
                <div className="lg:col-span-3 space-y-8">
                    <div className="premium-card p-10 border-2 bg-white">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b-2 border-gray-50 pb-10">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-gray-600">
                                        {activeCategory === ALL_CATEGORY ? <LayoutGrid size={24} /> : <Settings size={24} />}
                                    </span>
                                    <h3 className="text-3xl font-semibold text-gray-950 ">
                                        {categoryLabel(activeCategory)}
                                    </h3>
                                </div>
                                <p className="text-sm font-medium text-slate-500">
                                    {filteredConfigs.length} tham số cấu hình
                                </p>
                            </div>

                            <div className="flex gap-3">
                                {/* Search */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="px-4 py-3 pr-10 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-semibold focus:outline-none focus:border-accent transition-all"
                                    />
                                    <Database size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                                
                                {/* Export / Import */}
                                <button
                                    onClick={handleExport}
                                    className="flex items-center justify-center p-3 text-gray-500 bg-gray-50 border-2 border-gray-100 rounded-xl hover:bg-gray-100 hover:text-gray-700 transition-all tooltip-trigger"
                                    title="Xuất cấu hình JSON"
                                >
                                    <Download size={18} />
                                </button>
                                
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center justify-center p-3 text-gray-500 bg-gray-50 border-2 border-gray-100 rounded-xl hover:bg-gray-100 hover:text-gray-700 transition-all tooltip-trigger"
                                    title="Nhập cấu hình JSON"
                                >
                                    <Upload size={18} />
                                </button>
                                <input 
                                    type="file" 
                                    accept=".json" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    onChange={handleImport} 
                                />

                                <button
                                    className="flex items-center justify-center p-3 text-blue-500 bg-blue-50 border-2 border-blue-100 rounded-xl hover:bg-blue-100 hover:text-blue-700 transition-all tooltip-trigger"
                                    title="Lịch sử thay đổi"
                                >
                                    <History size={18} />
                                </button>

                                {/* Add key */}
                                <button
                                    onClick={() => setShowAddDialog(true)}
                                    className="flex items-center gap-2 px-5 py-3 text-emerald-700 bg-emerald-50 border-2 border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all text-sm font-medium"
                                    title="Thêm cấu hình mới"
                                >
                                    <Plus size={18} />
                                    Thêm cấu hình
                                </button>

                                {/* Save Button */}
                                <button
                                    onClick={handleSave}
                                    disabled={!hasChanges}
                                    className={`flex items-center gap-3 px-8 py-3 text-white text-sm font-medium rounded-xl shadow-lg transition-all active:scale-95 group ${hasChanges
                                        ? 'bg-accent hover:bg-accent-hover shadow-blue-500/15'
                                        : 'bg-gray-300 cursor-not-allowed'
                                        }`}
                                >
                                    <Save size={18} className="group-hover:scale-110 transition-transform" />
                                    Lưu thay đổi
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {filteredConfigs.map((config) => {
                                const configType = getConfigType(config.key, config.value);
                                const error = validationErrors[config.key];
                                const hasError = !!error;

                                return (
                                <div key={config.key} className={`space-y-3 group border-2 rounded-xl p-6 transition-all bg-gradient-to-r from-gray-50/50 to-white ${hasError ? 'border-red-200 bg-red-50/30' : 'border-gray-50 hover:border-accent/20'}`}>
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-slate-700 flex items-center gap-3">
                                            <span className="bg-gray-900 text-white p-2 rounded-lg">
                                                {getConfigIcon(config.key)}
                                            </span>
                                            {config.key.replace(/_/g, ' ')}
                                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                                configType === 'boolean' ? 'bg-purple-100 text-purple-600' :
                                                configType === 'percentage' ? 'bg-blue-100 text-blue-600' :
                                                configType === 'currency' ? 'bg-emerald-100 text-emerald-600' :
                                                configType === 'url' ? 'bg-indigo-100 text-indigo-600' :
                                                configType === 'email' ? 'bg-orange-100 text-orange-600' :
                                                configType === 'number' ? 'bg-cyan-100 text-cyan-600' :
                                                'bg-gray-100 text-gray-500'
                                            }`}>{
                                                configType === 'boolean' ? 'Toggle' :
                                                configType === 'percentage' ? 'Tỉ lệ' :
                                                configType === 'currency' ? 'Tiền tệ' :
                                                configType === 'url' ? 'Link' :
                                                configType === 'email' ? 'Email' :
                                                configType === 'number' ? 'Số' :
                                                'Văn bản'
                                            }</span>
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-slate-400 flex items-center gap-2">
                                                <Clock size={12} />
                                                {new Date(config.lastUpdated).toLocaleDateString('vi-VN')}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setDeletingKey(config.key)}
                                                disabled={config.isSystem}
                                                title={config.isSystem ? 'Không thể xóa cấu hình hệ thống' : 'Xóa cấu hình'}
                                                className={`p-2 rounded-lg transition-colors ${config.isSystem ? 'text-gray-200 cursor-not-allowed' : 'text-red-400 hover:bg-red-50 hover:text-red-600'}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Boolean Toggle */}
                                    {configType === 'boolean' ? (
                                        <button
                                            type="button"
                                            onClick={() => handleConfigChange(config.key, config.value === 'true' ? 'false' : 'true')}
                                            className={`flex items-center gap-4 w-full px-6 py-4 rounded-xl border-2 transition-all ${
                                                config.value === 'true'
                                                    ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            {config.value === 'true'
                                                ? <ToggleRight size={32} className="text-emerald-500" />
                                                : <ToggleLeft size={32} className="text-gray-400" />
                                            }
                                            <span className={`text-sm font-medium ${
                                                config.value === 'true' ? 'text-emerald-700' : 'text-gray-500'
                                            }`}>
                                                {config.value === 'true' ? 'Đang bật' : 'Đang tắt'}
                                            </span>
                                        </button>
                                    ) : (
                                        <div className="relative">
                                            <input
                                                type={configType === 'number' || configType === 'currency' || configType === 'percentage' ? 'number' : 'text'}
                                                step={configType === 'percentage' ? '0.01' : configType === 'currency' ? '1000' : '1'}
                                                min={configType === 'percentage' ? '0' : configType === 'number' || configType === 'currency' ? '0' : undefined}
                                                max={configType === 'percentage' ? '1' : undefined}
                                                value={config.value}
                                                onChange={(e) => handleConfigChange(config.key, e.target.value)}
                                                className={`w-full px-6 py-4 bg-white border-2 rounded-xl text-base font-bold text-gray-950 focus:outline-none transition-all shadow-sm hover:shadow-md font-mono ${
                                                    hasError ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-accent'
                                                }`}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                {configType === 'percentage' && (
                                                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                                                        {(parseFloat(config.value) * 100 || 0).toFixed(1)}%
                                                    </span>
                                                )}
                                                {configType === 'currency' && (
                                                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">VNĐ</span>
                                                )}
                                                {!hasError && (
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <CheckCircle size={16} className="text-emerald-500" />
                                                    </div>
                                                )}
                                                {hasError && <XCircle size={16} className="text-red-500" />}
                                            </div>
                                        </div>
                                    )}

                                    {/* Validation Error */}
                                    {hasError && (
                                        <p className="text-xs text-red-600 font-bold px-2 flex items-center gap-2">
                                            <AlertTriangle size={12} />
                                            {error}
                                        </p>
                                    )}

                                    <p className="text-xs text-gray-600 font-semibold px-2 leading-relaxed flex items-start gap-2">
                                        <Info size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                        {config.description}
                                    </p>
                                </div>
                                );
                            })}

                            {isLoading && (
                                <div className="py-24 text-center flex flex-col items-center">
                                    <div className="relative">
                                        <RefreshCw className="text-red-50 animate-spin" size={100} strokeWidth={1} />
                                        <Settings className="absolute inset-0 m-auto text-accent" size={48} />
                                    </div>
                                    <p className="text-sm text-gray-900 font-medium mt-8">
                                        Đang đồng bộ cấu hình hệ thống...
                                    </p>
                                </div>
                            )}

                            {!isLoading && filteredConfigs.length === 0 && configs.length === 0 && (
                                <div className="py-24 text-center bg-gray-50 rounded-[2rem] border-4 border-dashed border-gray-100">
                                    <Database className="mx-auto text-gray-200 mb-6" size={80} />
                                    <p className="text-sm text-gray-500 font-semibold mb-2">
                                        Chưa có cấu hình nào
                                    </p>
                                    <p className="text-xs text-gray-400 mb-6">
                                        Kiểm tra kết nối backend hoặc chạy seeder cấu hình hệ thống.
                                    </p>
                                    <button
                                        onClick={() => setShowAddDialog(true)}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-hover transition-all"
                                    >
                                        <Plus size={18} /> Thêm cấu hình
                                    </button>
                                </div>
                            )}

                            {!isLoading && filteredConfigs.length === 0 && configs.length > 0 && (
                                <div className="py-24 text-center bg-gray-50 rounded-[2rem] border-4 border-dashed border-gray-100">
                                    <Database className="mx-auto text-gray-200 mb-6" size={80} />
                                    <p className="text-sm text-gray-400 font-medium">
                                        Không tìm thấy kết quả phù hợp
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
                            <Database className="text-blue-600 mb-3" size={32} />
                            <h4 className="text-2xl font-semibold text-blue-900">{configs.length}</h4>
                            <p className="text-xs font-bold text-blue-700 uppercase">Tổng số cấu hình</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border-2 border-emerald-200">
                            <Award className="text-emerald-600 mb-3" size={32} />
                            <h4 className="text-2xl font-semibold text-emerald-900">{categories.length - 1}</h4>
                            <p className="text-xs font-bold text-emerald-700 uppercase">Danh mục</p>
                        </div>
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border-2 border-amber-200">
                            <Clock className="text-amber-600 mb-3" size={32} />
                            <h4 className="text-2xl font-semibold text-amber-900">
                                {configs.length > 0 ? new Date(Math.max(...configs.map(c => new Date(c.lastUpdated).getTime()))).toLocaleDateString('vi-VN') : '-'}
                            </h4>
                            <p className="text-xs font-bold text-amber-700 uppercase">Cập nhật gần nhất</p>
                        </div>
                    </div>
                </div>
            </div>

            {showAddDialog && (
                <ConfigKeyEditorDialog
                    existingCategories={categories.filter(c => c !== ALL_CATEGORY)}
                    nextSortOrder={configs.length}
                    onClose={() => setShowAddDialog(false)}
                    onSubmit={handleAddKey}
                />
            )}

            {deletingKey && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 space-y-5 text-center">
                        <AlertTriangle className="mx-auto text-red-500" size={40} />
                        <p className="text-sm font-semibold text-gray-800">
                            Xóa cấu hình "{deletingKey}"? Hành động này không thể hoàn tác.
                        </p>
                        <div className="flex justify-center gap-3 pt-2">
                            <button onClick={() => setDeletingKey(null)} className="px-5 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50">
                                Hủy
                            </button>
                            <button
                                onClick={() => handleDeleteKey(deletingKey)}
                                className="px-5 py-3 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                            >
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

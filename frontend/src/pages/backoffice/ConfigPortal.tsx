import { useState, useEffect, useCallback } from 'react';
import {
    Settings, Save, RefreshCw, Info,
    Globe, Shield, MessageCircle, Truck,
    AlertTriangle, Bell, Zap, Database, Building2,
    DollarSign, Users, Clock, Percent, Phone,
    Mail, MapPin, Award, ShoppingBag, Wrench,
    CheckCircle, XCircle, ToggleLeft, ToggleRight
} from 'lucide-react';
import { systemConfigApi } from '../../api/systemConfig';
import type { ConfigurationEntry } from '../../api/systemConfig';

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
        case 'percentage':
            const pct = parseFloat(value);
            if (isNaN(pct)) return 'Phải là số thập phân (VD: 0.08)';
            if (pct < 0 || pct > 1) return 'Tỷ lệ phải từ 0 đến 1 (VD: 0.08 = 8%)';
            break;
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

// Extended config structure with default values
const DEFAULT_CONFIGS: Record<string, ConfigurationEntry[]> = {
    'Company': [
        { key: 'COMPANY_NAME', value: 'Quang Hưởng Computer', description: 'Tên công ty hiển thị trên website', category: 'Company', lastUpdated: new Date().toISOString() },
        { key: 'COMPANY_FULL_NAME', value: 'CÔNG TY TNHH QUANG HƯỞNG COMPUTER', description: 'Tên đầy đủ công ty (dùng cho hóa đơn)', category: 'Company', lastUpdated: new Date().toISOString() },
        { key: 'COMPANY_ADDRESS', value: 'Số 179 Thôn 3/2 Xã Vĩnh Bảo Thành phố Hải Phòng', description: 'Địa chỉ công ty', category: 'Company', lastUpdated: new Date().toISOString() },
        { key: 'COMPANY_PHONE', value: '0904.235.090', description: 'Số điện thoại chính', category: 'Company', lastUpdated: new Date().toISOString() },
        { key: 'COMPANY_PHONE_2', value: '02253.xxx.xxx', description: 'Số điện thoại phụ', category: 'Company', lastUpdated: new Date().toISOString() },
        { key: 'COMPANY_EMAIL', value: 'quanghuongvbhp@gmail.com', description: 'Email liên hệ chính', category: 'Company', lastUpdated: new Date().toISOString() },
        { key: 'COMPANY_TAX_CODE', value: '0123456789', description: 'Mã số thuế', category: 'Company', lastUpdated: new Date().toISOString() },
        { key: 'COMPANY_WEBSITE', value: 'https://quanghuongcomputer.vn', description: 'Website chính thức', category: 'Company', lastUpdated: new Date().toISOString() },
        { key: 'COMPANY_SLOGAN', value: 'Uy Tín - Chất Lượng - Giá Tốt', description: 'Slogan công ty', category: 'Company', lastUpdated: new Date().toISOString() },
        { key: 'COMPANY_WORKING_HOURS', value: '8:00 - 21:00 (Tất cả các ngày trong tuần)', description: 'Thời gian làm việc', category: 'Company', lastUpdated: new Date().toISOString() },
        { key: 'COMPANY_BRAND_TEXT_1', value: 'QUANG HƯỞNG', description: 'Tên thương hiệu dòng 1 (Header)', category: 'Company', lastUpdated: new Date().toISOString() },
        { key: 'COMPANY_BRAND_TEXT_2', value: 'COMPUTER', description: 'Tên thương hiệu dòng 2 (Header)', category: 'Company', lastUpdated: new Date().toISOString() },
    ],
    'Sales & Tax': [
        { key: 'TAX_RATE', value: '0.08', description: 'Thuế VAT (%) - Mặc định 8%', category: 'Sales & Tax', lastUpdated: new Date().toISOString() },
        { key: 'COMMISSION_RATE', value: '0.05', description: 'Hoa hồng bán hàng (%) - Mặc định 5%', category: 'Sales & Tax', lastUpdated: new Date().toISOString() },
        { key: 'VIP_DISCOUNT_RATE', value: '0.10', description: 'Chiết khấu khách VIP (%) - Mặc định 10%', category: 'Sales & Tax', lastUpdated: new Date().toISOString() },
        { key: 'MIN_ORDER_AMOUNT', value: '100000', description: 'Giá trị đơn hàng tối thiểu (VNĐ)', category: 'Sales & Tax', lastUpdated: new Date().toISOString() },
        { key: 'FREESHIP_THRESHOLD', value: '500000', description: 'Ngưỡng freeship (VNĐ)', category: 'Sales & Tax', lastUpdated: new Date().toISOString() },
        { key: 'SHIPPING_FEE', value: '30000', description: 'Phí ship cơ bản (VNĐ)', category: 'Sales & Tax', lastUpdated: new Date().toISOString() },
        { key: 'RETURN_PERIOD_DAYS', value: '7', description: 'Thời gian đổi trả (ngày)', category: 'Sales & Tax', lastUpdated: new Date().toISOString() },
        { key: 'WARRANTY_PERIOD_MONTHS', value: '36', description: 'Thời gian bảo hành cơ bản (tháng)', category: 'Sales & Tax', lastUpdated: new Date().toISOString() },
    ],
    'HR & Payroll': [
        { key: 'BASE_SALARY', value: '5000000', description: 'Lương cơ bản nhân viên (VNĐ)', category: 'HR & Payroll', lastUpdated: new Date().toISOString() },
        { key: 'OVERTIME_RATE', value: '1.5', description: 'Hệ số làm thêm giờ', category: 'HR & Payroll', lastUpdated: new Date().toISOString() },
        { key: 'BONUS_RATE', value: '0.15', description: 'Tỷ lệ thưởng (%) trên doanh số', category: 'HR & Payroll', lastUpdated: new Date().toISOString() },
        { key: 'SOCIAL_INSURANCE_RATE', value: '0.105', description: 'Tỷ lệ BHXH (%) - 10.5%', category: 'HR & Payroll', lastUpdated: new Date().toISOString() },
        { key: 'HEALTH_INSURANCE_RATE', value: '0.03', description: 'Tỷ lệ BHYT (%) - 3%', category: 'HR & Payroll', lastUpdated: new Date().toISOString() },
        { key: 'UNEMPLOYMENT_INSURANCE_RATE', value: '0.01', description: 'Tỷ lệ BHTN (%) - 1%', category: 'HR & Payroll', lastUpdated: new Date().toISOString() },
        { key: 'WORKING_HOURS_PER_DAY', value: '8', description: 'Số giờ làm việc/ngày', category: 'HR & Payroll', lastUpdated: new Date().toISOString() },
        { key: 'WORKING_DAYS_PER_MONTH', value: '26', description: 'Số ngày làm việc/tháng', category: 'HR & Payroll', lastUpdated: new Date().toISOString() },
        { key: 'ANNUAL_LEAVE_DAYS', value: '12', description: 'Số ngày phép năm', category: 'HR & Payroll', lastUpdated: new Date().toISOString() },
    ],
    'Repair SLA': [
        { key: 'REPAIR_WARRANTY_MONTHS', value: '3', description: 'Bảo hành dịch vụ sửa chữa (tháng)', category: 'Repair SLA', lastUpdated: new Date().toISOString() },
        { key: 'REPAIR_RESPONSE_TIME', value: '24', description: 'Thời gian phản hồi yêu cầu (giờ)', category: 'Repair SLA', lastUpdated: new Date().toISOString() },
        { key: 'REPAIR_COMPLETION_TIME', value: '72', description: 'Thời gian hoàn thành sửa chữa (giờ)', category: 'Repair SLA', lastUpdated: new Date().toISOString() },
        { key: 'DIAGNOSTIC_FEE', value: '100000', description: 'Phí kiểm tra chẩn đoán (VNĐ)', category: 'Repair SLA', lastUpdated: new Date().toISOString() },
        { key: 'URGENT_REPAIR_FEE', value: '200000', description: 'Phí sửa chữa khẩn cấp (VNĐ)', category: 'Repair SLA', lastUpdated: new Date().toISOString() },
    ],
    'Security': [
        { key: 'SESSION_TIMEOUT', value: '3600', description: 'Thời gian timeout phiên (giây)', category: 'Security', lastUpdated: new Date().toISOString() },
        { key: 'MAX_LOGIN_ATTEMPTS', value: '5', description: 'Số lần đăng nhập sai tối đa', category: 'Security', lastUpdated: new Date().toISOString() },
        { key: 'PASSWORD_MIN_LENGTH', value: '8', description: 'Độ dài mật khẩu tối thiểu', category: 'Security', lastUpdated: new Date().toISOString() },
        { key: 'REQUIRE_2FA', value: 'false', description: 'Bắt buộc xác thực 2 yếu tố (true/false)', category: 'Security', lastUpdated: new Date().toISOString() },
        { key: 'PASSWORD_EXPIRY_DAYS', value: '90', description: 'Thời gian hết hạn mật khẩu (ngày)', category: 'Security', lastUpdated: new Date().toISOString() },
    ],
    'AI Chatbot': [
        { key: 'CHATBOT_ENABLED', value: 'true', description: 'Bật/tắt chatbot (true/false)', category: 'AI Chatbot', lastUpdated: new Date().toISOString() },
        { key: 'CHATBOT_GREETING', value: 'Xin chào! Tôi có thể giúp gì cho bạn?', description: 'Tin nhắn chào mừng', category: 'AI Chatbot', lastUpdated: new Date().toISOString() },
        { key: 'CHATBOT_RESPONSE_DELAY', value: '1500', description: 'Độ trễ phản hồi (ms)', category: 'AI Chatbot', lastUpdated: new Date().toISOString() },
        { key: 'CHATBOT_MAX_MESSAGES', value: '50', description: 'Số tin nhắn tối đa lưu trữ', category: 'AI Chatbot', lastUpdated: new Date().toISOString() },
    ],
    'Notifications': [
        { key: 'EMAIL_NOTIFICATIONS', value: 'true', description: 'Gửi thông báo qua email (true/false)', category: 'Notifications', lastUpdated: new Date().toISOString() },
        { key: 'SMS_NOTIFICATIONS', value: 'false', description: 'Gửi thông báo qua SMS (true/false)', category: 'Notifications', lastUpdated: new Date().toISOString() },
        { key: 'ORDER_CONFIRMATION_EMAIL', value: 'true', description: 'Email xác nhận đơn hàng (true/false)', category: 'Notifications', lastUpdated: new Date().toISOString() },
        { key: 'LOW_STOCK_ALERT_THRESHOLD', value: '5', description: 'Ngưỡng cảnh báo hết hàng', category: 'Notifications', lastUpdated: new Date().toISOString() },
    ],
    'Social Media': [
        { key: 'FACEBOOK_URL', value: 'https://facebook.com/quanghuongcomputer', description: 'Link Facebook fanpage', category: 'Social Media', lastUpdated: new Date().toISOString() },
        { key: 'YOUTUBE_URL', value: 'https://youtube.com/@quanghuongcomputer', description: 'Link Youtube channel', category: 'Social Media', lastUpdated: new Date().toISOString() },
        { key: 'INSTAGRAM_URL', value: 'https://instagram.com/quanghuongcomputer', description: 'Link Instagram', category: 'Social Media', lastUpdated: new Date().toISOString() },
        { key: 'TIKTOK_URL', value: 'https://tiktok.com/@quanghuongcomputer', description: 'Link TikTok', category: 'Social Media', lastUpdated: new Date().toISOString() },
        { key: 'ZALO_PHONE', value: '0904235090', description: 'Số Zalo hỗ trợ', category: 'Social Media', lastUpdated: new Date().toISOString() },
    ]
};

export const ConfigPortal = () => {
    const [configs, setConfigs] = useState<ConfigurationEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('Company');
    const [hasChanges, setHasChanges] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchConfigs = async () => {
            setIsLoading(true);
            try {
                const data = await systemConfigApi.getConfigs();

                // Merge with default configs if backend is empty
                if (!data || data.length === 0) {
                    const allDefaults = Object.values(DEFAULT_CONFIGS).flat();
                    setConfigs(allDefaults);
                } else {
                    setConfigs(data);
                }
            } catch (error) {
                console.error('Failed to fetch configs', error);
                // Use default configs on error
                const allDefaults = Object.values(DEFAULT_CONFIGS).flat();
                setConfigs(allDefaults);
            } finally {
                setIsLoading(false);
            }
        };
        fetchConfigs();
    }, []);

    const categories = [
        { name: 'Company', label: 'Thông tin công ty', icon: <Building2 size={20} />, color: 'text-blue-600' },
        { name: 'Sales & Tax', label: 'Bán hàng & Thuế', icon: <ShoppingBag size={20} />, color: 'text-emerald-600' },
        { name: 'HR & Payroll', label: 'Nhân sự & Lương', icon: <Users size={20} />, color: 'text-purple-600' },
        { name: 'Repair SLA', label: 'SLA Sửa chữa', icon: <Wrench size={20} />, color: 'text-amber-600' },
        { name: 'Security', label: 'Bảo mật', icon: <Shield size={20} />, color: 'text-red-600' },
        { name: 'AI Chatbot', label: 'Hỗ trợ AI', icon: <MessageCircle size={20} />, color: 'text-indigo-600' },
        { name: 'Notifications', label: 'Thông báo', icon: <Bell size={20} />, color: 'text-orange-600' },
        { name: 'Social Media', label: 'Mạng xã hội', icon: <Globe size={20} />, color: 'text-pink-600' },
    ];

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
            setHasChanges(false);
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

    const filteredConfigs = configs.filter(config =>
        config.category === activeCategory &&
        (searchQuery === '' || config.key.toLowerCase().includes(searchQuery.toLowerCase()) || config.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

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
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-3">
                        Cấu hình <span className="text-accent">Hệ thống</span>
                    </h1>
                    <p className="text-gray-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                        <Database size={16} />
                        Quản lý toàn bộ thông số vận hành doanh nghiệp
                    </p>
                </div>
                {hasChanges && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-2 border-amber-200 rounded-xl">
                        <AlertTriangle size={20} className="text-amber-600" />
                        <span className="text-xs font-black text-amber-800 uppercase">
                            Có thay đổi chưa lưu
                        </span>
                    </div>
                )}
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
                            <span className={activeCategory === cat.name ? 'text-accent' : cat.color}>
                                {cat.icon}
                            </span>
                            {cat.label}
                            {activeCategory === cat.name && (
                                <span className="ml-auto bg-accent text-white px-2 py-1 rounded-full text-[10px]">
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
                                    <span className={categories.find(c => c.name === activeCategory)?.color || 'text-gray-600'}>
                                        {categories.find(c => c.name === activeCategory)?.icon}
                                    </span>
                                    <h3 className="text-3xl font-black text-gray-950 uppercase italic tracking-tighter">
                                        {categories.find(c => c.name === activeCategory)?.label || activeCategory}
                                    </h3>
                                </div>
                                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
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

                                {/* Save Button */}
                                <button
                                    onClick={handleSave}
                                    disabled={!hasChanges}
                                    className={`flex items-center gap-3 px-8 py-3 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95 group ${hasChanges
                                        ? 'bg-accent hover:bg-accent-hover shadow-red-500/20'
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
                                <div key={config.key} className={`space-y-3 group border-2 rounded-2xl p-6 transition-all bg-gradient-to-r from-gray-50/50 to-white ${hasError ? 'border-red-200 bg-red-50/30' : 'border-gray-50 hover:border-accent/20'}`}>
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-black text-gray-950 uppercase tracking-widest flex items-center gap-3">
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
                                            }`}>{configType}</span>
                                        </label>
                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
                                            <Clock size={12} />
                                            {new Date(config.lastUpdated).toLocaleDateString('vi-VN')}
                                        </span>
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
                                            <span className={`text-sm font-black uppercase tracking-widest ${
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
                                    <p className="text-sm text-gray-900 font-black uppercase tracking-widest mt-8 italic">
                                        Đang đồng bộ cấu hình hệ thống...
                                    </p>
                                </div>
                            )}

                            {!isLoading && filteredConfigs.length === 0 && (
                                <div className="py-24 text-center bg-gray-50 rounded-[2rem] border-4 border-dashed border-gray-100">
                                    <Database className="mx-auto text-gray-200 mb-6" size={80} />
                                    <p className="text-sm text-gray-400 font-black uppercase tracking-widest">
                                        {searchQuery ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có cấu hình nào'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200">
                            <Database className="text-blue-600 mb-3" size={32} />
                            <h4 className="text-2xl font-black text-blue-900">{configs.length}</h4>
                            <p className="text-xs font-bold text-blue-700 uppercase">Tổng số cấu hình</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border-2 border-emerald-200">
                            <Award className="text-emerald-600 mb-3" size={32} />
                            <h4 className="text-2xl font-black text-emerald-900">{categories.length}</h4>
                            <p className="text-xs font-bold text-emerald-700 uppercase">Danh mục</p>
                        </div>
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-6 border-2 border-amber-200">
                            <Clock className="text-amber-600 mb-3" size={32} />
                            <h4 className="text-2xl font-black text-amber-900">
                                {configs.length > 0 ? new Date(Math.max(...configs.map(c => new Date(c.lastUpdated).getTime()))).toLocaleDateString('vi-VN') : '-'}
                            </h4>
                            <p className="text-xs font-bold text-amber-700 uppercase">Cập nhật gần nhất</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

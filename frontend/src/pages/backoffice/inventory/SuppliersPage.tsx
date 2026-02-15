import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    inventoryApi,
    Supplier,
    SupplierListItem,
    CreateSupplierDto,
    SupplierType,
    PaymentTermType,
    supplierTypeLabels,
    paymentTermLabels,
    formatCurrency
} from '../../../api/inventory';
import {
    Building2, Plus, Search, Filter, Eye, Edit2, Power, PowerOff,
    Phone, Mail, MapPin, Globe, CreditCard, Landmark, FileText,
    Star, StarHalf, Package, TrendingUp, Users, AlertTriangle,
    ChevronRight, X, Loader2, Save, Building, User, Wallet,
    Calendar, Hash, ExternalLink, CheckCircle, XCircle, BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// STATISTICS CARD COMPONENT
// ============================================
const StatCard = ({ icon: Icon, label, value, subValue, color, trend }: {
    icon: any;
    label: string;
    value: string | number;
    subValue?: string;
    color: string;
    trend?: 'up' | 'down' | 'neutral';
}) => (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-start justify-between">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={24} />
            </div>
            {trend && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
                    trend === 'down' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                }`}>
                    {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
                </span>
            )}
        </div>
        <div className="mt-4">
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
        </div>
    </div>
);

// ============================================
// RATING STARS COMPONENT
// ============================================
const RatingStars = ({ rating, size = 16 }: { rating: number; size?: number }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars.push(<Star key={i} size={size} className="fill-amber-400 text-amber-400" />);
        } else if (i - 0.5 <= rating) {
            stars.push(<StarHalf key={i} size={size} className="fill-amber-400 text-amber-400" />);
        } else {
            stars.push(<Star key={i} size={size} className="text-gray-300" />);
        }
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
};

// ============================================
// SUPPLIER FORM COMPONENT
// ============================================
const SupplierForm = ({
    initialData,
    onSubmit,
    onCancel,
    isSubmitting
}: {
    initialData?: Supplier;
    onSubmit: (data: CreateSupplierDto) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}) => {
    const [activeTab, setActiveTab] = useState<'basic' | 'business' | 'contact' | 'notes'>('basic');
    const [formData, setFormData] = useState<CreateSupplierDto>({
        name: initialData?.name || '',
        shortName: initialData?.shortName || '',
        supplierType: initialData?.supplierType || 'Distributor',
        description: initialData?.description || '',
        website: initialData?.website || '',
        logoUrl: initialData?.logoUrl || '',
        taxCode: initialData?.taxCode || '',
        bankAccount: initialData?.bankAccount || '',
        bankName: initialData?.bankName || '',
        bankBranch: initialData?.bankBranch || '',
        paymentTerms: initialData?.paymentTerms || 'COD',
        paymentDays: initialData?.paymentDays,
        creditLimit: initialData?.creditLimit || 0,
        contactPerson: initialData?.contactPerson || '',
        contactTitle: initialData?.contactTitle || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        fax: initialData?.fax || '',
        address: initialData?.address || '',
        ward: initialData?.ward || '',
        district: initialData?.district || '',
        city: initialData?.city || '',
        country: initialData?.country || 'Việt Nam',
        postalCode: initialData?.postalCode || '',
        rating: initialData?.rating || 0,
        notes: initialData?.notes || '',
        categories: initialData?.categories || '',
        brands: initialData?.brands || ''
    });

    const handleChange = (field: keyof CreateSupplierDto, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const tabs = [
        { id: 'basic', label: 'Thông tin cơ bản', icon: Building },
        { id: 'business', label: 'Thông tin kinh doanh', icon: Wallet },
        { id: 'contact', label: 'Liên hệ & Địa chỉ', icon: User },
        { id: 'notes', label: 'Ghi chú', icon: FileText }
    ];

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6 bg-gray-50">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                            activeTab === tab.id
                                ? 'border-[#D70018] text-[#D70018]'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'basic' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Tên nhà cung cấp <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => handleChange('name', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                    placeholder="VD: Công ty TNHH ABC"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Tên viết tắt
                                </label>
                                <input
                                    type="text"
                                    value={formData.shortName || ''}
                                    onChange={e => handleChange('shortName', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                    placeholder="VD: ABC"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Loại nhà cung cấp <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.supplierType}
                                    onChange={e => handleChange('supplierType', e.target.value as SupplierType)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                >
                                    {Object.entries(supplierTypeLabels).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Mô tả
                            </label>
                            <textarea
                                value={formData.description || ''}
                                onChange={e => handleChange('description', e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all resize-none"
                                placeholder="Mô tả về nhà cung cấp..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Website
                                </label>
                                <input
                                    type="url"
                                    value={formData.website || ''}
                                    onChange={e => handleChange('website', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                    placeholder="https://example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Logo URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.logoUrl || ''}
                                    onChange={e => handleChange('logoUrl', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                    placeholder="https://example.com/logo.png"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'business' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Mã số thuế
                                </label>
                                <input
                                    type="text"
                                    value={formData.taxCode || ''}
                                    onChange={e => handleChange('taxCode', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                    placeholder="0123456789"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Điều khoản thanh toán <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.paymentTerms}
                                    onChange={e => handleChange('paymentTerms', e.target.value as PaymentTermType)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                >
                                    {Object.entries(paymentTermLabels).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {formData.paymentTerms === 'Custom' && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Số ngày công nợ
                                </label>
                                <input
                                    type="number"
                                    value={formData.paymentDays || ''}
                                    onChange={e => handleChange('paymentDays', parseInt(e.target.value) || undefined)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                    placeholder="30"
                                    min={1}
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Hạn mức công nợ (VND)
                            </label>
                            <input
                                type="number"
                                value={formData.creditLimit}
                                onChange={e => handleChange('creditLimit', parseFloat(e.target.value) || 0)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                placeholder="100000000"
                                min={0}
                            />
                            <p className="text-xs text-gray-500 mt-1">Để trống hoặc 0 nếu không giới hạn</p>
                        </div>
                        <div className="border-t border-gray-200 pt-5">
                            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Landmark size={18} />
                                Thông tin ngân hàng
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Số tài khoản
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.bankAccount || ''}
                                        onChange={e => handleChange('bankAccount', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                        placeholder="0123456789"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Tên ngân hàng
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.bankName || ''}
                                        onChange={e => handleChange('bankName', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                        placeholder="VD: Vietcombank"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Chi nhánh
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.bankBranch || ''}
                                        onChange={e => handleChange('bankBranch', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                        placeholder="VD: Chi nhánh Hà Nội"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'contact' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Người liên hệ <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.contactPerson}
                                    onChange={e => handleChange('contactPerson', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                    placeholder="Nguyễn Văn A"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Chức vụ
                                </label>
                                <input
                                    type="text"
                                    value={formData.contactTitle || ''}
                                    onChange={e => handleChange('contactTitle', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                    placeholder="Giám đốc kinh doanh"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Điện thoại <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => handleChange('phone', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                    placeholder="0901234567"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => handleChange('email', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                    placeholder="contact@example.com"
                                    required
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Fax
                                </label>
                                <input
                                    type="text"
                                    value={formData.fax || ''}
                                    onChange={e => handleChange('fax', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                    placeholder="028 1234 5678"
                                />
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-5">
                            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <MapPin size={18} />
                                Địa chỉ
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Địa chỉ <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={e => handleChange('address', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                        placeholder="Số nhà, tên đường"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">
                                            Phường/Xã
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.ward || ''}
                                            onChange={e => handleChange('ward', e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">
                                            Quận/Huyện
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.district || ''}
                                            onChange={e => handleChange('district', e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">
                                            Tỉnh/Thành phố
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.city || ''}
                                            onChange={e => handleChange('city', e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Đánh giá nhà cung cấp
                            </label>
                            <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleChange('rating', formData.rating === star ? 0 : star)}
                                        className="p-1 hover:scale-110 transition-transform"
                                    >
                                        <Star
                                            size={28}
                                            className={star <= formData.rating
                                                ? 'fill-amber-400 text-amber-400'
                                                : 'text-gray-300 hover:text-amber-200'}
                                        />
                                    </button>
                                ))}
                                <span className="ml-2 text-sm text-gray-500">
                                    {formData.rating > 0 ? `${formData.rating}/5 sao` : 'Chưa đánh giá'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Danh mục sản phẩm cung cấp
                            </label>
                            <input
                                type="text"
                                value={formData.categories || ''}
                                onChange={e => handleChange('categories', e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                placeholder="Laptop, PC, Linh kiện, ..."
                            />
                            <p className="text-xs text-gray-500 mt-1">Phân cách bằng dấu phẩy</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Thương hiệu cung cấp
                            </label>
                            <input
                                type="text"
                                value={formData.brands || ''}
                                onChange={e => handleChange('brands', e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                placeholder="Dell, HP, Lenovo, ..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Ghi chú nội bộ
                            </label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={e => handleChange('notes', e.target.value)}
                                rows={5}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all resize-none"
                                placeholder="Ghi chú về nhà cung cấp này (chỉ hiển thị nội bộ)..."
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-3 bg-[#D70018] text-white font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Save size={18} />
                    )}
                    {initialData ? 'Cập nhật' : 'Tạo mới'}
                </button>
            </div>
        </form>
    );
};

// ============================================
// SUPPLIER DETAIL DRAWER
// ============================================
const SupplierDetailDrawer = ({
    supplier,
    onClose,
    onEdit
}: {
    supplier: Supplier;
    onClose: () => void;
    onEdit: () => void;
}) => (
    <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    {supplier.logoUrl ? (
                        <img src={supplier.logoUrl} alt={supplier.name} className="w-16 h-16 rounded-2xl object-cover" />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D70018] to-red-600 flex items-center justify-center text-white text-2xl font-black">
                            {supplier.name.charAt(0)}
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#D70018] bg-red-50 px-2 py-1 rounded-lg">
                                {supplier.code}
                            </span>
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                supplier.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {supplier.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                            </span>
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mt-1">{supplier.name}</h2>
                        <p className="text-sm text-gray-500">{supplier.supplierTypeDisplay}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <X size={20} />
                </button>
            </div>
            <div className="flex items-center gap-3 mt-4">
                <RatingStars rating={supplier.rating} size={18} />
                <span className="text-sm text-gray-500">
                    {supplier.rating > 0 ? `${supplier.rating}/5 sao` : 'Chưa đánh giá'}
                </span>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4">
                    <Package size={20} className="text-blue-600" />
                    <p className="text-2xl font-black text-gray-900 mt-2">{supplier.totalOrders}</p>
                    <p className="text-xs text-gray-500">Đơn hàng</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-4">
                    <TrendingUp size={20} className="text-emerald-600" />
                    <p className="text-2xl font-black text-gray-900 mt-2">{formatCurrency(supplier.totalPurchaseAmount)}</p>
                    <p className="text-xs text-gray-500">Tổng mua hàng</p>
                </div>
            </div>

            {/* Contact Info */}
            <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Liên hệ</h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <User size={18} className="text-gray-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">{supplier.contactPerson}</p>
                            {supplier.contactTitle && <p className="text-xs text-gray-500">{supplier.contactTitle}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Phone size={18} className="text-gray-500" />
                        </div>
                        <a href={`tel:${supplier.phone}`} className="font-semibold text-blue-600 hover:underline">
                            {supplier.phone}
                        </a>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Mail size={18} className="text-gray-500" />
                        </div>
                        <a href={`mailto:${supplier.email}`} className="font-semibold text-blue-600 hover:underline">
                            {supplier.email}
                        </a>
                    </div>
                    {supplier.website && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                                <Globe size={18} className="text-gray-500" />
                            </div>
                            <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline flex items-center gap-1">
                                {supplier.website.replace(/^https?:\/\//, '')}
                                <ExternalLink size={14} />
                            </a>
                        </div>
                    )}
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <MapPin size={18} className="text-gray-500" />
                        </div>
                        <p className="text-gray-700">{supplier.fullAddress}</p>
                    </div>
                </div>
            </div>

            {/* Business Info */}
            <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Thông tin kinh doanh</h3>
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                    {supplier.taxCode && (
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500">Mã số thuế</span>
                            <span className="font-semibold text-gray-900">{supplier.taxCode}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500">Điều khoản thanh toán</span>
                        <span className="font-semibold text-gray-900">{supplier.paymentTermsDisplay}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500">Hạn mức công nợ</span>
                        <span className="font-semibold text-gray-900">
                            {supplier.creditLimit > 0 ? formatCurrency(supplier.creditLimit) : 'Không giới hạn'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500">Công nợ hiện tại</span>
                        <span className={`font-semibold ${supplier.currentDebt > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatCurrency(supplier.currentDebt)}
                        </span>
                    </div>
                    {supplier.creditLimit > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500">Hạn mức còn lại</span>
                            <span className={`font-semibold ${supplier.availableCredit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {formatCurrency(supplier.availableCredit)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bank Info */}
            {supplier.bankAccount && (
                <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Ngân hàng</h3>
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500">Số tài khoản</span>
                            <span className="font-mono font-semibold text-gray-900">{supplier.bankAccount}</span>
                        </div>
                        {supplier.bankName && (
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Ngân hàng</span>
                                <span className="font-semibold text-gray-900">{supplier.bankName}</span>
                            </div>
                        )}
                        {supplier.bankBranch && (
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Chi nhánh</span>
                                <span className="font-semibold text-gray-900">{supplier.bankBranch}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Categories & Brands */}
            {(supplier.categories || supplier.brands) && (
                <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Sản phẩm cung cấp</h3>
                    {supplier.categories && (
                        <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-2">Danh mục:</p>
                            <div className="flex flex-wrap gap-2">
                                {supplier.categories.split(',').map((cat, i) => (
                                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                                        {cat.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {supplier.brands && (
                        <div>
                            <p className="text-xs text-gray-500 mb-2">Thương hiệu:</p>
                            <div className="flex flex-wrap gap-2">
                                {supplier.brands.split(',').map((brand, i) => (
                                    <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                                        {brand.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Notes */}
            {supplier.notes && (
                <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Ghi chú</h3>
                    <p className="text-gray-700 bg-amber-50 rounded-xl p-4 border border-amber-100">
                        {supplier.notes}
                    </p>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
            <button
                onClick={onEdit}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#D70018] text-white font-bold rounded-xl hover:bg-red-700 transition-all"
            >
                <Edit2 size={18} />
                Chỉnh sửa
            </button>
        </div>
    </div>
);

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export function SuppliersPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<string>('');
    const [includeInactive, setIncludeInactive] = useState(false);
    const [page, setPage] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);

    // Queries
    const { data: suppliersData, isLoading } = useQuery({
        queryKey: ['suppliers', { search, filterType, includeInactive, page }],
        queryFn: () => inventoryApi.getSuppliers({
            search,
            page,
            pageSize: 20,
            includeInactive
        })
    });

    const { data: stats } = useQuery({
        queryKey: ['supplier-statistics'],
        queryFn: inventoryApi.getSupplierStatistics
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: inventoryApi.createSupplier,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-statistics'] });
            setShowForm(false);
            toast.success('Đã tạo nhà cung cấp mới!');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Lỗi khi tạo nhà cung cấp');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: CreateSupplierDto }) =>
            inventoryApi.updateSupplier(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-statistics'] });
            setShowForm(false);
            setEditingSupplier(null);
            toast.success('Đã cập nhật nhà cung cấp!');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Lỗi khi cập nhật');
        }
    });

    const toggleActiveMutation = useMutation({
        mutationFn: inventoryApi.toggleSupplierActive,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-statistics'] });
            toast.success(data.isActive ? 'Đã kích hoạt nhà cung cấp!' : 'Đã vô hiệu hóa nhà cung cấp!');
        },
        onError: () => toast.error('Thao tác thất bại!')
    });

    const handleView = async (supplier: SupplierListItem) => {
        try {
            const fullSupplier = await inventoryApi.getSupplier(supplier.id);
            setViewingSupplier(fullSupplier);
        } catch (error) {
            toast.error('Không thể tải thông tin nhà cung cấp');
        }
    };

    const handleEdit = async (supplier: SupplierListItem) => {
        try {
            const fullSupplier = await inventoryApi.getSupplier(supplier.id);
            setEditingSupplier(fullSupplier);
            setShowForm(true);
            setViewingSupplier(null);
        } catch (error) {
            toast.error('Không thể tải thông tin nhà cung cấp');
        }
    };

    const handleSubmit = (data: CreateSupplierDto) => {
        if (editingSupplier) {
            updateMutation.mutate({ id: editingSupplier.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleToggleActive = (supplier: SupplierListItem) => {
        const action = supplier.isActive ? 'vô hiệu hóa' : 'kích hoạt';
        if (window.confirm(`Bạn có chắc muốn ${action} nhà cung cấp "${supplier.name}"?`)) {
            toggleActiveMutation.mutate(supplier.id);
        }
    };

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight uppercase italic leading-none mb-3">
                        Nhà <span className="text-[#D70018]">Cung Cấp</span>
                    </h1>
                    <p className="text-gray-600 font-semibold text-sm">
                        Quản lý danh sách nhà cung cấp, thông tin liên hệ và công nợ
                    </p>
                </div>
                <button
                    onClick={() => { setEditingSupplier(null); setShowForm(true); }}
                    className="flex items-center gap-3 px-6 py-4 bg-[#D70018] hover:bg-red-700 text-white text-sm font-bold uppercase tracking-wide rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-95"
                >
                    <Plus size={20} />
                    Thêm nhà cung cấp
                </button>
            </div>

            {/* Statistics */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        icon={Building2}
                        label="Tổng nhà cung cấp"
                        value={stats.totalSuppliers}
                        subValue={`${stats.activeSuppliers} đang hoạt động`}
                        color="bg-blue-100 text-blue-600"
                    />
                    <StatCard
                        icon={CreditCard}
                        label="Tổng công nợ"
                        value={formatCurrency(stats.totalDebt)}
                        subValue={`${stats.suppliersWithDebt} NCC có công nợ`}
                        color="bg-amber-100 text-amber-600"
                        trend={stats.totalDebt > 0 ? 'up' : 'neutral'}
                    />
                    <StatCard
                        icon={Wallet}
                        label="Tổng hạn mức"
                        value={formatCurrency(stats.totalCreditLimit)}
                        color="bg-emerald-100 text-emerald-600"
                    />
                    <StatCard
                        icon={AlertTriangle}
                        label="Vượt hạn mức"
                        value={stats.suppliersOverCreditLimit}
                        subValue="NCC cần chú ý"
                        color="bg-red-100 text-red-600"
                        trend={stats.suppliersOverCreditLimit > 0 ? 'down' : 'neutral'}
                    />
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex-1 relative">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên, mã, MST, email, điện thoại..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                    />
                </div>
                <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] min-w-[200px]"
                >
                    <option value="">Tất cả loại</option>
                    {Object.entries(supplierTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
                <label className="flex items-center gap-2 cursor-pointer px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all">
                    <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={e => setIncludeInactive(e.target.checked)}
                        className="w-4 h-4 rounded text-[#D70018] focus:ring-[#D70018]"
                    />
                    <span className="text-sm font-medium text-gray-700">Hiển thị đã ngừng</span>
                </label>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-[#D70018]" />
                    </div>
                ) : suppliersData?.items.length === 0 ? (
                    <div className="text-center py-20">
                        <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-400">Chưa có nhà cung cấp nào</h3>
                        <p className="text-gray-400 mt-1">Bấm "Thêm nhà cung cấp" để bắt đầu</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wide">Nhà cung cấp</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Loại</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Liên hệ</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Thanh toán</th>
                                    <th className="text-right py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Công nợ</th>
                                    <th className="text-center py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Đánh giá</th>
                                    <th className="text-center py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                                    <th className="text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wide">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {suppliersData?.items.map(supplier => (
                                    <motion.tr
                                        key={supplier.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D70018] to-red-600 flex items-center justify-center text-white font-bold text-sm">
                                                    {supplier.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{supplier.name}</p>
                                                    <p className="text-xs text-gray-500">{supplier.code}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                                                {supplier.supplierTypeDisplay}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{supplier.contactPerson}</p>
                                                <p className="text-xs text-gray-500">{supplier.phone}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-sm text-gray-700">{supplier.paymentTermsDisplay}</span>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <p className={`font-bold ${supplier.currentDebt > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                {formatCurrency(supplier.currentDebt)}
                                            </p>
                                            {supplier.creditLimit > 0 && (
                                                <p className="text-xs text-gray-400">
                                                    / {formatCurrency(supplier.creditLimit)}
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <div className="flex justify-center">
                                                <RatingStars rating={supplier.rating} size={14} />
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                                                supplier.isActive
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {supplier.isActive ? (
                                                    <><CheckCircle size={12} /> Hoạt động</>
                                                ) : (
                                                    <><XCircle size={12} /> Ngừng</>
                                                )}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleView(supplier)}
                                                    className="p-2 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(supplier)}
                                                    className="p-2 hover:bg-amber-50 text-gray-400 hover:text-amber-600 rounded-lg transition-colors"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(supplier)}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        supplier.isActive
                                                            ? 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                                                            : 'hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700'
                                                    }`}
                                                    title={supplier.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                                >
                                                    {supplier.isActive ? <PowerOff size={18} /> : <Power size={18} />}
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {suppliersData && suppliersData.totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            Hiển thị {(page - 1) * 20 + 1} - {Math.min(page * 20, suppliersData.total)} trong tổng số {suppliersData.total} nhà cung cấp
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 bg-gray-100 text-gray-600 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Trước
                            </button>
                            <span className="px-4 py-2 text-sm font-medium text-gray-700">
                                Trang {page} / {suppliersData.totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(suppliersData.totalPages, p + 1))}
                                disabled={page === suppliersData.totalPages}
                                className="px-4 py-2 bg-gray-100 text-gray-600 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setShowForm(false); setEditingSupplier(null); }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                                    {editingSupplier ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {editingSupplier ? `Cập nhật thông tin ${editingSupplier.name}` : 'Nhập thông tin nhà cung cấp mới'}
                                </p>
                            </div>
                            <SupplierForm
                                initialData={editingSupplier || undefined}
                                onSubmit={handleSubmit}
                                onCancel={() => { setShowForm(false); setEditingSupplier(null); }}
                                isSubmitting={createMutation.isPending || updateMutation.isPending}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Detail Drawer */}
            <AnimatePresence>
                {viewingSupplier && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setViewingSupplier(null)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-lg bg-white shadow-2xl"
                        >
                            <SupplierDetailDrawer
                                supplier={viewingSupplier}
                                onClose={() => setViewingSupplier(null)}
                                onEdit={() => {
                                    setEditingSupplier(viewingSupplier);
                                    setShowForm(true);
                                    setViewingSupplier(null);
                                }}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

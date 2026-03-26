import { useState, useEffect, useCallback } from 'react';
import {
    ShoppingCart, Plus, Package, Truck, CheckCircle, XCircle,
    Clock, Search, RefreshCw, X, Trash2, AlertCircle, FileText
} from 'lucide-react';
import { inventoryApi } from '../../../api/inventory';
import type { PurchaseOrder, POStatus, SupplierDropdownItem, CreatePurchaseOrderDto } from '../../../api/inventory';
import { catalogApi } from '../../../api/catalog';
import type { Product } from '../../../api/catalog';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';

// ============================
// Status badge config
// ============================
const STATUS_CONFIG: Record<POStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
    Draft: { label: 'Nháp', bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText },
    Sent: { label: 'Đã gửi', bg: 'bg-blue-100', text: 'text-blue-700', icon: Truck },
    PartialReceived: { label: 'Nhận 1 phần', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
    Received: { label: 'Đã nhận', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    Cancelled: { label: 'Đã hủy', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
};

// ============================
// Stat Card Component
// ============================
const StatCard = ({ icon: Icon, label, value, color }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color: string;
}) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
            <Icon size={22} className="text-white" />
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

// ============================
// PO Item Row (for create form)
// ============================
interface POItemRow {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
}

// ============================
// Create PO Modal
// ============================
const CreatePOModal = ({
    isOpen,
    onClose,
    onSubmit,
    suppliers,
    isSubmitting
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreatePurchaseOrderDto) => void;
    suppliers: SupplierDropdownItem[];
    isSubmitting: boolean;
}) => {
    const [supplierId, setSupplierId] = useState('');
    const [items, setItems] = useState<POItemRow[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Search products with debounce
    useEffect(() => {
        if (productSearch.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const result = await catalogApi.searchProducts({ query: productSearch, pageSize: 10 });
                setSearchResults(result.products);
                setShowDropdown(true);
            } catch {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [productSearch]);

    const addProduct = (product: Product) => {
        if (items.find(i => i.productId === product.id)) {
            toast.error('Sản phẩm đã có trong danh sách');
            return;
        }
        setItems(prev => [...prev, {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitPrice: product.costPrice || product.price || 0
        }]);
        setProductSearch('');
        setShowDropdown(false);
    };

    const updateItem = (index: number, field: 'quantity' | 'unitPrice', value: number) => {
        setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const removeItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId) { toast.error('Vui lòng chọn nhà cung cấp'); return; }
        if (items.length === 0) { toast.error('Vui lòng thêm ít nhất 1 sản phẩm'); return; }
        if (items.some(i => i.quantity <= 0)) { toast.error('Số lượng phải lớn hơn 0'); return; }
        onSubmit({
            supplierId,
            items: items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice }))
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Tạo đơn mua hàng</h2>
                        <p className="text-sm text-gray-500 mt-1">Thêm sản phẩm và chọn nhà cung cấp</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Supplier select */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nhà cung cấp *</label>
                        <select
                            value={supplierId}
                            onChange={e => setSupplierId(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white"
                            required
                        >
                            <option value="">-- Chọn nhà cung cấp --</option>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                            ))}
                        </select>
                    </div>

                    {/* Product search */}
                    <div className="relative">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Thêm sản phẩm</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={productSearch}
                                onChange={e => setProductSearch(e.target.value)}
                                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                placeholder="Tìm theo tên, SKU sản phẩm..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent"
                            />
                            {isSearching && (
                                <RefreshCw size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                            )}
                        </div>
                        {showDropdown && searchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                {searchResults.map(product => (
                                    <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => addProduct(product)}
                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-0"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                            <p className="text-xs text-gray-500">SKU: {product.sku} • Tồn: {product.stockQuantity}</p>
                                        </div>
                                        <span className="text-sm font-semibold text-accent">
                                            {(product.costPrice || product.price || 0).toLocaleString('vi-VN')}đ
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Items table */}
                    {items.length > 0 && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Sản phẩm</th>
                                        <th className="text-center px-4 py-3 font-semibold text-gray-600 w-28">Số lượng</th>
                                        <th className="text-right px-4 py-3 font-semibold text-gray-600 w-36">Đơn giá (đ)</th>
                                        <th className="text-right px-4 py-3 font-semibold text-gray-600 w-36">Thành tiền</th>
                                        <th className="w-12"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={item.productId} className="border-t border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{item.productName}</td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={item.quantity}
                                                    onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                                    className="w-full text-center px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={item.unitPrice}
                                                    onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                    className="w-full text-right px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                                {(item.quantity * item.unitPrice).toLocaleString('vi-VN')}
                                            </td>
                                            <td className="px-2 py-3">
                                                <button type="button" onClick={() => removeItem(idx)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={16} className="text-red-500" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                                        <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-700">Tổng cộng:</td>
                                        <td className="px-4 py-3 text-right font-bold text-accent text-lg">
                                            {totalAmount.toLocaleString('vi-VN')}đ
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}

                    {items.length === 0 && (
                        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            <Package size={40} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-sm text-gray-500">Tìm và thêm sản phẩm vào đơn mua hàng</p>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                    <div className="text-sm text-gray-500">
                        {items.length > 0 && `${items.length} sản phẩm • ${totalAmount.toLocaleString('vi-VN')}đ`}
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
                            Hủy
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || items.length === 0 || !supplierId}
                            className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-[#b5001e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                            <Plus size={16} />
                            Tạo đơn mua hàng
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================
// MAIN PAGE
// ============================
export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<SupplierDropdownItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<POStatus | 'all'>('all');
    const confirm = useConfirm();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersData, suppliersData] = await Promise.all([
                inventoryApi.getPurchaseOrders(),
                inventoryApi.getSuppliersDropdown(true)
            ]);
            setOrders(ordersData);
            setSuppliers(suppliersData);
        } catch (err) {
            console.error('Failed to fetch PO data:', err);
            toast.error('Lỗi tải dữ liệu đơn mua hàng');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Handlers
    const handleCreate = async (data: CreatePurchaseOrderDto) => {
        setIsSubmitting(true);
        try {
            await inventoryApi.createPurchaseOrder(data);
            toast.success('Tạo đơn mua hàng thành công!');
            setShowCreateModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Lỗi tạo đơn mua hàng');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReceive = async (po: PurchaseOrder) => {
        if (po.status === 'Received') {
            toast.error('Đơn hàng đã được nhận');
            return;
        }
        const ok = await confirm({ message: `Xác nhận nhận hàng cho đơn ${po.poNumber}?\nCập nhật tồn kho cho ${po.items.length} sản phẩm.`, variant: 'info' });
        if (!ok) return;
        try {
            await inventoryApi.receivePurchaseOrder(po.id);
            toast.success(`Đã nhận hàng ${po.poNumber}`);
            fetchData();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || err?.response?.data || 'Lỗi nhận hàng');
        }
    };

    // Stats
    const stats = {
        total: orders.length,
        draft: orders.filter(o => o.status === 'Draft').length,
        sent: orders.filter(o => o.status === 'Sent').length,
        received: orders.filter(o => o.status === 'Received').length,
        totalValue: orders.reduce((sum, o) => sum + o.totalAmount, 0)
    };

    // Filter
    const filtered = orders.filter(o => {
        const matchSearch = !searchTerm || o.poNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'all' || o.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // Supplier name lookup
    const getSupplierName = (supplierId: string) => {
        return suppliers.find(s => s.id === supplierId)?.name || supplierId.slice(0, 8) + '...';
    };

    return (
        <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-accent to-[#ff4d6a] rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                            <ShoppingCart size={22} className="text-white" />
                        </div>
                        Đơn mua hàng
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">Quản lý đơn đặt hàng từ nhà cung cấp</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-[#b5001e] transition-all shadow-lg shadow-red-200 hover:shadow-red-300"
                >
                    <Plus size={18} />
                    Tạo đơn mua hàng
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard icon={ShoppingCart} label="Tổng đơn" value={stats.total} color="bg-gradient-to-br from-blue-500 to-blue-600" />
                <StatCard icon={FileText} label="Nháp" value={stats.draft} color="bg-gradient-to-br from-gray-400 to-gray-500" />
                <StatCard icon={Truck} label="Đã gửi" value={stats.sent} color="bg-gradient-to-br from-orange-400 to-orange-500" />
                <StatCard icon={CheckCircle} label="Đã nhận" value={stats.received} color="bg-gradient-to-br from-green-500 to-green-600" />
                <StatCard icon={Package} label="Tổng giá trị" value={`${(stats.totalValue / 1e6).toFixed(1)}tr`} color="bg-gradient-to-br from-accent to-[#ff4d6a]" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-center shadow-sm">
                <div className="relative flex-1 min-w-[250px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Tìm theo mã đơn..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as POStatus | 'all')}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white min-w-[160px]"
                >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="Draft">Nháp</option>
                    <option value="Sent">Đã gửi</option>
                    <option value="PartialReceived">Nhận 1 phần</option>
                    <option value="Received">Đã nhận</option>
                    <option value="Cancelled">Đã hủy</option>
                </select>
                <button onClick={fetchData} className="p-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors" title="Làm mới">
                    <RefreshCw size={16} className="text-gray-500" />
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <RefreshCw size={24} className="animate-spin text-gray-400" />
                        <span className="ml-3 text-gray-500">Đang tải...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-500">Không có đơn mua hàng</h3>
                        <p className="text-sm text-gray-400 mt-1">Tạo đơn mua hàng mới để bắt đầu</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Mã đơn</th>
                                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Nhà cung cấp</th>
                                <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Trạng thái</th>
                                <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Sản phẩm</th>
                                <th className="text-right px-5 py-3.5 font-semibold text-gray-600">Tổng tiền</th>
                                <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(po => {
                                const statusCfg = STATUS_CONFIG[po.status] || STATUS_CONFIG.Draft;
                                const StatusIcon = statusCfg.icon;
                                return (
                                    <tr key={po.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <span className="font-mono font-semibold text-gray-900">{po.poNumber}</span>
                                        </td>
                                        <td className="px-5 py-4 text-gray-700">
                                            {getSupplierName(po.supplierId)}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
                                                <StatusIcon size={13} />
                                                {statusCfg.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-lg text-xs font-bold text-gray-700">
                                                {po.items.length}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right font-semibold text-gray-900">
                                            {po.totalAmount.toLocaleString('vi-VN')}đ
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {(po.status === 'Sent' || po.status === 'PartialReceived') && (
                                                <button
                                                    onClick={() => handleReceive(po)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-semibold transition-colors"
                                                >
                                                    <CheckCircle size={14} />
                                                    Nhận hàng
                                                </button>
                                            )}
                                            {po.status === 'Received' && (
                                                <span className="text-xs text-gray-400">✓ Hoàn tất</span>
                                            )}
                                            {po.status === 'Draft' && (
                                                <span className="text-xs text-gray-400 italic">Chờ gửi</span>
                                            )}
                                             {po.status === 'Cancelled' && (
                                                <span className="text-xs text-red-400">Đã hủy</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create PO Modal */}
            <CreatePOModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreate}
                suppliers={suppliers}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}

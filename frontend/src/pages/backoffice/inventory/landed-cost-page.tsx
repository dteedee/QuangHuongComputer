import { useCallback, useEffect, useState } from 'react';
import { DollarSign, RefreshCw, Calculator, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AnimatedSection } from '../../../components/motion/animated-section';
import LandedCostForm from '../../../components/inventory/landed-cost-form';
import {
    landedCostApi,
    getGoodsReceivedNotes,
    formatCurrency,
} from '../../../api/inventory';
import type {
    LandedCost,
    CreateLandedCostDto,
    LandedCostAllocationResult,
} from '../../../api/inventory';

interface GrnListItem {
    id: string;
    documentNumber: string;
    documentDate?: string;
    supplierName?: string;
    warehouseName?: string;
}

/**
 * Trang quản lý chi phí nhập:
 * - Chọn GRN → hiển thị danh sách chi phí đã thêm + form thêm mới.
 * - Nút "Phân bổ vào giá vốn" → gọi allocate → bảng kết quả từng item.
 */
export default function LandedCostPage() {
    const [grns, setGrns] = useState<GrnListItem[]>([]);
    const [loadingGrns, setLoadingGrns] = useState(true);
    const [grnId, setGrnId] = useState('');
    const [costs, setCosts] = useState<LandedCost[]>([]);
    const [loadingCosts, setLoadingCosts] = useState(false);
    const [allocation, setAllocation] = useState<LandedCostAllocationResult[] | null>(null);
    const [allocating, setAllocating] = useState(false);

    // Tải danh sách GRN
    useEffect(() => {
        void (async () => {
            setLoadingGrns(true);
            try {
                const data = await getGoodsReceivedNotes(1, 100);
                const list: GrnListItem[] = Array.isArray(data) ? data : (data.items || []);
                setGrns(list);
            } catch {
                toast.error('Lỗi tải danh sách GRN');
            } finally {
                setLoadingGrns(false);
            }
        })();
    }, []);

    const loadCosts = useCallback(async () => {
        if (!grnId) { setCosts([]); return; }
        setLoadingCosts(true);
        try {
            const data = await landedCostApi.getForGrn(grnId);
            setCosts(data);
        } catch {
            setCosts([]);
        } finally {
            setLoadingCosts(false);
        }
    }, [grnId]);

    useEffect(() => { void loadCosts(); setAllocation(null); }, [loadCosts]);

    const handleAddCost = async (dto: CreateLandedCostDto) => {
        if (!grnId) { toast.error('Chọn GRN trước'); return; }
        try {
            await landedCostApi.add(grnId, dto);
            toast.success('Đã thêm chi phí');
            void loadCosts();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi thêm chi phí');
        }
    };

    const handleAllocate = async () => {
        if (!grnId) return;
        setAllocating(true);
        try {
            const res = await landedCostApi.allocate(grnId);
            setAllocation(res);
            toast.success('Đã phân bổ vào giá vốn');
            void loadCosts();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi phân bổ');
        } finally {
            setAllocating(false);
        }
    };

    const totalCost = costs.reduce((s, c) => s + c.amount, 0);
    const anyUnallocated = costs.some(c => !c.isAllocated);

    return (
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-200">
                            <DollarSign size={22} className="text-white" />
                        </div>
                        Chi phí nhập & Phân bổ giá vốn
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">
                        Vận chuyển, thuế NK, phí hải quan... phân bổ vào giá vốn theo giá trị / khối lượng / số lượng.
                    </p>
                </div>
            </div>

            <AnimatedSection className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Chọn phiếu nhập kho (GRN)</label>
                <select
                    value={grnId}
                    onChange={e => setGrnId(e.target.value)}
                    disabled={loadingGrns}
                    className="w-full max-w-2xl px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                    <option value="">{loadingGrns ? 'Đang tải GRN...' : '-- Chọn GRN --'}</option>
                    {grns.map(g => (
                        <option key={g.id} value={g.id}>
                            {g.documentNumber}
                            {g.documentDate ? ` — ${new Date(g.documentDate).toLocaleDateString('vi-VN')}` : ''}
                            {g.supplierName ? ` — ${g.supplierName}` : ''}
                        </option>
                    ))}
                </select>
            </AnimatedSection>

            {grnId && (
                <>
                    <AnimatedSection className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4" delay={0.05}>
                        <h2 className="text-sm font-bold text-gray-900">Thêm chi phí nhập</h2>
                        <LandedCostForm onSubmit={handleAddCost} disabled={allocating} />
                    </AnimatedSection>

                    <AnimatedSection className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" delay={0.1}>
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-gray-900">
                                Danh sách chi phí ({costs.length}) — Tổng: {formatCurrency(totalCost)}
                            </h2>
                            <button
                                onClick={() => void handleAllocate()}
                                disabled={allocating || !anyUnallocated}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                                title={!anyUnallocated ? 'Tất cả chi phí đã được phân bổ' : ''}
                            >
                                {allocating ? <RefreshCw size={14} className="animate-spin" /> : <Calculator size={14} />}
                                Phân bổ vào giá vốn
                            </button>
                        </div>
                        {loadingCosts ? (
                            <div className="p-8 text-center text-gray-500">Đang tải...</div>
                        ) : !costs.length ? (
                            <div className="p-8 text-center text-gray-500 text-sm">Chưa có chi phí nào</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left px-4 py-2 font-semibold text-gray-600">Loại</th>
                                        <th className="text-left px-4 py-2 font-semibold text-gray-600">Mô tả</th>
                                        <th className="text-center px-4 py-2 font-semibold text-gray-600">Phương pháp</th>
                                        <th className="text-right px-4 py-2 font-semibold text-gray-600">Số tiền</th>
                                        <th className="text-center px-4 py-2 font-semibold text-gray-600">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {costs.map(c => (
                                        <tr key={c.id} className="border-b border-gray-100">
                                            <td className="px-4 py-2 text-gray-700">{c.type}</td>
                                            <td className="px-4 py-2 text-gray-700 text-xs">{c.description || '—'}</td>
                                            <td className="px-4 py-2 text-center text-xs">{c.allocationMethod}</td>
                                            <td className="px-4 py-2 text-right font-semibold">{formatCurrency(c.amount)}</td>
                                            <td className="px-4 py-2 text-center">
                                                {c.isAllocated ? (
                                                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Đã phân bổ</span>
                                                ) : (
                                                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Chưa</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </AnimatedSection>

                    {allocation && (
                        <AnimatedSection className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden" delay={0.15}>
                            <div className="px-5 py-3 border-b border-emerald-100 bg-emerald-50">
                                <h2 className="text-sm font-bold text-emerald-800">Kết quả phân bổ</h2>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left px-4 py-2 font-semibold text-gray-600">Sản phẩm</th>
                                        <th className="text-center px-4 py-2 font-semibold text-gray-600">SL</th>
                                        <th className="text-right px-4 py-2 font-semibold text-gray-600">Đơn giá NCC</th>
                                        <th className="text-right px-4 py-2 font-semibold text-gray-600">Chi phí phân bổ</th>
                                        <th className="text-right px-4 py-2 font-semibold text-gray-600">Giá vốn thực</th>
                                        <th className="text-right px-4 py-2 font-semibold text-emerald-700">Bình quân mới</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allocation.map((r, idx) => (
                                        <tr key={idx} className="border-b border-gray-100">
                                            <td className="px-4 py-2">
                                                <div className="font-medium">{r.productName || r.itemId.slice(0, 8)}</div>
                                                {r.sku && <div className="text-xs text-gray-500">{r.sku}</div>}
                                            </td>
                                            <td className="px-4 py-2 text-center">{r.quantity}</td>
                                            <td className="px-4 py-2 text-right">{formatCurrency(r.unitPrice)}</td>
                                            <td className="px-4 py-2 text-right text-orange-700">{formatCurrency(r.costShare)}</td>
                                            <td className="px-4 py-2 text-right font-semibold">{formatCurrency(r.actualUnitCost)}</td>
                                            <td className="px-4 py-2 text-right font-bold text-emerald-700">{formatCurrency(r.newAverageCost)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </AnimatedSection>
                    )}
                </>
            )}

            {!grnId && (
                <AnimatedSection className="border border-dashed border-gray-300 rounded-xl bg-gray-50/50 p-10 text-center">
                    <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">Vui lòng chọn 1 GRN để bắt đầu quản lý chi phí nhập.</p>
                </AnimatedSection>
            )}
        </div>
    );
}

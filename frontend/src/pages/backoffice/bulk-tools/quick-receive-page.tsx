import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '../../../api/inventory';
import { quickReceiveApi, type QuickReceiveLine } from '../../../api/bulk-tools';
import { PageHeader, Card, CardBody, Select, Input, Textarea, Button, Checkbox, ConfirmDialog, Skeleton, notify } from '../../../components/ui';
import { paths } from '../../../routes';
import { QuickReceiveLineEditor } from './quick-receive-line-editor';

/** Quick receive (D10) — `docs/api-contracts/inventory-purchasing.md` §4. One transaction
 *  creates an already-approved PO + confirmed GRN; the confirmation dialog says that plainly
 *  (Implementation Steps #4) so staff don't mistake this for a draft they can edit later. */
export default function QuickReceivePage() {
    const navigate = useNavigate();
    const warehouses = useQuery({ queryKey: ['bulk-tools', 'warehouses-dropdown'], queryFn: () => inventoryApi.warehouses.getDropdown() });
    const supplierList = useQuery({ queryKey: ['bulk-tools', 'supplier-list'], queryFn: () => inventoryApi.getSuppliersDropdown(true) });

    const [newSupplierMode, setNewSupplierMode] = useState(false);
    const [supplierId, setSupplierId] = useState('');
    const [newSupplierName, setNewSupplierName] = useState('');
    const [newSupplierPhone, setNewSupplierPhone] = useState('');
    const [newSupplierAddress, setNewSupplierAddress] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState<QuickReceiveLine[]>([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const totalCost = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
    const canSubmit = lines.length > 0
        && lines.every((l) => l.quantity > 0 && l.unitCost > 0)
        && (newSupplierMode ? newSupplierName.trim().length > 0 : !!supplierId);

    const submit = async () => {
        setSubmitting(true);
        try {
            const res = await quickReceiveApi.submit({
                supplierId: newSupplierMode ? undefined : supplierId,
                newSupplier: newSupplierMode ? { name: newSupplierName, phone: newSupplierPhone || undefined, address: newSupplierAddress || undefined } : undefined,
                warehouseId: warehouseId || undefined,
                notes: notes || undefined,
                items: lines,
            });
            notify.success(`Đã tạo phiếu nhập ${res.receipt.documentNumber}`);
            navigate(paths.backoffice.goodsReceivedNotes());
        } catch (err) {
            const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            notify.error('Lỗi tạo phiếu nhập nhanh', { description: message });
        } finally { setSubmitting(false); setConfirmOpen(false); }
    };

    return (
        <div className="mx-auto max-w-4xl space-y-5 p-4 lg:p-6">
            <PageHeader title="Nhập hàng nhanh" description="Dùng khi mua hàng trực tiếp, không qua đơn đặt hàng trước." />

            <Card>
                <CardBody className="space-y-4">
                    <Checkbox label="Nhà cung cấp mới (tạo ngay trong phiếu này)" checked={newSupplierMode} onChange={(e) => setNewSupplierMode(e.target.checked)} />
                    {newSupplierMode ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Input label="Tên nhà cung cấp" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
                            <Input label="Số điện thoại" value={newSupplierPhone} onChange={(e) => setNewSupplierPhone(e.target.value)} />
                            <Input label="Địa chỉ" value={newSupplierAddress} onChange={(e) => setNewSupplierAddress(e.target.value)} />
                        </div>
                    ) : supplierList.isPending ? <Skeleton className="h-10 w-64" /> : (
                        <label className="block text-sm">
                            <div className="mb-1 text-fg-muted">Nhà cung cấp</div>
                            <Select className="w-64" options={(supplierList.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
                                value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
                        </label>
                    )}

                    {warehouses.isPending ? <Skeleton className="h-10 w-64" /> : (
                        <label className="block text-sm">
                            <div className="mb-1 text-fg-muted">Kho nhận hàng (bỏ trống = kho mặc định)</div>
                            <Select className="w-64" options={[{ value: '', label: '— Kho mặc định —' }, ...(warehouses.data ?? []).map((w) => ({ value: w.id, label: w.name }))]}
                                value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
                        </label>
                    )}

                    <Textarea label="Ghi chú" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </CardBody>
            </Card>

            <Card>
                <CardBody className="space-y-3">
                    <h2 className="text-sm font-semibold">Danh sách hàng nhận</h2>
                    <QuickReceiveLineEditor lines={lines} onChange={setLines} />
                    {lines.length > 0 && <p className="text-right text-sm font-semibold">Tổng giá trị: <span className="num">{totalCost.toLocaleString('vi-VN')}đ</span></p>}
                </CardBody>
            </Card>

            <Button disabled={!canSubmit} onClick={() => setConfirmOpen(true)}>Tạo phiếu nhập nhanh</Button>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Xác nhận nhập hàng nhanh"
                description="Thao tác này sẽ TẠO MỘT ĐƠN ĐẶT HÀNG và MỘT PHIẾU NHẬP KHO đã xác nhận trong một bước — không thể sửa lại như một đơn nháp thông thường."
                confirmLabel="Xác nhận"
                loading={submitting}
                onConfirm={submit}
            />
        </div>
    );
}

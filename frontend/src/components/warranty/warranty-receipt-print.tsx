import { useEffect, useState } from 'react';
import { Printer, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { warrantyApi } from '../../api/warranty';
import type { WarrantyReceiptData } from '../../api/warranty';

interface Props {
    claimId: string;
    onClose?: () => void;
}

/**
 * Phiếu tiếp nhận bảo hành, A4 style. Có @media print.
 * Chỉ dùng thư viện đã có: KHÔNG import `qrcode.react` (chưa cài).
 * Dùng Google Chart API endpoint /chart để tạo QR (fallback: text URL).
 */
export function WarrantyReceiptPrint({ claimId, onClose }: Props) {
    const [data, setData] = useState<WarrantyReceiptData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await warrantyApi.admin.getClaimReceipt(claimId);
                setData(res);
            } catch {
                toast.error('Không tải được phiếu tiếp nhận');
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [claimId]);

    const handlePrint = () => window.print();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <RefreshCw size={20} className="animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500 text-sm">Đang tạo phiếu...</span>
            </div>
        );
    }

    if (!data) {
        return <div className="text-center text-red-600 py-8">Không tải được dữ liệu phiếu.</div>;
    }

    const qrSrc =
        data.qrCodeUrl ||
        `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(data.lookupUrl)}`;

    return (
        <div className="warranty-receipt-container">
            <style>{`
                @media print {
                    @page { size: A4; margin: 12mm; }
                    body * { visibility: hidden; }
                    .warranty-receipt-container, .warranty-receipt-container * { visibility: visible; }
                    .warranty-receipt-container { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}</style>

            {/* Toolbar */}
            <div className="no-print flex justify-end gap-2 mb-4">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700"
                    >
                        Đóng
                    </button>
                )}
                <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-xl text-sm font-semibold hover:opacity-90"
                >
                    <Printer size={16} />
                    In phiếu
                </button>
            </div>

            {/* A4 Receipt */}
            <div className="bg-white p-8 shadow-sm border border-gray-200 rounded-xl max-w-3xl mx-auto text-gray-900 text-sm">
                {/* Header */}
                <header className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-gradient-to-br from-[var(--accent-primary,#e11d48)] to-red-700 rounded-xl flex items-center justify-center">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <div className="text-xl font-bold">QUANG HƯỞNG COMPUTER</div>
                            <div className="text-xs text-gray-600">Hotline: 1900 xxxx · quanghuong.com</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold">PHIẾU TIẾP NHẬN BẢO HÀNH</div>
                        <div className="text-xs text-gray-600 mt-1">Số phiếu: <b>{data.receiptNumber}</b></div>
                        <div className="text-xs text-gray-600">Ngày: {new Date(data.issueDate).toLocaleString('vi-VN')}</div>
                    </div>
                </header>

                {/* Customer + Product */}
                <section className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <div className="text-xs uppercase text-gray-500 font-bold mb-1">Khách hàng</div>
                        <div className="font-semibold">{data.customer.name}</div>
                        <div className="text-xs text-gray-600">SĐT: {data.customer.phone}</div>
                        {data.customer.email && <div className="text-xs text-gray-600">Email: {data.customer.email}</div>}
                    </div>
                    <div>
                        <div className="text-xs uppercase text-gray-500 font-bold mb-1">Sản phẩm</div>
                        <div className="font-semibold">{data.product.name}</div>
                        {data.product.sku && <div className="text-xs text-gray-600">SKU: {data.product.sku}</div>}
                        <div className="text-xs text-gray-600">Serial: <b>{data.product.serialNumber}</b></div>
                        {data.warrantyProvider && (
                            <div className="text-xs text-gray-600">
                                Loại BH:{' '}
                                <span className="font-semibold">
                                    {data.warrantyProvider === 'Manufacturer' ? 'Hãng' : 'Shop'}
                                </span>
                            </div>
                        )}
                    </div>
                </section>

                {/* Mô tả lỗi */}
                <section className="mb-4">
                    <div className="text-xs uppercase text-gray-500 font-bold mb-1">Mô tả lỗi khách khai</div>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 whitespace-pre-wrap text-sm">
                        {data.issueDescription}
                    </div>
                </section>

                {/* Tình trạng máy khi nhận */}
                {data.receivedCondition && (
                    <section className="mb-4">
                        <div className="text-xs uppercase text-gray-500 font-bold mb-1">Tình trạng máy khi nhận</div>
                        <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm">
                            {data.receivedCondition}
                        </div>
                    </section>
                )}

                {/* Phụ kiện kèm */}
                {data.accessoriesReceived && (
                    <section className="mb-4">
                        <div className="text-xs uppercase text-gray-500 font-bold mb-1">Phụ kiện kèm theo</div>
                        <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm">
                            {data.accessoriesReceived}
                        </div>
                    </section>
                )}

                {/* Ảnh */}
                {data.attachmentUrls?.length > 0 && (
                    <section className="mb-4">
                        <div className="text-xs uppercase text-gray-500 font-bold mb-2">Hình ảnh máy khi nhận</div>
                        <div className="flex flex-wrap gap-2">
                            {data.attachmentUrls.map((url, i) => (
                                <img
                                    key={i}
                                    src={url}
                                    alt={`attach-${i}`}
                                    className="w-24 h-24 object-cover rounded border border-gray-200"
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* SLA */}
                {data.slaDeadline && (
                    <section className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                        <b>Cam kết hoàn tất trước:</b>{' '}
                        {new Date(data.slaDeadline).toLocaleString('vi-VN')}
                    </section>
                )}

                {/* Footer: QR + chữ ký */}
                <footer className="grid grid-cols-3 gap-4 border-t-2 border-gray-800 pt-4 mt-4">
                    <div className="text-center">
                        <img src={qrSrc} alt="QR" className="mx-auto w-32 h-32 border border-gray-200 rounded" />
                        <div className="text-[10px] text-gray-500 mt-1 break-all">{data.lookupUrl}</div>
                        <div className="text-xs text-gray-600 mt-1">Quét để tra cứu</div>
                    </div>
                    <div className="text-center border-l border-r border-dashed border-gray-300 px-2">
                        <div className="text-xs font-bold uppercase mb-8">Khách hàng</div>
                        <div className="text-xs text-gray-500">(Ký, ghi rõ họ tên)</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs font-bold uppercase mb-8">Nhân viên tiếp nhận</div>
                        <div className="text-xs text-gray-500">(Ký, ghi rõ họ tên)</div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default WarrantyReceiptPrint;

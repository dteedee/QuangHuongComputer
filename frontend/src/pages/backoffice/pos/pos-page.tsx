/**
 * QUẦY THU NGÂN (POS) — W3-5.
 *
 * Luật của màn hình này: client KHÔNG BAO GIỜ tính tiền. Tạm tính đến từ `/sales/pos/quote`,
 * đơn chốt qua `/sales/pos/orders`, và phiếu in dùng đúng con số đơn trả về
 * (`docs/api-contracts/sales-pos-returns-loyalty.md` §1). Không dùng `CartContext` của storefront
 * (giỏ đó cộng phí ship 30.000đ và tự tính VAT ⇒ hoá đơn lệch với đơn đã lưu).
 */
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, FileText, Printer, RotateCcw } from 'lucide-react';
import { Badge, Button, Card, ErrorState, PageHeader, Skeleton, notify } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import PosReceiptTemplate from '../../../components/pos-receipt-template';
import { printReceipt } from './pos-receipt-print';
import PosProductGrid from './pos-product-grid';
import PosCartPanel from './pos-cart-panel';
import PosTenderModal from './pos-tender-modal';
import PosCustomerPicker from './pos-customer-picker';
import PosHeldOrders from './pos-held-orders';
import PosSerialDialog from './pos-serial-dialog';
import PosInvoiceDialog from './pos-invoice-dialog';
import type { PosInvoiceBuyer } from './pos-invoice-buyer';
import { usePosActions } from './use-pos-actions';
import { usePosSession, type PosCartLine } from './use-pos-session';
import { fetchSerialTrackedCategoryIds, lookupByCode } from './pos-catalog-lookup';
import type { ListingProduct } from '../../../api/catalog/public-listing';

export default function PosPage() {
    const session = usePosSession();
    const { user } = useAuth();
    const receiptRef = useRef<HTMLDivElement>(null);

    const [customerOpen, setCustomerOpen] = useState(false);
    const [heldOpen, setHeldOpen] = useState(false);
    const [tenderOpen, setTenderOpen] = useState(false);
    const [invoiceOpen, setInvoiceOpen] = useState(false);
    const [serialFor, setSerialFor] = useState<string | null>(null);
    const [ambiguous, setAmbiguous] = useState<ListingProduct[] | null>(null);
    const [buyer, setBuyer] = useState<PosInvoiceBuyer | null>(null);

    const serialCatsQuery = useQuery({
        queryKey: ['pos', 'serial-categories'],
        queryFn: fetchSerialTrackedCategoryIds,
        staleTime: 10 * 60 * 1000,
    });

    const { hold, resume, checkout, submitting, receipt, lastSale } = usePosActions({
        session,
        cashierName: user?.fullName,
        buyer,
        serialCategoryIds: serialCatsQuery.data,
        onSold: () => { setTenderOpen(false); setBuyer(null); },
    });

    const toCartLine = (p: ListingProduct): PosCartLine => ({
        productId: p.id,
        quantity: 1,
        variantId: null,
        serials: [],
        productName: p.name,
        sku: p.sku,
        imageUrl: p.thumbnailUrl ?? p.imageUrl ?? null,
        listPrice: p.price,
        serialTracked: serialCatsQuery.data?.has(p.categoryId) ?? false,
    });

    const handleScan = async (code: string) => {
        try {
            const result = await lookupByCode(code);
            if (result.matches.length === 0) {
                notify.warning('Không tìm thấy hàng', { description: `Mã "${code}" chưa có trong danh mục.` });
                return;
            }
            if (result.matches.length === 1) {
                session.addLine(toCartLine(result.matches[0]));
                setAmbiguous(null);
                return;
            }
            setAmbiguous(result.matches);
        } catch (err) {
            notify.error('Không tra được mã', {
                description: (err as { normalized?: { message?: string } })?.normalized?.message,
            });
        }
    };

    const serialLine = session.lines.find((l) => l.productId === serialFor);

    return (
        <div className="space-y-4">
            <PageHeader
                title="Bán hàng tại quầy"
                description={session.store ? `Kho bán: ${session.store.name}` : 'Đang xác định kho bán…'}
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setHeldOpen(true)}><Clock size={16} /> Đơn giữ</Button>
                        <Button variant="outline" onClick={() => setInvoiceOpen(true)}>
                            <FileText size={16} /> {buyer ? 'Sửa hoá đơn công ty' : 'Khách lấy hoá đơn công ty'}
                        </Button>
                        <Button variant="ghost" onClick={session.reset}><RotateCcw size={16} /> Đơn mới</Button>
                    </div>
                }
            />

            {session.storeQuery.isError && (
                <ErrorState
                    title="Không xác định được kho bán của quầy"
                    error={session.storeQuery.error}
                    onRetry={() => session.storeQuery.refetch()}
                />
            )}
            {session.storeQuery.isPending && <Skeleton className="h-10 w-64" />}
            {buyer && <Badge variant="info">Xuất hoá đơn công ty: {buyer.companyName} · MST {buyer.taxCode}</Badge>}

            {lastSale && receipt && (
                <Card padded className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium">
                            Đơn {lastSale.orderNumber} · {lastSale.paymentStatus} · {lastSale.fulfillmentStatus}
                        </p>
                        <p className="num text-xs text-fg-muted">
                            Thu {lastSale.collected.toLocaleString('vi-VN')}đ · Thối {lastSale.changeDue.toLocaleString('vi-VN')}đ
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => printReceipt(receiptRef.current)}><Printer size={16} /> In phiếu</Button>
                </Card>
            )}

            <div className="grid gap-4 lg:h-[calc(100vh-13rem)] lg:grid-cols-[1fr_380px]">
                <Card padded className="min-h-[60vh] overflow-y-auto lg:min-h-0">
                    <PosProductGrid
                        onPick={(p) => session.addLine(toCartLine(p))}
                        onScan={handleScan}
                        ambiguous={ambiguous}
                        onClearAmbiguous={() => setAmbiguous(null)}
                    />
                </Card>
                <PosCartPanel
                    session={session}
                    onPickCustomer={() => setCustomerOpen(true)}
                    onPickSerials={setSerialFor}
                    onHold={hold}
                    onCheckout={() => setTenderOpen(true)}
                    holdDisabled={!session.store}
                />
            </div>

            <PosCustomerPicker
                open={customerOpen}
                onOpenChange={setCustomerOpen}
                onPick={session.setCustomer}
                onWalkIn={(name, phone) => { session.setCustomer(null); session.setWalkInName(name); session.setWalkInPhone(phone); }}
            />
            <PosHeldOrders open={heldOpen} onOpenChange={setHeldOpen} storeId={session.store?.id} onResume={resume} />
            <PosTenderModal
                open={tenderOpen}
                onOpenChange={setTenderOpen}
                total={session.quote?.total ?? 0}
                submitting={submitting}
                onConfirm={checkout}
            />
            <PosSerialDialog
                open={!!serialFor}
                onOpenChange={(o) => !o && setSerialFor(null)}
                productId={serialLine?.productId}
                productName={serialLine?.productName}
                quantity={serialLine?.quantity ?? 0}
                warehouseId={session.store?.id}
                selected={serialLine?.serials ?? []}
                onChange={(serials) => serialLine && session.setSerials(serialLine.productId, serials)}
            />
            <PosInvoiceDialog open={invoiceOpen} onOpenChange={setInvoiceOpen} value={buyer} onSubmit={setBuyer} />

            {/* Phiếu luôn nằm trong DOM (ẩn khỏi mắt và khỏi trình đọc màn hình) để `printReceipt`
                chép được đúng khối này sang iframe in. */}
            {receipt && (
                <div className="sr-only" aria-hidden>
                    <PosReceiptTemplate ref={receiptRef} data={receipt} />
                </div>
            )}
        </div>
    );
}

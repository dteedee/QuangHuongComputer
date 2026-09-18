/**
 * Order detail drawer (phase spec step 2): customer, items with per-line VAT
 * + allocated discount (D01, matches what the invoice prints), payments,
 * shipment, timeline, internal notes, invoice info (D07), print link.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Package, FileText, MapPin, Printer, StickyNote, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../../utils/format';
import { QueryBoundary } from '../../../components/ui/query-boundary';
import { useOrderDetailQuery, useOrderTransitionsQuery, useOrderActions } from './use-order-actions';
import { getOrderStatusInfo, getPaymentStatusLabel, getChannelLabel } from './order-status-badges';
import { OrderActionBar } from './order-action-bar';
import { OrderTimeline } from './order-timeline';
import { OrderInvoicePanel } from './order-invoice-panel';

const formatDateTime = (iso?: string) =>
    iso ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }) : '—';

export const OrderDetailDrawer = ({ orderId, onClose }: { orderId: string | null; onClose: () => void }) => {
    const [noteDraft, setNoteDraft] = useState('');
    const detailQuery = useOrderDetailQuery(orderId);
    const transitionsQuery = useOrderTransitionsQuery(orderId);
    const { addNoteMutation } = useOrderActions(orderId);

    return (
        <AnimatePresence>
            {orderId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-md overflow-hidden max-h-[92vh] overflow-y-auto">
                        <QueryBoundary
                            query={detailQuery}
                            skeleton={<div className="p-10 space-y-4"><div className="h-8 w-1/3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /><div className="h-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></div>}
                            errorTitle="Không tải được đơn hàng"
                        >
                            {(order) => {
                                const status = getOrderStatusInfo(order.status);
                                return (
                                    <>
                                        <div className="flex items-center justify-between p-8 border-b border-gray-50 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status.bg} ${status.color}`}>
                                                    <FileText size={24} />
                                                </div>
                                                <div>
                                                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tighter">
                                                        Đơn hàng <span className="text-accent">#{order.orderNumber}</span>
                                                    </h2>
                                                    <p className="text-xs font-semibold text-gray-400 uppercase mt-1">
                                                        {status.label} · {getChannelLabel(order.channel)} · {formatDateTime(order.dates.orderDate)}
                                                    </p>
                                                </div>
                                            </div>
                                            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:bg-blue-50 hover:text-accent transition-all">
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <div className="p-8 space-y-6">
                                            <QueryBoundary query={transitionsQuery} skeleton={<div className="h-10 bg-gray-50 dark:bg-gray-800 rounded-xl animate-pulse" />}>
                                                {(transitions) => <OrderActionBar order={order} transitions={transitions} />}
                                            </QueryBoundary>

                                            {/* Khách hàng */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Khách hàng</p>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{order.customer.name || 'Khách vãng lai'}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{order.customer.phone || '—'}</p>
                                                </div>
                                                <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Thanh toán</p>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{getPaymentStatusLabel(order.paymentStatus)}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Đã thu {formatCurrency(order.money.collected)} / còn {formatCurrency(order.money.amountDue)}</p>
                                                </div>
                                            </div>

                                            {/* Sản phẩm + VAT/giảm giá phân bổ theo dòng (D01) */}
                                            <div className="space-y-3">
                                                <h3 className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 uppercase flex items-center gap-2">
                                                    <Package size={14} className="text-accent" /> Sản phẩm ({order.items.length})
                                                </h3>
                                                {order.items.map((item) => (
                                                    <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.productName}{item.isGift ? ' · Hàng tặng' : ''}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                x{item.quantity} @ {formatCurrency(item.unitPrice)}
                                                                {item.vatRate != null && ` · VAT ${(item.vatRate * 100).toFixed(0)}% (${formatCurrency(item.vatAmount ?? 0)})`}
                                                                {!!item.discountAmount && ` · Giảm giá phân bổ ${formatCurrency(item.discountAmount)}`}
                                                            </p>
                                                        </div>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(item.lineTotal)}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Tổng tiền */}
                                            <div className="space-y-2 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm">
                                                <div className="flex justify-between"><span className="text-gray-500">Tạm tính</span><span className="font-bold">{formatCurrency(order.money.subtotalAmount)}</span></div>
                                                {order.money.discountAmount > 0 && <div className="flex justify-between"><span className="text-gray-500">Giảm giá</span><span className="font-bold text-emerald-600">-{formatCurrency(order.money.discountAmount)}</span></div>}
                                                <div className="flex justify-between"><span className="text-gray-500">Phí vận chuyển</span><span className="font-bold">{formatCurrency(order.money.shippingAmount)}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Trong đó VAT (đã gồm trong tổng)</span><span className="font-bold">{formatCurrency(order.money.taxAmount)}</span></div>
                                                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between"><span className="font-bold text-gray-900 dark:text-gray-100">Tổng cộng</span><span className="text-lg font-semibold text-accent">{formatCurrency(order.money.totalAmount)}</span></div>
                                            </div>

                                            {/* Vận chuyển */}
                                            <div className="space-y-2">
                                                <h3 className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 uppercase flex items-center gap-2"><MapPin size={14} className="text-accent" /> Giao hàng</h3>
                                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm text-gray-700 dark:text-gray-300">
                                                    <p>{order.shipping.shippingAddress || (order.shipping.isPickup ? `Nhận tại ${order.shipping.pickupStoreName || 'cửa hàng'}` : 'Chưa có địa chỉ')}</p>
                                                    {order.shipping.deliveryTrackingNumber && <p className="text-xs text-gray-500 mt-1">{order.shipping.deliveryCarrier} · {order.shipping.deliveryTrackingNumber}</p>}
                                                </div>
                                            </div>

                                            {/* Thanh toán đã ghi nhận */}
                                            {order.payments.length > 0 && (
                                                <div className="space-y-2">
                                                    <h3 className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 uppercase">Lịch sử thu tiền</h3>
                                                    {order.payments.map((p) => (
                                                        <div key={p.id} className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm">
                                                            <span>{p.method} · {p.reference || '—'}{p.isReversed ? ' (đã đảo)' : ''}</span>
                                                            <span className="font-semibold">{formatCurrency(p.amount)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <OrderInvoicePanel orderNumber={order.orderNumber} />

                                            {/* Ghi chú nội bộ */}
                                            <div className="space-y-2">
                                                <h3 className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 uppercase flex items-center gap-2"><StickyNote size={14} className="text-accent" /> Ghi chú nội bộ</h3>
                                                {order.internalNotes && <p className="text-xs text-gray-500 italic">{order.internalNotes}</p>}
                                                <div className="flex gap-2">
                                                    <input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Thêm ghi chú…"
                                                        className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm outline-none" />
                                                    <button
                                                        onClick={() => { if (noteDraft.trim()) { addNoteMutation.mutate(noteDraft.trim()); setNoteDraft(''); } }}
                                                        disabled={addNoteMutation.isPending || !noteDraft.trim()}
                                                        className="px-4 py-2.5 bg-accent text-white text-xs font-semibold uppercase rounded-xl disabled:opacity-50"
                                                    >Lưu</button>
                                                </div>
                                            </div>

                                            {/* Lịch sử */}
                                            <div className="space-y-2">
                                                <h3 className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 uppercase">Lịch sử đơn hàng</h3>
                                                <OrderTimeline history={order.history} />
                                            </div>

                                            {/* D10: A5 delivery note layout được W3-16 xây; nút mở đặt sẵn ở đây. */}
                                            <Link to={`/backoffice/print/delivery-note/${order.id}`}
                                                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-500 text-xs font-semibold uppercase rounded-xl hover:bg-gray-100">
                                                <Printer size={14} /> In phiếu giao hàng
                                            </Link>
                                        </div>
                                    </>
                                );
                            }}
                        </QueryBoundary>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

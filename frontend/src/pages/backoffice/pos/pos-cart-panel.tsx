/**
 * Giỏ của quầy. MỌI con số tiền ở đây là số server trả về từ `/sales/pos/quote` —
 * màn hình không cộng trừ gì, kể cả VAT (D01: giá đã gồm VAT).
 */
import { AlertTriangle, Minus, Plus, ScanBarcode, Trash2, UserPlus } from 'lucide-react';
import {
    Badge, Button, Card, EmptyState, ErrorState, IconButton, Input, Money, Skeleton,
} from '../../../components/ui';
import type { PosSession } from './use-pos-session';

interface PosCartPanelProps {
    session: PosSession;
    onPickCustomer: () => void;
    onPickSerials: (productId: string) => void;
    onHold: () => void;
    onCheckout: () => void;
    holdDisabled?: boolean;
}

export default function PosCartPanel({
    session, onPickCustomer, onPickSerials, onHold, onCheckout, holdDisabled,
}: PosCartPanelProps) {
    const { lines, quote, quoteQuery, serialGaps } = session;
    const empty = lines.length === 0;
    /* Tạm tính đang tải lại (đổi số lượng / giảm giá) thì con số trên màn hình là số CŨ
       (`placeholderData` giữ lại kết quả trước). Không cho bấm "Thu tiền" lúc đó: thu ngân sẽ
       đọc nhầm tổng cũ, thu thiếu, và server ghi thành đơn đặt cọc. */
    const quoteStale = !empty && (quoteQuery.isFetching || quoteQuery.isPlaceholderData);

    return (
        <Card className="flex h-full flex-col overflow-hidden">
            {/* Khách hàng */}
            <div className="border-b border-line p-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide text-fg-subtle">Khách hàng</p>
                        <p className="truncate text-sm font-medium">
                            {session.customer?.fullName ?? (session.walkInName || 'Khách vãng lai')}
                        </p>
                        {(session.customer?.phone || session.walkInPhone) && (
                            <p className="num text-xs text-fg-muted">{session.customer?.phone ?? session.walkInPhone}</p>
                        )}
                    </div>
                    <Button size="sm" variant="outline" onClick={onPickCustomer}>
                        <UserPlus size={16} /> Chọn khách
                    </Button>
                </div>
            </div>

            {/* Dòng hàng */}
            <div className="flex-1 overflow-y-auto p-4">
                {empty ? (
                    <EmptyState
                        icon={ScanBarcode}
                        title="Chưa có hàng trong giỏ"
                        description="Quét mã vạch hoặc bấm vào sản phẩm bên trái để thêm vào đơn."
                    />
                ) : (
                    <ul className="space-y-3">
                        {lines.map((line) => {
                            const quoted = quote?.lines.find((q) => q.productId === line.productId);
                            const missingSerials = line.serialTracked && (line.serials?.length ?? 0) !== line.quantity;
                            return (
                                <li key={line.productId} className="rounded-lg border border-line p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="line-clamp-2 text-sm font-medium leading-snug">{line.productName}</p>
                                            <p className="num text-xs text-fg-subtle">{line.sku}</p>
                                        </div>
                                        <IconButton
                                            aria-label={`Bỏ ${line.productName} khỏi đơn`}
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => session.removeLine(line.productId)}
                                        >
                                            <Trash2 size={16} />
                                        </IconButton>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1">
                                            <IconButton
                                                aria-label="Giảm số lượng"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => session.setQuantity(line.productId, line.quantity - 1)}
                                            >
                                                <Minus size={14} />
                                            </IconButton>
                                            <span className="num w-8 text-center text-sm">{line.quantity}</span>
                                            <IconButton
                                                aria-label="Tăng số lượng"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => session.setQuantity(line.productId, line.quantity + 1)}
                                            >
                                                <Plus size={14} />
                                            </IconButton>
                                        </div>
                                        <Money value={quoted?.payable ?? line.listPrice * line.quantity} className="font-semibold" />
                                    </div>
                                    {line.serialTracked && (
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <Badge variant={missingSerials ? 'warning' : 'success'}>
                                                {missingSerials
                                                    ? `Thiếu serial (${line.serials?.length ?? 0}/${line.quantity})`
                                                    : `Đã chọn ${line.quantity} serial`}
                                            </Badge>
                                            <Button size="sm" variant="ghost" onClick={() => onPickSerials(line.productId)}>
                                                Chọn serial
                                            </Button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Giảm giá + tổng tiền */}
            <div className="border-t border-line p-4">
                <Input
                    label="Giảm giá tay (đ)"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={session.manualDiscount || ''}
                    onChange={(e) => session.setManualDiscount(Number(e.target.value) || 0)}
                    hint="Vượt trần server tự cắt và báo lại."
                />
                {session.manualDiscount > 0 && (
                    <Input
                        label="Lý do giảm giá"
                        className="mt-2"
                        value={session.discountReason}
                        onChange={(e) => session.setDiscountReason(e.target.value)}
                        placeholder="VD: khách quen"
                    />
                )}

                {quoteQuery.isError && !empty && (
                    <ErrorState inline error={quoteQuery.error} onRetry={() => quoteQuery.refetch()} className="mt-3" />
                )}

                {!empty && quoteQuery.isPending && !quote && (
                    <div className="mt-3 space-y-2"><Skeleton className="h-5 w-full" /><Skeleton className="h-7 w-2/3" /></div>
                )}

                {quote && !empty && (
                    <dl className={`mt-3 space-y-1 text-sm ${quoteStale ? 'opacity-50' : ''}`}>
                        <div className="flex justify-between"><dt className="text-fg-muted">Tạm tính</dt><dd><Money value={quote.subtotal} /></dd></div>
                        {quote.discount > 0 && (
                            <div className="flex justify-between"><dt className="text-fg-muted">Giảm giá</dt><dd>−<Money value={quote.discount} /></dd></div>
                        )}
                        <div className="flex justify-between text-xs text-fg-subtle">
                            <dt>Trong đó VAT (đã gồm)</dt><dd><Money value={quote.taxAmount} /></dd>
                        </div>
                        <div className="flex items-baseline justify-between border-t border-line pt-2 text-base font-semibold">
                            <dt>Tổng cộng</dt><dd><Money value={quote.total} /></dd>
                        </div>
                    </dl>
                )}

                {quote?.warnings?.map((w) => (
                    <p key={w} className="mt-2 flex items-start gap-1 text-xs text-warning">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {w}
                    </p>
                ))}

                <div className="mt-4 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={onHold} disabled={empty || holdDisabled}>
                        Giữ đơn
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={onCheckout}
                        disabled={empty || !quote || quoteQuery.isPending || quoteStale || serialGaps.length > 0}
                    >
                        Thu tiền
                    </Button>
                </div>
                {quoteStale && (
                    <p className="mt-2 text-xs text-fg-muted">Đang tính lại tổng tiền…</p>
                )}
                {serialGaps.length > 0 && (
                    <p className="mt-2 text-xs text-warning">Chọn đủ serial trước khi thu tiền.</p>
                )}
            </div>
        </Card>
    );
}

/**
 * Chi tiết hoá đơn (W3-13) — `GET /accounting/invoices/{id}` (contract §1).
 * Shows the line-level VAT split D01 requires (`net`/`vat` per line, discount on
 * the line, promotion lines at 0đ), the payments applied to the invoice, the
 * credit notes raised against it, and the e-invoice state of the document.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import {
    Card, CardBody, CardHeader, CardTitle, Money, PageHeader, QueryBoundary,
    Skeleton, StatusBadge, Table, TBody, Td, Th, THead, Tr,
} from '../../../components/ui';
import {
    creditNotesApi, creditNoteReasonLabel, formatVnDate, formatVnDateTime,
    invoiceStatusLabel, invoiceTypeLabel, invoicesApi,
} from '../../../api/accounting';
import { InvoiceDetailActions } from './invoice-detail-actions';

export const InvoiceDetailPage = () => {
    const { id = '' } = useParams<{ id: string }>();
    const [printOpen, setPrintOpen] = useState(false);

    const invoiceQuery = useQuery({
        queryKey: ['accounting', 'invoices', 'detail', id],
        queryFn: () => invoicesApi.get(id),
        enabled: Boolean(id),
    });

    const creditNotesQuery = useQuery({
        queryKey: ['accounting', 'credit-notes', { originalInvoiceId: id }],
        queryFn: () => creditNotesApi.list({ originalInvoiceId: id, pageSize: 50 }),
        enabled: Boolean(id),
    });

    return (
        <div className="space-y-5">
            <QueryBoundary
                query={invoiceQuery}
                errorTitle="Không tải được hoá đơn"
                skeleton={<div className="space-y-3"><Skeleton className="h-10 w-72" /><Skeleton className="h-64 w-full" /></div>}
            >
                {(invoice) => (
                    <>
                        <PageHeader
                            title={<span className="num">{invoice.invoiceNumber}</span>}
                            description={
                                <span className="flex flex-wrap items-center gap-2">
                                    <StatusBadge tone={invoiceStatusLabel[invoice.status]?.tone ?? 'neutral'}>
                                        {invoiceStatusLabel[invoice.status]?.label ?? invoice.status}
                                    </StatusBadge>
                                    <span>{invoice.type ? invoiceTypeLabel[invoice.type] : ''}</span>
                                    <span>· Lập {formatVnDate(invoice.issueDate)}</span>
                                    <span>· Hạn {formatVnDate(invoice.dueDate)}</span>
                                    {invoice.orderNumber && <span>· Đơn {invoice.orderNumber}</span>}
                                </span>
                            }
                            breadcrumbs={[
                                { label: 'Tài chính', to: '/backoffice/accounting' },
                                { label: 'Hoá đơn', to: '/backoffice/accounting/invoices' },
                                { label: invoice.invoiceNumber },
                            ]}
                            actions={
                                <InvoiceDetailActions
                                    invoice={invoice}
                                    printOpen={printOpen}
                                    onPrintOpenChange={setPrintOpen}
                                    onChanged={() => { invoiceQuery.refetch(); creditNotesQuery.refetch(); }}
                                />
                            }
                        />

                        <div className="grid gap-4 lg:grid-cols-3">
                            <Card className="lg:col-span-2">
                                <CardHeader><CardTitle>Dòng hàng</CardTitle></CardHeader>
                                <CardBody className="overflow-x-auto">
                                    {/* Hoá đơn cũ (trước khi W2-14 tách thuế theo dòng) có net/vat/gross = 0 ở
                                        từng dòng dù tổng hoá đơn vẫn đúng — nói thẳng thay vì để người dùng
                                        tưởng dòng hàng bằng 0. Xem integration request W3-13 #9. */}
                                    {invoice.lines.length > 0
                                        && invoice.lines.every((l) => l.grossAmount === 0)
                                        && invoice.totalAmount > 0 && (
                                        <p className="mb-3 rounded-md bg-warning-subtle px-3 py-2 text-sm text-warning">
                                            Hoá đơn này chưa có số liệu tách thuế theo từng dòng (dữ liệu cũ).
                                            Số liệu đúng là phần Tổng hợp bên phải.
                                        </p>
                                    )}
                                    <Table>
                                        <caption className="sr-only">Chi tiết dòng hàng của hoá đơn {invoice.invoiceNumber}</caption>
                                        <THead>
                                            <Tr>
                                                <Th>Diễn giải</Th>
                                                <Th align="right">SL</Th>
                                                <Th align="right">Đơn giá</Th>
                                                <Th align="right">Giảm giá</Th>
                                                <Th align="right">Thuế suất</Th>
                                                <Th align="right">Tiền hàng</Th>
                                                <Th align="right">Thuế GTGT</Th>
                                                <Th align="right">Thành tiền</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {invoice.lines.map((line) => (
                                                <Tr key={line.id}>
                                                    <Td>
                                                        <span className="text-fg">{line.description}</span>
                                                        {line.isPromotion && (
                                                            <span className="ml-2 align-middle"><StatusBadge tone="violet">Khuyến mại</StatusBadge></span>
                                                        )}
                                                        {line.sku && <span className="num ml-2 text-xs text-fg-subtle">{line.sku}</span>}
                                                        {line.note && <p className="mt-0.5 text-xs text-fg-subtle">{line.note}</p>}
                                                    </Td>
                                                    <Td align="right"><span className="num">{line.quantity}</span></Td>
                                                    <Td align="right"><Money value={line.unitPrice} /></Td>
                                                    <Td align="right"><Money value={line.lineDiscount} /></Td>
                                                    <Td align="right"><span className="num">{line.vatRate}%</span></Td>
                                                    <Td align="right"><Money value={line.netAmount} /></Td>
                                                    <Td align="right"><Money value={line.vatAmount} /></Td>
                                                    <Td align="right"><Money value={line.grossAmount} /></Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                </CardBody>
                            </Card>

                            <div className="space-y-4">
                                <Card>
                                    <CardHeader><CardTitle>Tổng hợp</CardTitle></CardHeader>
                                    <CardBody className="space-y-2 text-sm">
                                        <Row label="Tiền hàng chưa thuế"><Money value={invoice.subTotal ?? null} /></Row>
                                        <Row label="Thuế GTGT"><Money value={invoice.vatAmount ?? null} /></Row>
                                        <Row label="Tổng thanh toán"><Money value={invoice.totalAmount} /></Row>
                                        <Row label="Đã thu / đã trả"><Money value={invoice.paidAmount} /></Row>
                                        <Row label="Còn lại"><Money value={invoice.outstandingAmount} /></Row>
                                        {invoice.notes && <p className="pt-2 text-fg-muted">{invoice.notes}</p>}
                                    </CardBody>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle>Người mua</CardTitle></CardHeader>
                                    <CardBody className="space-y-1 text-sm text-fg-muted">
                                        <p className="font-medium text-fg">
                                            {invoice.buyer?.legalName || invoice.buyer?.fullName || 'Bán cho người tiêu dùng'}
                                        </p>
                                        {invoice.buyer?.taxCode && <p className="num">MST: {invoice.buyer.taxCode}</p>}
                                        {invoice.buyer?.address && <p>{invoice.buyer.address}</p>}
                                        {invoice.buyer?.email && <p>{invoice.buyer.email}</p>}
                                        {invoice.buyer?.phone && <p className="num">{invoice.buyer.phone}</p>}
                                    </CardBody>
                                </Card>
                            </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                            <Card>
                                <CardHeader><CardTitle>Thanh toán đã ghi nhận</CardTitle></CardHeader>
                                <CardBody>
                                    {invoice.paymentApplications.length === 0 ? (
                                        <p className="text-sm text-fg-muted">Chưa có khoản thanh toán nào được gán vào hoá đơn này.</p>
                                    ) : (
                                        <ul className="divide-y divide-line text-sm">
                                            {invoice.paymentApplications.map((p) => (
                                                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                                                    <span className="text-fg-muted">{formatVnDateTime(p.appliedAt)}{p.notes ? ` · ${p.notes}` : ''}</span>
                                                    <Money value={p.amount} />
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardBody>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Giấy báo có</CardTitle></CardHeader>
                                <CardBody>
                                    <QueryBoundary
                                        query={creditNotesQuery}
                                        inline
                                        errorTitle="Không tải được giấy báo có"
                                        isEmpty={(d) => d.items.length === 0}
                                        empty={{ icon: FileText, title: 'Chưa có giấy báo có', description: 'Ghi giảm được lập khi huỷ đơn đã thu tiền hoặc khi khách trả hàng.' }}
                                    >
                                        {(data) => (
                                            <ul className="divide-y divide-line text-sm">
                                                {data.items.map((cn) => (
                                                    <li key={cn.id} className="flex items-center justify-between gap-3 py-2">
                                                        <span>
                                                            <span className="num font-medium text-fg">{cn.creditNoteNumber}</span>
                                                            <span className="block text-xs text-fg-subtle">
                                                                {creditNoteReasonLabel[cn.reasonCode] ?? cn.reasonCode} · {formatVnDate(cn.issueDate)}
                                                            </span>
                                                        </span>
                                                        <Money value={cn.amount} />
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </QueryBoundary>
                                </CardBody>
                            </Card>
                        </div>
                    </>
                )}
            </QueryBoundary>
        </div>
    );
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3">
        <span className="text-fg-muted">{label}</span>
        <span className="font-medium text-fg">{children}</span>
    </div>
);

export default InvoiceDetailPage;

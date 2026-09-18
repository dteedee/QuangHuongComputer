/**
 * Sổ quỹ tiền mặt (W3-13) — contract §5. Chưa từng có màn hình nào cho nhóm
 * route này trước đây.
 *
 * Số dư luỹ kế do server tính khi đọc theo thứ tự `(voucherDate, createdAt)` —
 * giao diện chỉ hiển thị `runningBalance` trả về, không tự cộng dồn.
 * Phiếu thu đặt cọc của khách xuất hiện ở đây dù chưa có hoá đơn (D01).
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import {
    Button, Card, CardBody, CardHeader, CardTitle, Money, PageHeader, QueryBoundary,
    Select, Skeleton, StatCard, StatusBadge, Table, TBody, Td, Th, THead, Tr, Input, notify,
} from '../../../components/ui';
import { CrudFormDialog, MoneyField, SelectField, TextField } from '../../../components/form';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import {
    cashBookApi, cashVoucherKindLabel, cashVoucherSourceLabel, formatCurrency,
    formatVnDate, formatVnDateTime, toVnDateInput,
} from '../../../api/accounting';
import { cashVoucherSchema, type CashVoucherFormData } from './accounting-schemas';

/** Ngày đầu tháng hiện tại theo giờ Việt Nam. */
function startOfVnMonth(): string {
    const now = toVnDateInput(new Date());
    return `${now.slice(0, 8)}01`;
}

export const CashBookPage = () => {
    const queryClient = useQueryClient();
    const [fundCode, setFundCode] = useState('');
    const [from, setFrom] = useState(startOfVnMonth());
    const [to, setTo] = useState(toVnDateInput(new Date()));
    const [voucherOpen, setVoucherOpen] = useState(false);

    const fundsQuery = useQuery({ queryKey: ['accounting', 'cash-funds'], queryFn: cashBookApi.funds });

    const funds = fundsQuery.data ?? [];
    const activeFund = fundCode || funds[0]?.fundCode || '';

    const bookQuery = useQuery({
        queryKey: ['accounting', 'cash-book', activeFund, from, to],
        queryFn: () => cashBookApi.book({ fundCode: activeFund, from, to }),
        enabled: Boolean(activeFund),
    });

    return (
        <div className="space-y-5">
            <PageHeader
                title="Sổ quỹ tiền mặt"
                description="Phiếu thu, phiếu chi và số dư luỹ kế của từng quỹ."
                breadcrumbs={[{ label: 'Tài chính', to: '/backoffice/accounting' }, { label: 'Sổ quỹ' }]}
                actions={
                    <Can permission={PERMISSIONS.ACCOUNTING_CREATE_INVOICE}>
                        <Button onClick={() => setVoucherOpen(true)}>
                            Lập phiếu thu / chi
                        </Button>
                    </Can>
                }
            />

            <Card className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <Select
                        label="Quỹ" className="sm:w-56"
                        value={activeFund}
                        onChange={(e) => setFundCode(e.target.value)}
                        options={funds.map((f) => ({ value: f.fundCode, label: f.fundCode }))}
                        placeholder={fundsQuery.isPending ? 'Đang tải…' : 'Chưa có quỹ nào'}
                    />
                    <Input label="Từ ngày" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="sm:w-48" />
                    <Input label="Đến ngày" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="sm:w-48" />
                </div>
                {fundsQuery.isError && (
                    <p className="mt-2 text-sm text-danger">
                        Không tải được danh sách quỹ. Hãy thử lại — số liệu bên dưới có thể chưa đầy đủ.
                    </p>
                )}
            </Card>

            {!activeFund && !fundsQuery.isPending ? (
                <Card><CardBody>
                    <p className="text-sm text-fg-muted">
                        Chưa có quỹ tiền mặt nào. Quỹ được tạo tự động khi có phiếu thu/chi đầu tiên —
                        ví dụ khi chốt ca thu ngân hoặc khi chi một khoản bằng tiền mặt.
                    </p>
                </CardBody></Card>
            ) : (
                <QueryBoundary
                    query={bookQuery}
                    errorTitle="Không tải được sổ quỹ"
                    skeleton={<div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>}
                >
                    {(book) => (
                        <>
                            <div className="grid gap-3 sm:grid-cols-4">
                                <StatCard label="Tồn đầu kỳ" value={formatCurrency(book.openingBalance)} />
                                <StatCard label="Tổng thu" value={formatCurrency(book.totalIn)} />
                                <StatCard label="Tổng chi" value={formatCurrency(book.totalOut)} />
                                <StatCard label="Tồn cuối kỳ" value={formatCurrency(book.closingBalance)} />
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Quỹ {book.fundCode}</CardTitle>
                                    <span className="text-sm text-fg-muted">
                                        {formatVnDate(book.from)} – {formatVnDate(book.to)}
                                    </span>
                                </CardHeader>
                                <CardBody className="overflow-x-auto">
                                    {book.entries.length === 0 ? (
                                        <p className="text-sm text-fg-muted">Kỳ này chưa có phiếu thu chi nào.</p>
                                    ) : (
                                        <Table>
                                            <caption className="sr-only">Sổ quỹ {book.fundCode}</caption>
                                            <THead>
                                                <Tr>
                                                    <Th>Số phiếu</Th><Th>Ngày</Th><Th>Loại</Th><Th>Nội dung</Th><Th>Nguồn</Th>
                                                    <Th align="right">Số tiền</Th><Th align="right">Số dư</Th>
                                                </Tr>
                                            </THead>
                                            <TBody>
                                                {book.entries.map((entry) => (
                                                    <Tr key={entry.voucher.id}>
                                                        <Td><span className="num">{entry.voucher.voucherNumber}</span></Td>
                                                        <Td><span className="num">{formatVnDateTime(entry.voucher.voucherDate)}</span></Td>
                                                        <Td>
                                                            <StatusBadge tone={cashVoucherKindLabel[entry.voucher.kind].tone}>
                                                                {cashVoucherKindLabel[entry.voucher.kind].label}
                                                            </StatusBadge>
                                                        </Td>
                                                        <Td className="max-w-[20rem]">
                                                            {entry.voucher.description}
                                                            {entry.voucher.counterpartyName && (
                                                                <span className="block text-xs text-fg-subtle">{entry.voucher.counterpartyName}</span>
                                                            )}
                                                        </Td>
                                                        <Td><span className="text-fg-muted">{cashVoucherSourceLabel[entry.voucher.source] ?? entry.voucher.source}</span></Td>
                                                        <Td align="right">
                                                            <span className={entry.voucher.kind === 'Receipt' ? 'text-success' : 'text-danger'}>
                                                                <Money value={entry.voucher.signedAmount} />
                                                            </span>
                                                        </Td>
                                                        <Td align="right"><Money value={entry.runningBalance} /></Td>
                                                    </Tr>
                                                ))}
                                            </TBody>
                                        </Table>
                                    )}
                                </CardBody>
                            </Card>
                        </>
                    )}
                </QueryBoundary>
            )}

            <CrudFormDialog<CashVoucherFormData>
                open={voucherOpen} onOpenChange={setVoucherOpen}
                title="Lập phiếu thu / phiếu chi"
                description="Phiếu lập tay. Phiếu của chốt ca và của khoản chi tiền mặt do hệ thống tự sinh."
                schema={cashVoucherSchema}
                defaultValues={{
                    kind: 'Receipt', fundCode: activeFund || 'CASH-MAIN', amount: 0,
                    voucherDate: toVnDateInput(new Date()), description: '', counterpartyName: '',
                }}
                submitLabel="Lập phiếu"
                knownFields={['kind', 'fundCode', 'amount', 'voucherDate', 'description', 'counterpartyName']}
                onSubmit={async (data) => {
                    await cashBookApi.createVoucher({
                        kind: data.kind, fundCode: data.fundCode, amount: data.amount,
                        voucherDate: data.voucherDate || undefined,
                        description: data.description,
                        counterpartyName: data.counterpartyName || undefined,
                    });
                    await queryClient.invalidateQueries({ queryKey: ['accounting', 'cash-book'] });
                    await queryClient.invalidateQueries({ queryKey: ['accounting', 'cash-funds'] });
                    notify.success('Đã lập phiếu');
                    setVoucherOpen(false);
                }}
            >
                {(form) => (
                    <>
                        <SelectField
                            name="kind" control={form.control} label="Loại phiếu"
                            options={[{ value: 'Receipt', label: 'Phiếu thu' }, { value: 'Payment', label: 'Phiếu chi' }]}
                        />
                        <TextField name="fundCode" control={form.control} label="Mã quỹ" required />
                        <MoneyField name="amount" control={form.control} label="Số tiền" />
                        <TextField name="voucherDate" control={form.control} label="Ngày lập" type="date" />
                        <TextField name="description" control={form.control} label="Nội dung" required />
                        <TextField name="counterpartyName" control={form.control} label="Đối tượng" />
                    </>
                )}
            </CrudFormDialog>

            <p className="flex items-center gap-2 text-xs text-fg-subtle">
                <Wallet size={14} aria-hidden />
                Số dư luỹ kế do máy chủ tính khi đọc, không lưu trên từng phiếu.
            </p>
        </div>
    );
};

export default CashBookPage;

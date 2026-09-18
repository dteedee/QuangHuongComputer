/**
 * Bảng giao dịch trong ca + hộp thoại chốt ca. Tách khỏi `shift-detail-page.tsx`
 * để giữ mỗi tệp dưới 200 dòng.
 *
 * Hộp thoại chốt ca tính chênh lệch NGAY khi gõ số tiền đếm được, và bắt buộc
 * ghi lý do khi lệch — máy chủ trả 400 nếu thiếu (contract §6).
 */
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Money, Table, TBody, Td, Th, THead, Tr, notify } from '../../../components/ui';
import { CrudFormDialog, MoneyField, TextField } from '../../../components/form';
import { formatVnDateTime, shiftSourceLabel, shiftsApi, type ShiftSession } from '../../../api/accounting';
import { closeShiftSchema, type CloseShiftFormData } from './accounting-schemas';

export const ShiftTransactions = ({ shift }: { shift: ShiftSession }) => {
    const transactions = shift.transactions ?? [];
    if (transactions.length === 0) {
        return <p className="text-sm text-fg-muted">Ca này chưa có giao dịch tiền mặt nào. Đơn bán tại quầy sẽ tự ghi vào đây.</p>;
    }
    return (
        <Table>
            <caption className="sr-only">Giao dịch tiền mặt trong ca</caption>
            <THead>
                <Tr><Th>Thời điểm</Th><Th>Diễn giải</Th><Th>Nguồn</Th><Th>Chứng từ</Th><Th align="right">Số tiền</Th></Tr>
            </THead>
            <TBody>
                {transactions.map((t) => (
                    <Tr key={t.id}>
                        <Td><span className="num">{formatVnDateTime(t.timestamp)}</span></Td>
                        <Td>{t.description}</Td>
                        <Td><span className="text-fg-muted">{shiftSourceLabel[t.source] ?? t.source}</span></Td>
                        <Td><span className="num text-fg-muted">{t.reference ?? '—'}</span></Td>
                        <Td align="right">
                            <span className={`inline-flex items-center gap-1 ${t.type === 'Credit' ? 'text-success' : 'text-danger'}`}>
                                {t.type === 'Credit'
                                    ? <ArrowDownCircle size={14} aria-hidden />
                                    : <ArrowUpCircle size={14} aria-hidden />}
                                <Money value={t.amount} />
                            </span>
                        </Td>
                    </Tr>
                ))}
            </TBody>
        </Table>
    );
};

export const CloseShiftDialog = ({ open, onOpenChange, shift, onClosed }: {
    open: boolean; onOpenChange: (o: boolean) => void; shift: ShiftSession; onClosed: () => void;
}) => (
    <CrudFormDialog<CloseShiftFormData>
        open={open} onOpenChange={onOpenChange}
        title="Chốt ca thu ngân"
        description={`Tiền phải có trong két: ${new Intl.NumberFormat('vi-VN').format(shift.expectedCash)} ₫`}
        schema={closeShiftSchema}
        defaultValues={{ actualCash: shift.expectedCash, varianceReason: '' }}
        submitLabel="Chốt ca"
        knownFields={['actualCash', 'varianceReason']}
        onSubmit={async (data, form) => {
            const variance = data.actualCash - shift.expectedCash;
            if (variance !== 0 && !data.varianceReason?.trim()) {
                form.setError('varianceReason', { message: 'Có chênh lệch quỹ — bắt buộc ghi lý do.' });
                throw new Error('variance-reason-required');
            }
            await shiftsApi.close(shift.id, { actualCash: data.actualCash, varianceReason: data.varianceReason || undefined });
            notify.success('Đã chốt ca', {
                description: variance === 0 ? 'Quỹ khớp hoàn toàn.' : `Chênh lệch ${new Intl.NumberFormat('vi-VN').format(variance)} ₫`,
            });
            onOpenChange(false);
            onClosed();
        }}
    >
        {(form) => {
            const actual = Number(form.watch('actualCash')) || 0;
            const variance = actual - shift.expectedCash;
            return (
                <>
                    <MoneyField name="actualCash" control={form.control} label="Tiền mặt đếm được" />
                    <div className="flex items-center justify-between rounded-md bg-sunken px-3 py-2 text-sm">
                        <span className="text-fg-muted">Chênh lệch so với sổ</span>
                        <span className={variance < 0 ? 'text-danger' : variance > 0 ? 'text-warning' : 'text-success'}>
                            <Money value={variance} />
                        </span>
                    </div>
                    <TextField
                        name="varianceReason" control={form.control}
                        label="Lý do chênh lệch"
                        required={variance !== 0}
                        hint={variance === 0 ? 'Không bắt buộc khi quỹ khớp.' : 'Bắt buộc khi có chênh lệch.'}
                    />
                </>
            );
        }}
    </CrudFormDialog>
);

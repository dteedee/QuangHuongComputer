import type { TransferDetail } from '../../api/inventory-transfers';
import { transferStatusLabels } from '../../api/inventory-transfers';
import type { CompanyLetterhead } from './use-company-letterhead';
import { formatPrintDate } from './print-date';

interface TransferSlipA5Props {
    transfer: TransferDetail;
    company: CompanyLetterhead;
}

/**
 * A5 "Phiếu chuyển kho" — same sheet conventions as `delivery-note-a5.tsx` (`.print-doc`, A5
 * portrait, 8mm margin). Travels with the goods: the receiving warehouse counts against it and
 * signs. Serial numbers are printed so each unit can be ticked off on arrival.
 */
export function TransferSlipA5({ transfer, company }: TransferSlipA5Props) {
    const received = transfer.status === 'Received';
    return (
        <div className="print-doc mx-auto bg-surface p-0 text-ink" style={{ width: '148mm' }}>
            <style>{`@media print { @page { size: A5 portrait; margin: 8mm; } }`}</style>
            <div className="p-[8mm] text-[10px] leading-snug">
                <header className="mb-3 flex items-start justify-between border-b border-ink-line pb-2">
                    <div>
                        <div className="text-[12px] font-bold">{company.name || 'Quang Hưởng Computer'}</div>
                        <div>{company.address}</div>
                        <div>ĐT: {company.phone || company.hotline}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[13px] font-bold uppercase">Phiếu chuyển kho</div>
                        <div>Số: <span className="num">{transfer.transferNumber}</span></div>
                        <div>Ngày: {transfer.requestedAt ? formatPrintDate(transfer.requestedAt) : '—'}</div>
                        <div>Trạng thái: {transferStatusLabels[transfer.status]}</div>
                    </div>
                </header>

                <section className="mb-3 grid grid-cols-2 gap-2">
                    <div><span className="font-semibold">Kho xuất:</span> {transfer.fromWarehouse ?? '—'}</div>
                    <div><span className="font-semibold">Kho nhận:</span> {transfer.toWarehouse ?? '—'}</div>
                    {transfer.notes && <div className="col-span-2"><span className="font-semibold">Ghi chú:</span> {transfer.notes}</div>}
                </section>

                <table className="w-full border-collapse text-[9px]">
                    <thead>
                        <tr className="border-y border-ink-line">
                            <th className="py-1 text-left">STT</th>
                            <th className="py-1 text-left">Hàng hoá / Serial</th>
                            <th className="py-1 text-right">SL xuất</th>
                            <th className="py-1 text-right">SL nhận</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transfer.items.map((line, idx) => (
                            <tr key={line.id} className="border-b border-ink-line/40 align-top">
                                <td className="py-1">{idx + 1}</td>
                                <td className="py-1">
                                    <div>{line.productName} {line.productSku ? `(${line.productSku})` : ''}</div>
                                    {line.serialNumbers.length > 0 && (
                                        <div className="num text-[8px]">SN: {line.serialNumbers.join(', ')}</div>
                                    )}
                                </td>
                                <td className="num py-1 text-right">{line.quantity}</td>
                                <td className="num py-1 text-right">{received ? line.receivedQuantity : ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {transfer.receiveNote && <div className="mt-2 italic">Ghi chú khi nhận: {transfer.receiveNote}</div>}

                <footer className="mt-8 grid grid-cols-3 gap-4 text-center">
                    {['Người lập phiếu', 'Thủ kho xuất', 'Thủ kho nhận'].map((role) => (
                        <div key={role}>
                            <div className="font-semibold">{role}</div>
                            <div className="text-[8px] text-fg-muted">(Ký, ghi rõ họ tên)</div>
                            <div className="mt-10 border-t border-ink-line" />
                        </div>
                    ))}
                </footer>
            </div>
        </div>
    );
}

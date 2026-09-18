import { openingStockApi, type OpeningBalanceImportResult } from '../../../api/bulk-tools';
import { Badge } from '../../../components/ui';
import { ImportWizardShell } from './import-wizard-shell';

/** Opening-stock wizard — `docs/api-contracts/inventory-bulk.md` §1-3. Same wizard shell as
 *  the product importer, bound to `/inventory/bulk/opening-balances`. Only works for a
 *  (product, warehouse) pair with NO stock/movement yet (Implementation Steps #3) — the
 *  backend enforces it row-by-row, this screen just makes the precondition explicit up front. */
export default function OpeningStockPage() {
    return (
        <ImportWizardShell<OpeningBalanceImportResult>
            title="Nhập tồn kho đầu kỳ"
            description="Chỉ dùng cho sản phẩm + kho CHƯA từng có phát sinh hoặc số dư. Nếu đã có tồn, dùng phiếu kiểm kê hoặc điều chỉnh."
            warning="Mỗi dòng trong file là một cặp SKU + kho. Nếu cặp đó đã có bất kỳ phiếu xuất/nhập hoặc số dư khác 0, dòng đó sẽ bị từ chối — đây không phải lỗi hệ thống."
            onDownloadTemplate={openingStockApi.downloadTemplate}
            onImport={openingStockApi.import}
            onDownloadErrors={openingStockApi.downloadErrorWorkbook}
            getErrorToken={(r) => r.errorWorkbookToken}
            canCommit={(r) => r.errors.length === 0}
            renderResult={(r) => (
                <div className="space-y-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                        <Badge>{r.totalRows} dòng</Badge>
                        <Badge className="bg-success-subtle text-success">{r.committed} đã ghi nhận</Badge>
                        {r.errors.length > 0 && <Badge className="bg-danger/10 text-danger">{r.errors.length} lỗi</Badge>}
                    </div>
                    {r.errors.length > 0 && (
                        <table className="w-full text-xs">
                            <thead><tr className="border-b border-line text-left"><th className="py-1">Dòng</th><th>Lỗi</th></tr></thead>
                            <tbody>
                                {r.errors.map((e, i) => (
                                    <tr key={i} className="border-b border-line/50">
                                        <td className="py-1 num">{e.row}</td><td>{e.message}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        />
    );
}

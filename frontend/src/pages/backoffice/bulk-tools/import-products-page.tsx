import { useState } from 'react';
import { catalogImportApi, type ProductImportResult } from '../../../api/bulk-tools';
import { Select, Badge } from '../../../components/ui';
import { ImportWizardShell } from './import-wizard-shell';

/** Import wizard for the product catalogue — `docs/api-contracts/catalog-bulk.md` §1-3.
 *  The dry-run report is the product: created/updated/skipped counts, the slug-rename list
 *  (called out separately per Key Insights — otherwise it looks like data corruption after
 *  the fact), and warnings, before anything commits. */
export default function ImportProductsPage() {
    const [onDuplicate, setOnDuplicate] = useState<'skip' | 'update'>('skip');

    return (
        <ImportWizardShell<ProductImportResult>
            title="Nhập sản phẩm từ Excel"
            description="Tải file mẫu, điền dữ liệu, kiểm tra trước khi ghi vào hệ thống."
            onDownloadTemplate={catalogImportApi.downloadTemplate}
            onImport={(file, mode) => catalogImportApi.import(file, mode, onDuplicate)}
            onDownloadErrors={catalogImportApi.downloadErrorWorkbook}
            getErrorToken={(r) => r.errorWorkbookToken}
            canCommit={(r) => r.errors.length === 0}
            extraControls={
                <label className="flex items-center gap-2 text-sm text-fg-muted">
                    SKU trùng:
                    <Select
                        className="w-40"
                        options={[{ value: 'skip', label: 'Bỏ qua' }, { value: 'update', label: 'Cập nhật' }]}
                        value={onDuplicate}
                        onChange={(e) => setOnDuplicate(e.target.value as 'skip' | 'update')}
                    />
                </label>
            }
            renderResult={(r) => (
                <div className="space-y-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                        <Badge>{r.totalRows} dòng</Badge>
                        <Badge className="bg-success-subtle text-success">{r.created} tạo mới</Badge>
                        <Badge className="bg-brand/10 text-brand">{r.updated} cập nhật</Badge>
                        <Badge>{r.skipped} bỏ qua</Badge>
                        {r.errors.length > 0 && <Badge className="bg-danger/10 text-danger">{r.errors.length} lỗi</Badge>}
                    </div>

                    {r.renames.length > 0 && (
                        <div className="rounded-lg border border-warning/40 bg-warning-subtle p-3">
                            <div className="mb-1 font-semibold">Đường dẫn (slug) sẽ đổi cho {r.renames.length} sản phẩm:</div>
                            <ul className="space-y-0.5 text-xs">
                                {r.renames.map((rn) => (
                                    <li key={rn.sku}><span className="num">{rn.sku}</span> → <code>{rn.allocatedSlug}</code></li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {r.warnings.length > 0 && (
                        <ul className="list-disc space-y-0.5 pl-5 text-xs text-fg-muted">
                            {r.warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                    )}

                    {r.errors.length > 0 && (
                        <table className="w-full text-xs">
                            <thead><tr className="border-b border-line text-left"><th className="py-1">Dòng</th><th>Cột</th><th>Lỗi</th></tr></thead>
                            <tbody>
                                {r.errors.map((e, i) => (
                                    <tr key={i} className="border-b border-line/50">
                                        <td className="py-1 num">{e.row}</td><td>{e.column ?? '—'}</td><td>{e.message}</td>
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

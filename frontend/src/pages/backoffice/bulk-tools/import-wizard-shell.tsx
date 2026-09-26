import { useRef, useState, type ReactNode } from 'react';
import { UploadCloud, Download, X, Loader2 } from 'lucide-react';
import { notify, Button, Card, CardBody, PageHeader } from '../../../components/ui';

export interface ImportWizardShellProps<TResult> {
    title: string;
    description: string;
    /** Precondition/scope warning shown above the dropzone (Key Insight / Risk Assessment). */
    warning?: ReactNode;
    onDownloadTemplate: () => Promise<Blob>;
    onImport: (file: File, mode: 'dryRun' | 'commit') => Promise<TResult>;
    onDownloadErrors?: (token: string) => Promise<Blob>;
    getErrorToken: (result: TResult) => string | null | undefined;
    /** Extra controls (e.g. "onDuplicate" select) rendered next to the dropzone. */
    extraControls?: ReactNode;
    renderResult: (result: TResult, mode: 'dryRun' | 'commit') => ReactNode;
    /** Whether `result` has zero row errors and can be committed. */
    canCommit: (result: TResult) => boolean;
    /** Accepted upload extensions (lowercase, with dot). Defaults to `.xlsx` only. */
    acceptExtensions?: string[];
    /** File name given to the downloaded template. */
    templateFileName?: string;
}

const MAX_SIZE_MB = 10;

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

/**
 * Shared shell for every "download template -> upload -> dry-run report -> commit -> error
 * workbook" wizard (Implementation Steps #1/#3). One component, bound differently by
 * import-products-page and opening-stock-page — the dry-run report itself is not the
 * preliminary, it is the product (Key Insights), so it is never skipped even on a clean file.
 */
export function ImportWizardShell<TResult>({
    title, description, warning, onDownloadTemplate, onImport, onDownloadErrors, getErrorToken,
    extraControls, renderResult, canCommit, acceptExtensions = ['.xlsx'], templateFileName = 'mau-import.xlsx',
}: ImportWizardShellProps<TResult>) {
    const acceptLabel = acceptExtensions.join(', ');
    const [file, setFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [busy, setBusy] = useState<'template' | 'dryRun' | 'commit' | 'errors' | null>(null);
    const [result, setResult] = useState<TResult | null>(null);
    const [committed, setCommitted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const pickFile = (f: File | null) => {
        if (!f) return;
        if (!acceptExtensions.some((ext) => f.name.toLowerCase().endsWith(ext))) {
            notify.error('Sai định dạng', { description: `Chỉ nhận file ${acceptLabel}.` });
            return;
        }
        if (f.size > MAX_SIZE_MB * 1024 * 1024) { notify.error('File quá lớn', { description: `Tối đa ${MAX_SIZE_MB}MB.` }); return; }
        setFile(f); setResult(null); setCommitted(false);
    };

    const runImport = async (mode: 'dryRun' | 'commit') => {
        if (!file) return;
        setBusy(mode);
        try {
            const res = await onImport(file, mode);
            setResult(res);
            if (mode === 'commit') { setCommitted(true); notify.success('Đã nhập dữ liệu'); }
        } catch (err: any) {
            notify.error('Lỗi xử lý file', { description: err?.response?.data?.error || 'Vui lòng thử lại.' });
        } finally { setBusy(null); }
    };

    const downloadTemplate = async () => {
        setBusy('template');
        try { downloadBlob(await onDownloadTemplate(), templateFileName); }
        catch { notify.error('Không tải được file mẫu'); }
        finally { setBusy(null); }
    };

    const downloadErrors = async () => {
        const token = result ? getErrorToken(result) : null;
        if (!token || !onDownloadErrors) return;
        setBusy('errors');
        try { downloadBlob(await onDownloadErrors(token), 'loi-import.xlsx'); }
        catch { notify.error('Không tải được file lỗi'); }
        finally { setBusy(null); }
    };

    return (
        <div className="mx-auto max-w-4xl space-y-5 p-4 lg:p-6">
            <PageHeader title={title} description={description} />
            {warning && <div className="rounded-lg border border-warning/40 bg-warning-subtle px-4 py-3 text-sm text-ink">{warning}</div>}

            <Card>
                <CardBody className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="outline" size="sm" onClick={downloadTemplate} loading={busy === 'template'}>
                            <Download className="mr-1.5 h-4 w-4" /> Tải file mẫu
                        </Button>
                        {extraControls}
                    </div>

                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files[0] ?? null); }}
                        onClick={() => inputRef.current?.click()}
                        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${dragOver ? 'border-brand bg-brand/5' : 'border-line'}`}
                    >
                        <UploadCloud className="h-8 w-8 text-fg-muted" />
                        {file ? (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium">{file.name}</span>
                                <button type="button" aria-label="Bỏ file" onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}>
                                    <X className="h-4 w-4 text-fg-muted" />
                                </button>
                            </div>
                        ) : (
                            <p className="text-sm text-fg-muted">Kéo thả file {acceptLabel} vào đây, hoặc bấm để chọn (tối đa {MAX_SIZE_MB}MB)</p>
                        )}
                        <input ref={inputRef} type="file" accept={acceptExtensions.join(',')} className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                    </div>

                    <div className="flex items-center gap-3">
                        <Button disabled={!file} loading={busy === 'dryRun'} onClick={() => runImport('dryRun')}>
                            Kiểm tra trước (dry-run)
                        </Button>
                        {result && canCommit(result) && !committed && (
                            <Button variant="primary" loading={busy === 'commit'} onClick={() => runImport('commit')}>
                                Xác nhận nhập dữ liệu
                            </Button>
                        )}
                        {busy && <Loader2 className="h-4 w-4 animate-spin text-fg-muted" />}
                    </div>
                </CardBody>
            </Card>

            {result && (
                <Card>
                    <CardBody className="space-y-3">
                        {renderResult(result, committed ? 'commit' : 'dryRun')}
                        {getErrorToken(result) && onDownloadErrors && (
                            <Button variant="outline" size="sm" loading={busy === 'errors'} onClick={downloadErrors}>
                                <Download className="mr-1.5 h-4 w-4" /> Tải file lỗi chi tiết
                            </Button>
                        )}
                    </CardBody>
                </Card>
            )}
        </div>
    );
}

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, ShieldAlert } from 'lucide-react';
import {
    Button, Card, CardBody, CardHeader, CardTitle, Input, PageHeader,
    QueryBoundary, SaveButton, Skeleton, StatusBadge, Switch, notify, type SaveStatus,
} from '../../components/ui';
import { paymentApi, type PaymentConfigEntry, type PaymentProviderStatus } from '../../api/payment';
import { normalizeApiError } from '../../lib/api-error';

/**
 * Cấu hình thanh toán (`Payments.Configure`).
 *
 * D04 R5 (binding): **không có ô nhập secret ở đây**. HashSecret / WebhookSecret / ApiToken chỉ
 * nằm trong biến môi trường của máy chủ; API không bao giờ trả giá trị secret. Trang này chỉ hiển
 * thị TRẠNG THÁI ("Đã cấu hình" / "Thiếu: <tên khoá>"), các thiết lập KHÔNG mật, và URL webhook/IPN
 * cần khai báo với nhà cung cấp.
 */

/** Thiết lập không mật, đúng tên khoá backend đọc (`docs/api-contracts/payments.md` §6). */
const TEXT_FIELDS = [
    { key: 'Payment:BankTransfer:BankBin', label: 'Mã BIN ngân hàng (6 số)', hint: 'VCB 970436 · BIDV 970418 · MB 970422', pattern: /^\d{6}$/, error: 'Mã BIN phải đúng 6 chữ số' },
    { key: 'Payment:BankTransfer:BankName', label: 'Tên ngân hàng hiển thị', hint: 'Ví dụ: MB Bank' },
    { key: 'Payment:BankTransfer:AccountNumber', label: 'Số tài khoản nhận tiền', pattern: /^\d{6,20}$/, error: 'Số tài khoản chỉ gồm 6-20 chữ số' },
    { key: 'Payment:BankTransfer:AccountName', label: 'Tên chủ tài khoản', hint: 'Viết đúng như đăng ký với ngân hàng' },
    { key: 'Payment:BankTransfer:HoldHours', label: 'Số giờ giữ đơn chờ chuyển khoản', pattern: /^\d{1,3}$/, error: 'Nhập số giờ (0-999)', hint: 'Mặc định 24 giờ' },
    { key: 'Payment:Cod:MaxOrderAmount', label: 'Trần giá trị đơn COD (VND)', pattern: /^\d{1,12}$/, error: 'Nhập số tiền, 0 = không giới hạn', hint: '0 = tắt trần COD' },
] as const;

const BOOL_KEY = 'Payment:BankTransfer:Enabled';

function CopyField({ label, value }: { label: string; value: string }) {
    const [done, setDone] = useState(false);
    return (
        <div className="rounded-xl border border-line bg-sunken p-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
            <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 select-all break-all font-mono text-13 text-fg">{value}</code>
                <Button
                    size="sm" variant="outline" icon={done ? Check : Copy}
                    onClick={() => {
                        navigator.clipboard.writeText(value).then(
                            () => { setDone(true); window.setTimeout(() => setDone(false), 2000); },
                            () => notify.error('Trình duyệt chặn sao chép, vui lòng bôi đen và copy thủ công.'),
                        );
                    }}
                >
                    {done ? 'Đã chép' : 'Chép'}
                </Button>
            </div>
        </div>
    );
}

function StatusTable({ rows }: { rows: PaymentProviderStatus[] }) {
    return (
        <div className="space-y-2">
            {rows.map((r) => (
                <div key={r.code} className="flex flex-col gap-2 rounded-xl border border-line p-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-13 font-semibold text-fg">{r.name}</p>
                        <p className="font-mono text-2xs text-fg-subtle">{r.code}</p>
                        {!r.configured && r.missingKeys.length > 0 && (
                            <p className="mt-1 break-words text-2xs text-fg-muted">
                                Thiếu: <span className="font-mono">{r.missingKeys.join(', ')}</span>
                            </p>
                        )}
                    </div>
                    <StatusBadge tone={r.configured ? 'success' : 'neutral'}>
                        {r.configured ? 'Đã cấu hình' : 'Chưa cấu hình'}
                    </StatusBadge>
                </div>
            ))}
        </div>
    );
}

export default function PaymentSettingsPage() {
    const qc = useQueryClient();
    const statusQuery = useQuery({ queryKey: ['payments', 'admin', 'status'], queryFn: paymentApi.getProviderStatus });
    const urlsQuery = useQuery({ queryKey: ['payments', 'admin', 'webhook-urls'], queryFn: paymentApi.getWebhookUrls });
    const configQuery = useQuery({ queryKey: ['payments', 'admin', 'config'], queryFn: paymentApi.getConfigs });

    const [form, setForm] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    /* §9.4: nút lưu bốn trạng thái — "Đã lưu" là dòng chữ có dấu tích, không phải nút. */
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

    useEffect(() => {
        if (!configQuery.data) return;
        const byKey = new Map(configQuery.data.map((c: PaymentConfigEntry) => [c.key, c.value]));
        const next: Record<string, string> = { [BOOL_KEY]: byKey.get(BOOL_KEY) ?? 'false' };
        for (const f of TEXT_FIELDS) next[f.key] = byKey.get(f.key) ?? '';
        setForm(next);
    }, [configQuery.data]);

    const save = useMutation({
        mutationFn: async (values: Record<string, string>) => {
            const entries = Object.entries(values).filter(([, v]) => v !== '');
            for (const [key, value] of entries) await paymentApi.saveConfig({ key, value });
            return entries.length;
        },
        onMutate: () => setSaveStatus('saving'),
        onSuccess: (n) => {
            setSaveStatus('saved');
            notify.success(`Đã lưu ${n} thiết lập.`);
            void qc.invalidateQueries({ queryKey: ['payments', 'admin', 'config'] });
        },
        onError: (e) => { setSaveStatus('error'); notify.error(normalizeApiError(e).message); },
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const next: Record<string, string> = {};
        for (const f of TEXT_FIELDS) {
            const v = (form[f.key] ?? '').trim();
            if (v && 'pattern' in f && f.pattern && !f.pattern.test(v)) next[f.key] = f.error!;
        }
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        save.mutate(form);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Cấu hình thanh toán"
                description="Trạng thái từng phương thức, thiết lập không mật và URL cần khai báo với nhà cung cấp."
            />

            <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-subtle p-3 text-13 text-fg">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                <span>
                    Khoá bí mật (HashSecret, WebhookSecret, ApiToken) chỉ đặt bằng biến môi trường trên máy chủ và
                    không bao giờ hiển thị ở đây. Trang này không có ô nhập khoá bí mật.
                </span>
            </div>

            <Card padded>
                <CardHeader><CardTitle>Trạng thái phương thức</CardTitle></CardHeader>
                <CardBody>
                    <QueryBoundary
                        query={statusQuery}
                        isEmpty={(d) => d.length === 0}
                        skeleton={<div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>}
                        empty={{ title: 'Máy chủ chưa khai báo phương thức nào' }}
                    >
                        {(rows) => <StatusTable rows={rows} />}
                    </QueryBoundary>
                </CardBody>
            </Card>

            <Card padded>
                <CardHeader><CardTitle>URL cần khai báo với nhà cung cấp</CardTitle></CardHeader>
                <CardBody>
                    <QueryBoundary
                        query={urlsQuery}
                        skeleton={<div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>}
                    >
                        {(u) => (
                            <div className="space-y-3">
                                <p className="text-13 text-fg-muted">
                                    Dán đúng các URL này vào trang quản trị của nhà cung cấp. Sai URL thì tiền vào tài khoản
                                    nhưng đơn không tự chuyển sang &quot;đã thanh toán&quot;.
                                </p>
                                <CopyField label="Webhook báo có (chuyển khoản)" value={u.sePayWebhook} />
                                <CopyField label="VNPay Return / IPN" value={u.vnPayReturn} />
                                <CopyField label="MoMo IPN" value={u.moMoIpn} />
                            </div>
                        )}
                    </QueryBoundary>
                </CardBody>
            </Card>

            <Card padded>
                <CardHeader><CardTitle>Thiết lập không mật</CardTitle></CardHeader>
                <CardBody>
                    {configQuery.isPending ? (
                        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
                    ) : (
                        <form onSubmit={submit} className="space-y-4">
                            <Switch
                                label="Bật chuyển khoản ngân hàng (VietQR)"
                                checked={form[BOOL_KEY] === 'true'}
                                onCheckedChange={(v) => setForm((f) => ({ ...f, [BOOL_KEY]: v ? 'true' : 'false' }))}
                            />
                            <div className="grid gap-4 sm:grid-cols-2">
                                {TEXT_FIELDS.map((f) => (
                                    <Input
                                        key={f.key}
                                        label={f.label}
                                        hint={'hint' in f ? f.hint : undefined}
                                        error={errors[f.key]}
                                        value={form[f.key] ?? ''}
                                        onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                    />
                                ))}
                            </div>
                            <p className="text-2xs text-fg-subtle">
                                Giá trị lưu vào bảng cấu hình của module thanh toán. Bảng trạng thái phía trên đọc từ cấu hình
                                máy chủ, nên một thiết lập vừa lưu chỉ đổi trạng thái sau khi máy chủ nạp lại cấu hình.
                            </p>
                            <div className="flex justify-end">
                                <SaveButton
                                    type="submit"
                                    status={saveStatus}
                                    label="Lưu thiết lập"
                                    errorMessage="Không lưu được thiết lập, thử lại."
                                    onDone={() => setSaveStatus('idle')}
                                />
                            </div>
                        </form>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}

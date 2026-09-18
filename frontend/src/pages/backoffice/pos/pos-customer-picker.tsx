/**
 * Chọn khách ở quầy. Dùng `/sales/pos/customers` (IUserDirectory) — KHÔNG dùng `/auth/users`:
 * vai trò Sale không có quyền quản trị tài khoản và không được thấy danh sách nhân viên.
 * Khách chỉ có số điện thoại → bán khách vãng lai (backend bắt buộc email để tạo tài khoản).
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserPlus } from 'lucide-react';
import { Button, Dialog, EmptyState, ErrorState, Input, Skeleton } from '../../../components/ui';
import { salesPosApi, type PosCustomer } from '../../../api/sales/pos';

interface PosCustomerPickerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPick: (customer: PosCustomer | null) => void;
    onWalkIn: (name: string, phone: string) => void;
}

export default function PosCustomerPicker({ open, onOpenChange, onPick, onWalkIn }: PosCustomerPickerProps) {
    const [term, setTerm] = useState('');
    const [mode, setMode] = useState<'search' | 'create'>('search');
    const [form, setForm] = useState({ fullName: '', phone: '', email: '' });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const query = useQuery({
        queryKey: ['pos', 'customers', term],
        queryFn: () => salesPosApi.searchCustomers(term),
        enabled: open && term.trim().length >= 2,
    });

    const create = async () => {
        setCreating(true);
        setCreateError(null);
        try {
            const created = await salesPosApi.createCustomer({
                fullName: form.fullName.trim(),
                phone: form.phone.trim() || undefined,
                email: form.email.trim(),
            });
            onPick(created);
            onOpenChange(false);
        } catch (err) {
            const normalized = (err as { normalized?: { message?: string } })?.normalized?.message;
            setCreateError(normalized ?? 'Không tạo được tài khoản khách. Bán khách vãng lai nếu khách không có email.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange} title="Khách hàng" size="md">
            <div className="mb-4 flex gap-2">
                <Button size="sm" variant={mode === 'search' ? 'primary' : 'ghost'} onClick={() => setMode('search')}>Tìm khách</Button>
                <Button size="sm" variant={mode === 'create' ? 'primary' : 'ghost'} onClick={() => setMode('create')}>
                    <UserPlus size={16} /> Tạo nhanh
                </Button>
            </div>

            {mode === 'search' ? (
                <div className="space-y-3">
                    <Input
                        icon={Search}
                        autoFocus
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder="Tên, số điện thoại hoặc email (từ 2 ký tự)"
                        aria-label="Tìm khách hàng"
                    />
                    {term.trim().length >= 2 && query.isPending && <Skeleton className="h-24 w-full" />}
                    {query.isError && <ErrorState inline error={query.error} onRetry={() => query.refetch()} />}
                    {query.data && query.data.items.length === 0 && (
                        <EmptyState
                            title="Không tìm thấy khách"
                            description="Tạo nhanh tài khoản, hoặc bán cho khách vãng lai."
                            action={{ label: 'Tạo nhanh', onClick: () => setMode('create') }}
                        />
                    )}
                    <ul className="space-y-2">
                        {query.data?.items.map((c) => (
                            <li key={c.id}>
                                <button
                                    type="button"
                                    className="w-full rounded-lg border border-line p-3 text-left hover:border-line-strong"
                                    onClick={() => { onPick(c); onOpenChange(false); }}
                                >
                                    <p className="text-sm font-medium">{c.fullName}</p>
                                    <p className="num text-xs text-fg-muted">{c.phone ?? 'Chưa có SĐT'} · {c.email}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="border-t border-line pt-3">
                        <p className="mb-2 text-xs text-fg-muted">Khách không có tài khoản: ghi tên và SĐT lên hoá đơn.</p>
                        <WalkInForm onSubmit={(n, p) => { onWalkIn(n, p); onOpenChange(false); }} />
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <Input label="Họ tên" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                    <Input label="Số điện thoại" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    <Input
                        label="Email"
                        required
                        type="email"
                        hint="Backend cần email để mở tài khoản khách."
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    {createError && <p role="alert" className="text-sm text-danger">{createError}</p>}
                    <Button onClick={create} loading={creating} disabled={!form.fullName.trim() || !form.email.trim()}>
                        Tạo và chọn khách
                    </Button>
                </div>
            )}
        </Dialog>
    );
}

function WalkInForm({ onSubmit }: { onSubmit: (name: string, phone: string) => void }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    return (
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input aria-label="Tên khách vãng lai" placeholder="Tên khách" value={name} onChange={(e) => setName(e.target.value)} />
            <Input aria-label="SĐT khách vãng lai" placeholder="SĐT" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Button variant="outline" onClick={() => onSubmit(name.trim(), phone.trim())}>Dùng</Button>
        </div>
    );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input, QueryBoundary, SaveButton, Skeleton, StatusBadge, formatDong, type SaveStatus } from '../ui';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';
import { commissionsApi, commissionErrorMessage, type CommissionRateDto } from '../../api/hr/commissions';

interface Props {
    employeeId: string;
}

/**
 * Tab "Hoa hồng" trong hồ sơ nhân viên: mức đang áp dụng, lịch sử mốc hiệu lực và form thêm
 * mốc mới. Không sửa mốc cũ — phiếu sửa tháng trước vẫn tính theo mức của tháng trước.
 */
export function CommissionPolicyPanel({ employeeId }: Props) {
    const qc = useQueryClient();
    const { hasPermission } = usePermissions();
    const canEdit = hasPermission(PERMISSIONS.HR_MANAGE_PAYROLL);
    const [percent, setPercent] = useState('');
    const [fixed, setFixed] = useState('0');
    const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
    const [note, setNote] = useState('');
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [saveError, setSaveError] = useState<string>();

    const query = useQuery({
        queryKey: ['hr-commission-policies', employeeId],
        queryFn: () => commissionsApi.policies(employeeId),
    });

    const addMut = useMutation({
        mutationFn: () => commissionsApi.addPolicy(employeeId, {
            laborPercent: Number(percent),
            fixedAmountPerJob: Number(fixed || 0),
            effectiveFrom: from,
            note: note.trim() || undefined,
        }),
        onMutate: () => setSaveStatus('saving'),
        onSuccess: () => {
            setSaveStatus('saved');
            setPercent('');
            setNote('');
            qc.invalidateQueries({ queryKey: ['hr-commission-policies', employeeId] });
        },
        onError: (e) => {
            setSaveError(commissionErrorMessage(e, 'Không lưu được mức hoa hồng'));
            setSaveStatus('error');
        },
    });

    const valid = percent !== '' && Number(percent) >= 0 && Number(percent) <= 100
        && Number(fixed || 0) >= 0 && Number.isInteger(Number(fixed || 0)) && !!from;

    return (
        <QueryBoundary query={query} skeleton={<Skeleton className="h-48 w-full" />} errorTitle="Không tải được mức hoa hồng">
            {(data) => (
                <div className="space-y-5">
                    <div className="rounded-lg border border-line p-4">
                        <p className="text-xs text-fg-muted">Đang áp dụng hôm nay</p>
                        <p className="num mt-1 text-lg font-semibold text-fg">{rateLabel(data.current)}</p>
                        <p className="mt-1 text-xs text-fg-muted">
                            {data.current.isDefault ? 'Theo mặc định công ty' : 'Theo mức riêng'} · mặc định công ty: {rateLabel(data.default)}
                        </p>
                    </div>

                    <div>
                        <h3 className="mb-2 text-13 font-semibold text-fg">Lịch sử mức riêng</h3>
                        {data.history.length === 0 ? (
                            <p className="text-xs italic text-fg-muted">Chưa có mức riêng, nhân viên đang dùng mức mặc định.</p>
                        ) : (
                            <ul className="divide-y divide-line rounded-lg border border-line">
                                {data.history.map((p, i) => (
                                    <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                        <span className="num">Từ {new Date(p.effectiveFrom).toLocaleDateString('vi-VN')}: {rateLabel(p)}</span>
                                        <span className="flex items-center gap-2 text-xs text-fg-muted">
                                            {p.note}
                                            {i === 0 && <StatusBadge tone="success">Mới nhất</StatusBadge>}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {canEdit && (
                        <div className="space-y-3 border-t border-line pt-4">
                            <h3 className="text-13 font-semibold text-fg">Thêm mốc mức mới</h3>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <Input label="% trên tiền công + phí DV" type="number" min={0} max={100} step="0.5" value={percent} onChange={(e) => setPercent(e.target.value)} />
                                <Input label="Cố định mỗi phiếu (₫)" type="number" min={0} step="1000" value={fixed} onChange={(e) => setFixed(e.target.value)} />
                                <Input label="Hiệu lực từ" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                            </div>
                            <Input label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: lên bậc kỹ thuật viên chính" />
                            <div className="flex justify-end">
                                <SaveButton
                                    size="sm"
                                    label="Thêm mốc"
                                    status={saveStatus}
                                    errorMessage={saveError}
                                    disabled={!valid}
                                    onClick={() => addMut.mutate()}
                                    onDone={() => setSaveStatus('idle')}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </QueryBoundary>
    );
}

function rateLabel(rate: CommissionRateDto): string {
    const fixed = rate.fixedAmountPerJob > 0 ? ` + ${formatDong(rate.fixedAmountPerJob)} ₫/phiếu` : '';
    return `${rate.laborPercent}%${fixed}`;
}

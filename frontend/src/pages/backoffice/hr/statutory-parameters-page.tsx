import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, ExternalLink, Lock, ShieldCheck, ShieldAlert, ScrollText } from 'lucide-react';
import { statutoryParametersApi, type StatutoryParameterDto } from '../../../api/hr/statutory-parameters';
import { QueryBoundary } from '../../../components/ui/query-boundary';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Button } from '../../../components/ui/Button';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { StatutoryParameterFormModal } from '../../../components/hr/statutory-parameter-form-modal';

/**
 * D06 (+4h, binding) — tham số lương/thuế TNCN/bảo hiểm hiệu lực theo ngày. Xem
 * docs/api-contracts/hr-statutory.md. Đổi luật = THÊM một mốc hiệu lực mới, KHÔNG sửa mốc cũ:
 * mốc đã dùng cho kỳ lương đã trả bị khoá (isLocked) và server trả 409 nếu cố sửa/xoá.
 */
export default function StatutoryParametersPage() {
    const [selectedCode, setSelectedCode] = useState<string | null>(null);
    const [addOpen, setAddOpen] = useState(false);

    const codesQuery = useQuery({ queryKey: ['statutory-parameters', 'codes'], queryFn: () => statutoryParametersApi.codes() });
    const rowsQuery = useQuery({ queryKey: ['statutory-parameters', 'all'], queryFn: () => statutoryParametersApi.list() });

    const byCode = useMemo(() => {
        const map = new Map<string, StatutoryParameterDto[]>();
        (rowsQuery.data ?? []).forEach((r) => {
            const list = map.get(r.code) ?? [];
            list.push(r);
            map.set(r.code, list);
        });
        for (const list of map.values()) list.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
        return map;
    }, [rowsQuery.data]);

    const codes = codesQuery.data ?? [];
    const activeCode = selectedCode ?? codes[0] ?? null;
    const timeline = activeCode ? (byCode.get(activeCode) ?? []) : [];
    const unverifiedCount = (rowsQuery.data ?? []).filter((r) => !r.isVerified).length;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ScrollText size={22} className="text-accent" /> Tham số lương - thuế - bảo hiểm</h1>
                    <p className="text-sm text-gray-500 mt-1">Mỗi dòng là một mốc hiệu lực (Code, ngày). Đổi luật = thêm dòng mới, không sửa dòng cũ.</p>
                </div>
                {unverifiedCount > 0 && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-2 rounded-lg shrink-0">
                        <ShieldAlert size={14} /> {unverifiedCount} dòng CHƯA XÁC MINH
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                {/* Code grid */}
                <QueryBoundary
                    query={codesQuery}
                    skeleton={<Skeleton className="h-96 w-full" />}
                    isEmpty={(d) => d.length === 0}
                    empty={{ title: 'Chưa có danh mục mã tham số' }}
                    errorTitle="Không tải được danh mục mã"
                >
                    {(list) => (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm max-h-[70vh] overflow-y-auto divide-y divide-gray-50">
                            {list.map((code) => {
                                const rows = byCode.get(code) ?? [];
                                const hasUnverified = rows.some((r) => !r.isVerified);
                                return (
                                    <button
                                        key={code}
                                        onClick={() => setSelectedCode(code)}
                                        className={`w-full text-left px-4 py-3 text-xs font-mono transition-colors flex items-center justify-between gap-2 ${activeCode === code ? 'bg-accent/5 text-accent font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <span className="truncate">{code}</span>
                                        {hasUnverified && <ShieldAlert size={12} className="text-amber-500 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </QueryBoundary>

                {/* Timeline for selected code */}
                <div className="space-y-4">
                    {activeCode && (
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-900 font-mono">{activeCode}</h2>
                            <Can permission={PERMISSIONS.HR_MANAGE_STATUTORY_PARAMETERS}>
                                <Button size="sm" icon={Plus} onClick={() => setAddOpen(true)}>Thêm mốc mới</Button>
                            </Can>
                        </div>
                    )}
                    <QueryBoundary
                        query={rowsQuery}
                        skeleton={<div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>}
                        isEmpty={() => !activeCode || timeline.length === 0}
                        empty={{ title: 'Chưa có mốc hiệu lực nào cho mã này', description: 'Hệ thống dùng giá trị mặc định biên dịch sẵn (VietnamStatutoryDefaults) cho đến khi có dòng đầu tiên.' }}
                        errorTitle="Không tải được lịch sử mốc hiệu lực"
                    >
                        {() => (
                            <ol className="space-y-3">
                                {timeline.map((row) => (
                                    <li key={row.id} className="premium-card p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">
                                                    Hiệu lực từ {new Date(row.effectiveFrom).toLocaleDateString('vi-VN')}
                                                </p>
                                                <p className="text-lg font-semibold text-accent mt-1">
                                                    {row.unit === 'JSON' ? <span className="text-xs font-mono text-gray-600">{row.jsonValue}</span>
                                                        : row.unit === 'VND' ? `${row.numberValue?.toLocaleString('vi-VN')} đ`
                                                        : row.unit === 'RATE' ? `${((row.numberValue ?? 0) * 100).toFixed(1)}%`
                                                        : `${row.numberValue} ${row.unit.toLowerCase()}`}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                {row.isLocked && (
                                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full" title="Đã dùng cho kỳ lương đã trả — không thể sửa/xoá, chỉ có thể thêm mốc mới">
                                                        <Lock size={10} /> Đã khoá (đã trả lương)
                                                    </span>
                                                )}
                                                <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${row.isVerified ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                                                    {row.isVerified ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
                                                    {row.isVerified ? 'Đã xác minh' : 'CHƯA XÁC MINH'}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-3">{row.legalBasis}</p>
                                        {row.sourceUrl && (
                                            <a href={row.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1 mt-1">
                                                <ExternalLink size={11} /> Nguồn tham chiếu
                                            </a>
                                        )}
                                        {row.note && <p className="text-[11px] text-gray-400 italic mt-2">{row.note}</p>}
                                        {row.isLocked && (
                                            <p className="text-[11px] text-gray-400 mt-2 border-t border-gray-50 pt-2">
                                                Mốc này đã dùng để tính lương đã trả — muốn thay đổi luật, thêm một mốc hiệu lực MỚI ở trên, không sửa dòng này.
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </QueryBoundary>
                </div>
            </div>

            {activeCode && (
                <StatutoryParameterFormModal isOpen={addOpen} onClose={() => setAddOpen(false)} code={activeCode} />
            )}
        </div>
    );
}

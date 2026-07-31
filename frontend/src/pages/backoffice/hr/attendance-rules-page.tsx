import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import {
    attendanceRulesApi,
    type AttendanceRule,
    type CreateAttendanceRuleDto,
} from '../../../api/hr';
import { formatCurrency } from '../../../utils/format';

const DEFAULT: CreateAttendanceRuleDto = {
    lateToleranceMinutes: 5,
    lateFineMoneyPerMinute: 0,
    earlyLeaveFineMoneyPerMinute: 0,
    otRateWeekday: 1.5,
    otRateSunday: 2.0,
    otRateHoliday: 3.0,
    otRateNight: 1.3,
    halfDayThresholdMinutes: 240,
    active: true,
};

export default function AttendanceRulesPage() {
    const qc = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<AttendanceRule | null>(null);

    const { data: rules = [], isLoading } = useQuery({
        queryKey: ['attendance-rules'],
        queryFn: () => attendanceRulesApi.list(),
    });

    const createMut = useMutation({
        mutationFn: (payload: CreateAttendanceRuleDto) => attendanceRulesApi.create(payload),
        onSuccess: () => { toast.success('Đã tạo'); qc.invalidateQueries({ queryKey: ['attendance-rules'] }); setModalOpen(false); },
        onError: () => toast.error('Không thể tạo'),
    });
    const updateMut = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateAttendanceRuleDto> }) => attendanceRulesApi.update(id, payload),
        onSuccess: () => { toast.success('Đã cập nhật'); qc.invalidateQueries({ queryKey: ['attendance-rules'] }); setModalOpen(false); },
        onError: () => toast.error('Không thể cập nhật'),
    });

    const openAdd = () => { setEditing(null); setModalOpen(true); };
    const openEdit = (r: AttendanceRule) => { setEditing(r); setModalOpen(true); };

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const payload: CreateAttendanceRuleDto = {
            storeId: (fd.get('storeId') as string) || undefined,
            lateToleranceMinutes: Number(fd.get('lateToleranceMinutes')),
            lateFineMoneyPerMinute: Number(fd.get('lateFineMoneyPerMinute')),
            earlyLeaveFineMoneyPerMinute: Number(fd.get('earlyLeaveFineMoneyPerMinute')),
            otRateWeekday: Number(fd.get('otRateWeekday')),
            otRateSunday: Number(fd.get('otRateSunday')),
            otRateHoliday: Number(fd.get('otRateHoliday')),
            otRateNight: Number(fd.get('otRateNight')),
            halfDayThresholdMinutes: Number(fd.get('halfDayThresholdMinutes')),
            active: fd.get('active') === 'on',
        };
        if (editing) updateMut.mutate({ id: editing.id, payload });
        else createMut.mutate(payload);
    };

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                        Quy tắc <span className="text-accent">chấm công</span>
                    </h1>
                    <p className="text-xs text-gray-500 font-medium">
                        Cấu hình dung sai đi muộn, mức phạt và hệ số OT theo từng chi nhánh
                    </p>
                </div>
                <Button icon={Plus} onClick={openAdd}>Thêm quy tắc</Button>
            </header>

            <div className="premium-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-accent/5 text-accent text-xs uppercase">
                        <tr>
                            <th className="text-left px-4 py-3 font-semibold">Chi nhánh</th>
                            <th className="text-right px-4 py-3 font-semibold">Dung sai muộn (phút)</th>
                            <th className="text-right px-4 py-3 font-semibold">Phạt muộn (VND/phút)</th>
                            <th className="text-right px-4 py-3 font-semibold">Phạt về sớm (VND/phút)</th>
                            <th className="text-right px-4 py-3 font-semibold">OT thường</th>
                            <th className="text-right px-4 py-3 font-semibold">OT CN</th>
                            <th className="text-right px-4 py-3 font-semibold">OT lễ</th>
                            <th className="text-right px-4 py-3 font-semibold">OT đêm</th>
                            <th className="text-left px-4 py-3 font-semibold">Hoạt động</th>
                            <th className="text-right px-4 py-3 font-semibold">Sửa</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr><td colSpan={10} className="text-center py-16 text-gray-400">Đang tải...</td></tr>
                        ) : rules.length === 0 ? (
                            <tr><td colSpan={10} className="text-center py-16 text-gray-400">Chưa có quy tắc</td></tr>
                        ) : rules.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50/60">
                                <td className="px-4 py-3 font-medium">{r.storeName ?? 'Toàn hệ thống'}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{r.lateToleranceMinutes}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(r.lateFineMoneyPerMinute)}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(r.earlyLeaveFineMoneyPerMinute)}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{(r.otRateWeekday * 100).toFixed(0)}%</td>
                                <td className="px-4 py-3 text-right tabular-nums">{(r.otRateSunday * 100).toFixed(0)}%</td>
                                <td className="px-4 py-3 text-right tabular-nums">{(r.otRateHoliday * 100).toFixed(0)}%</td>
                                <td className="px-4 py-3 text-right tabular-nums">+{((r.otRateNight - 1) * 100).toFixed(0)}%</td>
                                <td className="px-4 py-3">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {r.active ? 'Bật' : 'Tắt'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => openEdit(r)} className="text-accent hover:underline">
                                        <Edit2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa quy tắc' : 'Thêm quy tắc'}>
                <form onSubmit={onSubmit} className="space-y-4">
                    <Input
                        label="Store ID (để trống nếu áp dụng toàn hệ thống)"
                        name="storeId"
                        defaultValue={editing?.storeId ?? ''}
                        placeholder="uuid store..."
                    />
                    <div className="grid grid-cols-3 gap-3">
                        <Input label="Dung sai muộn (phút)" name="lateToleranceMinutes" type="number" defaultValue={editing?.lateToleranceMinutes ?? DEFAULT.lateToleranceMinutes} />
                        <Input label="Phạt muộn (VND/phút)" name="lateFineMoneyPerMinute" type="number" defaultValue={editing?.lateFineMoneyPerMinute ?? DEFAULT.lateFineMoneyPerMinute} />
                        <Input label="Phạt về sớm (VND/phút)" name="earlyLeaveFineMoneyPerMinute" type="number" defaultValue={editing?.earlyLeaveFineMoneyPerMinute ?? DEFAULT.earlyLeaveFineMoneyPerMinute} />
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        <Input label="OT thường" name="otRateWeekday" type="number" step="0.01" defaultValue={editing?.otRateWeekday ?? DEFAULT.otRateWeekday} />
                        <Input label="OT CN" name="otRateSunday" type="number" step="0.01" defaultValue={editing?.otRateSunday ?? DEFAULT.otRateSunday} />
                        <Input label="OT lễ" name="otRateHoliday" type="number" step="0.01" defaultValue={editing?.otRateHoliday ?? DEFAULT.otRateHoliday} />
                        <Input label="OT đêm" name="otRateNight" type="number" step="0.01" defaultValue={editing?.otRateNight ?? DEFAULT.otRateNight} />
                    </div>
                    <Input
                        label="Ngưỡng nửa công (phút)"
                        name="halfDayThresholdMinutes"
                        type="number"
                        defaultValue={editing?.halfDayThresholdMinutes ?? DEFAULT.halfDayThresholdMinutes}
                    />
                    <label className="flex items-center gap-2 text-xs font-semibold">
                        <input type="checkbox" name="active" defaultChecked={editing?.active ?? DEFAULT.active} />
                        Hoạt động
                    </label>
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Hủy</Button>
                        <Button type="submit" loading={createMut.isPending || updateMut.isPending} className="flex-1">
                            {editing ? 'Cập nhật' : 'Tạo'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

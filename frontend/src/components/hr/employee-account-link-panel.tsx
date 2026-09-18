import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, Link2, Unlink, UserCheck2 } from 'lucide-react';
import { authApi } from '../../api/auth';
import { hrApi, type Employee } from '../../api/hr';
import { Button } from '../ui/Button';
import { useConfirm } from '../../context/ConfirmContext';

interface Props {
    employee: Employee;
}

/**
 * "Tài khoản đăng nhập" tab of the employee edit modal — docs/api-contracts/hr.md §1/§9.
 * Links/unlinks an Identity user account to this employee record. Without a link the employee
 * can never see self-service (payslip, check-in, leave/OT) because those routes resolve the
 * caller's Employee row from the JWT user id.
 */
export function EmployeeAccountLinkPanel({ employee }: Props) {
    const confirm = useConfirm();
    const qc = useQueryClient();
    const [search, setSearch] = useState('');

    // All employees (large page) just to know which userIds are already taken —
    // there is no dedicated "users without an employee" endpoint (docs/api-contracts/hr.md §9:
    // IUserDirectory is not wired for HR), so this is the best-effort client-side exclusion; the
    // backend still re-checks and returns 400 on a real conflict.
    const { data: allEmployees } = useQuery({
        queryKey: ['employees', 'all-for-link'],
        queryFn: () => hrApi.getEmployees(1, 500),
        staleTime: 30_000,
    });
    const linkedUserIds = useMemo(() => {
        const set = new Set<string>();
        (allEmployees?.items ?? []).forEach((e) => {
            if (e.userId && e.id !== employee.id) set.add(e.userId);
        });
        return set;
    }, [allEmployees, employee.id]);

    const usersQuery = useQuery({
        queryKey: ['auth-users-search', search],
        queryFn: () => authApi.getUsers(1, 10, search || undefined),
        enabled: search.trim().length >= 2,
    });

    const linkMutation = useMutation({
        mutationFn: (userId: string) => hrApi.linkEmployeeUser(employee.id, userId),
        onSuccess: () => {
            toast.success('Đã gắn tài khoản đăng nhập.');
            qc.invalidateQueries({ queryKey: ['employees'] });
            setSearch('');
        },
        onError: (e) => {
            const err = e as { response?: { data?: { error?: string } } };
            toast.error(err.response?.data?.error || 'Không thể gắn tài khoản.');
        },
    });

    const unlinkMutation = useMutation({
        mutationFn: () => hrApi.unlinkEmployeeUser(employee.id),
        onSuccess: () => {
            toast.success('Đã bỏ gắn tài khoản đăng nhập.');
            qc.invalidateQueries({ queryKey: ['employees'] });
        },
        onError: () => toast.error('Không thể bỏ gắn tài khoản.'),
    });

    const candidateUsers = (usersQuery.data?.items ?? []).filter((u) => !linkedUserIds.has(u.id));

    if (employee.userId) {
        return (
            <div className="space-y-4">
                <div className="premium-card p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <UserCheck2 size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">Đã liên kết tài khoản đăng nhập</p>
                        <p className="text-xs text-gray-500 mt-0.5 font-mono">{employee.userId}</p>
                    </div>
                </div>
                <p className="text-xs text-gray-500">
                    Nhân viên này có thể đăng nhập để xem phiếu lương, chấm công vào/ra và gửi yêu cầu nghỉ phép/OT của chính mình.
                </p>
                <Button
                    type="button"
                    variant="outline"
                    icon={Unlink}
                    loading={unlinkMutation.isPending}
                    onClick={async () => {
                        const ok = await confirm({ message: 'Bỏ gắn tài khoản đăng nhập của nhân viên này? Họ sẽ mất quyền tự phục vụ.', variant: 'danger' });
                        if (ok) unlinkMutation.mutate();
                    }}
                >
                    Bỏ gắn tài khoản
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="premium-card p-4 bg-amber-50/60 border-amber-100">
                <p className="text-xs font-semibold text-amber-700">
                    Chưa liên kết tài khoản — nhân viên KHÔNG thể tự phục vụ (xem phiếu lương, chấm công, nghỉ phép/OT).
                </p>
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tìm tài khoản đăng nhập (email hoặc tên)</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Nhập tối thiểu 2 ký tự để tìm..."
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                </div>
            </div>

            {search.trim().length >= 2 && (
                <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 max-h-56 overflow-y-auto">
                    {usersQuery.isLoading ? (
                        <p className="text-xs text-gray-400 p-4 text-center">Đang tìm...</p>
                    ) : usersQuery.isError ? (
                        <p className="text-xs text-red-500 p-4 text-center">
                            {(usersQuery.error as { response?: { status?: number } })?.response?.status === 403
                                ? 'Tài khoản của bạn không có quyền tìm kiếm danh sách người dùng (Permissions.Users.View). Nhờ Admin gắn tài khoản này, hoặc yêu cầu Admin cấp thêm quyền cho vai trò HR.'
                                : 'Không tải được danh sách tài khoản.'}
                        </p>
                    ) : candidateUsers.length === 0 ? (
                        <p className="text-xs text-gray-400 p-4 text-center italic">Không có tài khoản phù hợp (hoặc đã gắn nhân viên khác).</p>
                    ) : candidateUsers.map((u) => (
                        <button
                            key={u.id}
                            type="button"
                            disabled={linkMutation.isPending}
                            onClick={() => linkMutation.mutate(u.id)}
                            className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-blue-50/50 transition-colors disabled:opacity-50"
                        >
                            <div>
                                <p className="text-xs font-semibold text-gray-800">{u.fullName}</p>
                                <p className="text-[11px] text-gray-400">{u.email}</p>
                            </div>
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-accent uppercase">
                                <Link2 size={12} /> Gắn
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hrApi, type Employee } from '../../../api/hr';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { SalaryStructureHistory } from '../../../components/hr/salary-structure-history';

export default function SalaryStructurePage() {
    const [employeeId, setEmployeeId] = useState<string>('');

    const { data: empResp } = useQuery({
        queryKey: ['employees', 'salary-struct-picker'],
        queryFn: () => hrApi.getEmployees(1, 500),
    });

    const options = useMemo(() => {
        const items = empResp?.items ?? [];
        return items.map((e: Employee) => ({ value: e.id, label: `${e.fullName}${e.employeeCode ? ' · ' + e.employeeCode : ''}` }));
    }, [empResp]);

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            <header>
                <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                    Cơ cấu <span className="text-accent">lương</span>
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                    Lịch sử tăng lương, mức lương đóng bảo hiểm theo từng thời điểm
                </p>
            </header>

            <div className="max-w-md">
                <SearchableSelect
                    options={options}
                    value={employeeId}
                    onChange={setEmployeeId}
                    placeholder="Chọn nhân viên..."
                />
            </div>

            {employeeId ? (
                <div className="premium-card p-6">
                    <SalaryStructureHistory employeeId={employeeId} />
                </div>
            ) : (
                <p className="text-center py-16 text-gray-400 text-sm">Vui lòng chọn nhân viên để xem cơ cấu lương</p>
            )}
        </div>
    );
}

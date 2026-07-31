import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import {
    hrApi,
    contractTypeLabels,
    type ContractType,
    type CreateContractDto,
    type EmploymentContract,
    type Employee,
} from '../../api/hr';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateContractDto) => void;
    initial?: EmploymentContract | null;
    loading?: boolean;
    lockedEmployeeId?: string;
}

const TYPE_OPTIONS: ContractType[] = ['Probation', 'FixedTerm1Year', 'FixedTerm3Year', 'Permanent', 'Seasonal', 'Internship'];

/**
 * Form modal to create or edit an employment contract.
 * End date disabled when Type=Permanent. Validation: EndDate > StartDate, InsurableSalary <= ContractSalary.
 */
export function ContractForm({ isOpen, onClose, onSubmit, initial, loading, lockedEmployeeId }: Props) {
    const [type, setType] = useState<ContractType>(initial?.type ?? 'FixedTerm1Year');
    const [startDate, setStartDate] = useState<string>(initial?.startDate?.split('T')[0] ?? '');
    const [endDate, setEndDate] = useState<string>(initial?.endDate?.split('T')[0] ?? '');
    const [employeeId, setEmployeeId] = useState<string>(initial?.employeeId ?? lockedEmployeeId ?? '');
    const [contractSalary, setContractSalary] = useState<number>(initial?.contractSalary ?? 0);
    const [insurableSalary, setInsurableSalary] = useState<number>(initial?.insurableSalary ?? 0);
    const [contractNumber, setContractNumber] = useState<string>(initial?.contractNumber ?? '');
    const [documentUrl, setDocumentUrl] = useState<string>(initial?.documentUrl ?? '');

    useEffect(() => {
        if (isOpen) {
            setType(initial?.type ?? 'FixedTerm1Year');
            setStartDate(initial?.startDate?.split('T')[0] ?? '');
            setEndDate(initial?.endDate?.split('T')[0] ?? '');
            setEmployeeId(initial?.employeeId ?? lockedEmployeeId ?? '');
            setContractSalary(initial?.contractSalary ?? 0);
            setInsurableSalary(initial?.insurableSalary ?? 0);
            setContractNumber(initial?.contractNumber ?? autoNumber());
            setDocumentUrl(initial?.documentUrl ?? '');
        }
    }, [isOpen, initial, lockedEmployeeId]);

    const { data: empResp } = useQuery({
        queryKey: ['employees', 'contract-form'],
        queryFn: () => hrApi.getEmployees(1, 500),
        enabled: isOpen && !lockedEmployeeId,
    });

    const employeeOptions = useMemo(() => {
        const items = empResp?.items ?? [];
        return items.map((e: Employee) => ({ value: e.id, label: `${e.fullName} (${e.employeeCode ?? e.email})` }));
    }, [empResp]);

    const isPermanent = type === 'Permanent';

    const handle = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!employeeId) return toast.error('Chọn nhân viên');
        if (!startDate) return toast.error('Chọn ngày bắt đầu');
        if (!isPermanent && !endDate) return toast.error('Chọn ngày kết thúc');
        if (!isPermanent && endDate && new Date(endDate) <= new Date(startDate)) {
            return toast.error('Ngày kết thúc phải sau ngày bắt đầu');
        }
        if (contractSalary <= 0) return toast.error('Lương HĐ phải > 0');
        if (insurableSalary <= 0) return toast.error('Lương đóng BH phải > 0');
        if (insurableSalary > contractSalary) return toast.error('Lương đóng BH không được lớn hơn lương HĐ');

        onSubmit({
            employeeId,
            contractNumber: contractNumber || undefined,
            type,
            startDate,
            endDate: isPermanent ? undefined : endDate,
            contractSalary,
            insurableSalary,
            documentUrl: documentUrl || undefined,
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initial ? 'Sửa hợp đồng lao động' : 'Tạo hợp đồng lao động'}
        >
            <form onSubmit={handle} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {lockedEmployeeId ? (
                        <Input label="Nhân viên" value={employeeId} readOnly />
                    ) : (
                        <Select
                            label="Nhân viên *"
                            name="employeeId"
                            value={employeeId}
                            onChange={e => setEmployeeId(e.target.value)}
                            options={[{ value: '', label: 'Chọn nhân viên...' }, ...employeeOptions]}
                        />
                    )}
                    <Input
                        label="Số hợp đồng"
                        value={contractNumber}
                        onChange={e => setContractNumber(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="Loại hợp đồng *"
                        value={type}
                        onChange={e => setType(e.target.value as ContractType)}
                        options={TYPE_OPTIONS.map(t => ({ value: t, label: contractTypeLabels[t] }))}
                    />
                    <div />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Ngày bắt đầu *"
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                    />
                    <Input
                        label={isPermanent ? 'Ngày kết thúc (Không xác định)' : 'Ngày kết thúc *'}
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        disabled={isPermanent}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Lương HĐ (VND) *"
                        type="number"
                        value={contractSalary}
                        onChange={e => setContractSalary(Number(e.target.value))}
                    />
                    <Input
                        label="Lương đóng BH (VND) *"
                        type="number"
                        value={insurableSalary}
                        onChange={e => setInsurableSalary(Number(e.target.value))}
                        hint="Không lớn hơn lương HĐ"
                    />
                </div>

                <Input
                    label="URL scan hợp đồng"
                    value={documentUrl}
                    onChange={e => setDocumentUrl(e.target.value)}
                    placeholder="https://..."
                />

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1">Hủy</Button>
                    <Button type="submit" loading={loading} className="flex-1">{initial ? 'Cập nhật' : 'Tạo'}</Button>
                </div>
            </form>
        </Modal>
    );
}

function autoNumber(): string {
    const d = new Date();
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `HĐLĐ-${ym}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

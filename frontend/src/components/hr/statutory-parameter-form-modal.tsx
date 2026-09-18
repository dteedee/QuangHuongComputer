import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { SearchableSelect } from '../ui/SearchableSelect';
import { Button } from '../ui/Button';
import {
    statutoryParametersApi,
    type StatutoryParameterUnit,
} from '../../api/hr/statutory-parameters';

const UNITS: StatutoryParameterUnit[] = ['VND', 'RATE', 'HOURS', 'JSON', 'TEXT'];

const schema = z.object({
    effectiveFrom: z.string().min(1, 'Chọn ngày hiệu lực'),
    unit: z.enum(['VND', 'RATE', 'HOURS', 'JSON', 'TEXT']),
    numberValue: z.string().optional(),
    jsonValue: z.string().optional(),
    legalBasis: z.string().min(1, 'Nhập căn cứ pháp lý'),
    sourceUrl: z.string().min(1, 'Nhập nguồn tham chiếu'),
    note: z.string().optional(),
    isVerified: z.boolean(),
    reason: z.string().min(1, 'Nhập lý do thêm mốc mới'),
}).refine((v) => (v.unit === 'JSON' ? !!v.jsonValue?.trim() : !!v.numberValue?.trim()), {
    message: 'Nhập giá trị phù hợp với đơn vị đã chọn',
    path: ['numberValue'],
});

type FormValues = z.infer<typeof schema>;

interface Props {
    isOpen: boolean;
    onClose: () => void;
    code: string;
}

/**
 * "Thêm mốc hiệu lực mới" — D06 §3: đổi luật = THÊM một dòng (Code, EffectiveFrom) mới, KHÔNG
 * sửa dòng cũ. Backend chặn trùng mốc (409) và chặn mốc rơi vào kỳ đã trả lương (409, khoá).
 */
export function StatutoryParameterFormModal({ isOpen, onClose, code }: Props) {
    const qc = useQueryClient();
    const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { unit: 'VND', isVerified: true, effectiveFrom: '' },
    });
    const unit = watch('unit');

    const createMutation = useMutation({
        mutationFn: (values: FormValues) => statutoryParametersApi.create({
            code,
            effectiveFrom: values.effectiveFrom,
            unit: values.unit,
            numberValue: values.unit === 'JSON' ? undefined : Number(values.numberValue),
            jsonValue: values.unit === 'JSON' ? values.jsonValue : undefined,
            legalBasis: values.legalBasis,
            sourceUrl: values.sourceUrl,
            note: values.note,
            isVerified: values.isVerified,
            reason: values.reason,
        }),
        onSuccess: () => {
            toast.success('Đã thêm mốc hiệu lực mới.');
            qc.invalidateQueries({ queryKey: ['statutory-parameters'] });
            reset();
            onClose();
        },
        onError: (e) => {
            const err = e as { response?: { data?: { error?: string } } };
            toast.error(err.response?.data?.error || 'Không thêm được mốc hiệu lực (có thể trùng ngày hoặc đã khoá bởi kỳ lương đã trả).');
        },
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Thêm mốc hiệu lực — ${code}`}
            description="Thay đổi luật = thêm mốc mới. Các mốc trước không bị sửa hay xoá.">
            <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Input label="Ngày hiệu lực *" type="date" {...register('effectiveFrom')} />
                        {errors.effectiveFrom && <p className="text-red-500 text-xs mt-1">{errors.effectiveFrom.message}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Đơn vị *</label>
                        <SearchableSelect
                            value={unit}
                            onChange={(v) => setValue('unit', v as FormValues['unit'], { shouldValidate: true })}
                            options={UNITS.map(u => ({ value: u, label: u }))}
                        />
                    </div>
                </div>

                {unit === 'JSON' ? (
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Giá trị JSON *</label>
                        <textarea {...register('jsonValue')} rows={4}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono resize-none focus:ring-2 focus:ring-accent/20 outline-none"
                            placeholder='VD: [{"upTo":10000000,"rate":0.05,"quickDeduction":0}, ...]' />
                        {errors.numberValue && <p className="text-red-500 text-xs mt-1">{errors.numberValue.message}</p>}
                    </div>
                ) : (
                    <div>
                        <Input label={`Giá trị (${unit}) *`} type="number" step="any" {...register('numberValue')} />
                        {errors.numberValue && <p className="text-red-500 text-xs mt-1">{errors.numberValue.message}</p>}
                    </div>
                )}

                <div>
                    <Input label="Căn cứ pháp lý *" placeholder="VD: Luật 109/2025/QH15 Đ.29.2" {...register('legalBasis')} />
                    {errors.legalBasis && <p className="text-red-500 text-xs mt-1">{errors.legalBasis.message}</p>}
                </div>
                <div>
                    <Input label="Nguồn tham chiếu (URL) *" placeholder="https://..." {...register('sourceUrl')} />
                    {errors.sourceUrl && <p className="text-red-500 text-xs mt-1">{errors.sourceUrl.message}</p>}
                </div>
                <Input label="Ghi chú" {...register('note')} />
                <div>
                    <Input label="Lý do thêm mốc mới *" placeholder="VD: Nghị định 253/2026 nâng lương cơ sở từ 01/07/2026" {...register('reason')} />
                    {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                    <input type="checkbox" {...register('isVerified')} className="rounded" />
                    Đã xác minh với nguồn chính thức (bỏ chọn nếu số liệu tạm, chưa đối chiếu văn bản gốc)
                </label>

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1">Hủy</Button>
                    <Button type="submit" loading={createMutation.isPending} className="flex-1">Thêm mốc</Button>
                </div>
            </form>
        </Modal>
    );
}

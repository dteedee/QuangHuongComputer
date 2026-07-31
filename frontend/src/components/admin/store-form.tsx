import { useEffect, useMemo, useState } from 'react';
import { Loader2, X, Check, MapPin, Store as StoreIcon, Clock, Warehouse as WarehouseIcon, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    storeApi,
    parseOpeningHours,
    DAY_KEYS,
    DAY_LABELS,
    type StoreDetail,
    type CreateStoreDto,
} from '../../api/store';
import { inventoryApi, type Warehouse } from '../../api/inventory';
import { hrApi, type Employee } from '../../api/hr';

interface StoreFormProps {
    /** null = tạo mới; có id = sửa. */
    editingId: string | null;
    onClose: () => void;
    onSaved: () => void;
}

interface DayHours {
    open: boolean;
    from: string;
    to: string;
}

const DEFAULT_HOURS: Record<string, DayHours> = DAY_KEYS.reduce((acc, key) => {
    acc[key] = { open: true, from: '09:00', to: '21:00' };
    return acc;
}, {} as Record<string, DayHours>);

// Snake-case upper: chỉ chữ hoa, số, và dấu gạch dưới.
const CODE_RE = /^[A-Z][A-Z0-9_]{1,31}$/;
// SĐT VN: 09xx / 03xx / 07xx / 08xx / 05xx, 10 số hoặc kèm +84.
const PHONE_RE = /^(?:\+?84|0)(?:3|5|7|8|9)\d{8}$/;

/** Gợi ý danh sách tỉnh/TP phổ biến — datalist nhẹ, không cần API ngoài. */
const COMMON_PROVINCES = [
    'Hà Nội', 'TP. Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Cần Thơ',
    'Bắc Ninh', 'Bắc Giang', 'Nam Định', 'Thái Bình', 'Ninh Bình',
    'Nghệ An', 'Thanh Hoá', 'Quảng Ninh', 'Hưng Yên', 'Hải Dương',
];

interface FormState {
    code: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    ward: string;
    district: string;
    province: string;
    latitude: string;
    longitude: string;
    isActive: boolean;
    isPickupPoint: boolean;
    sortOrder: number;
    hours: Record<string, DayHours>;
    warehouseIds: string[];
    employeeIds: string[];
}

const EMPTY_STATE: FormState = {
    code: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    ward: '',
    district: '',
    province: '',
    latitude: '',
    longitude: '',
    isActive: true,
    isPickupPoint: true,
    sortOrder: 0,
    hours: DEFAULT_HOURS,
    warehouseIds: [],
    employeeIds: [],
};

export default function StoreForm({ editingId, onClose, onSaved }: StoreFormProps) {
    const [state, setState] = useState<FormState>(EMPTY_STATE);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Load lookups + entity khi mở form
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const [wh, emp] = await Promise.all([
                    inventoryApi.warehouses.getList().catch(() => [] as Warehouse[]),
                    hrApi.employees.getList(1, 500).then(r => r.items).catch(() => [] as Employee[]),
                ]);
                if (cancelled) return;
                setWarehouses(wh);
                setEmployees(emp);

                if (editingId) {
                    const detail = await storeApi.get(editingId);
                    if (cancelled) return;
                    setState(mapDetailToState(detail));
                } else {
                    setState(EMPTY_STATE);
                }
            } catch (e) {
                toast.error('Không tải được dữ liệu cửa hàng');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [editingId]);

    const patch = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setState(prev => ({ ...prev, [key]: value }));
    };

    const patchDay = (day: string, part: Partial<DayHours>) => {
        setState(prev => ({
            ...prev,
            hours: { ...prev.hours, [day]: { ...prev.hours[day], ...part } },
        }));
    };

    const validate = (): boolean => {
        const errs: Record<string, string> = {};

        if (!CODE_RE.test(state.code)) {
            errs.code = 'Mã cửa hàng: CHỮ HOA + số + gạch dưới, bắt đầu bằng chữ, 2-32 ký tự';
        }
        if (state.name.trim().length < 2) errs.name = 'Tên cửa hàng tối thiểu 2 ký tự';
        if (!PHONE_RE.test(state.phone.trim())) errs.phone = 'Số điện thoại Việt Nam không hợp lệ';
        if (state.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
            errs.email = 'Email không hợp lệ';
        }
        if (state.address.trim().length < 5) errs.address = 'Địa chỉ tối thiểu 5 ký tự';

        if (state.latitude) {
            const lat = Number(state.latitude);
            if (Number.isNaN(lat) || lat < -90 || lat > 90) errs.latitude = 'Vĩ độ nằm trong -90..90';
        }
        if (state.longitude) {
            const lng = Number(state.longitude);
            if (Number.isNaN(lng) || lng < -180 || lng > 180) errs.longitude = 'Kinh độ nằm trong -180..180';
        }

        // Giờ mở cửa: from < to nếu mở
        for (const day of DAY_KEYS) {
            const h = state.hours[day];
            if (h.open && h.from >= h.to) {
                errs[`hours.${day}`] = `${DAY_LABELS[day]}: giờ mở phải nhỏ hơn giờ đóng`;
            }
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const buildDto = (): CreateStoreDto => {
        const hoursJson: Record<string, string> = {};
        for (const day of DAY_KEYS) {
            const h = state.hours[day];
            hoursJson[day] = h.open ? `${h.from}-${h.to}` : 'closed';
        }
        return {
            code: state.code.trim(),
            name: state.name.trim(),
            address: state.address.trim(),
            ward: state.ward.trim() || undefined,
            district: state.district.trim() || undefined,
            province: state.province.trim() || undefined,
            phone: state.phone.trim(),
            email: state.email.trim() || undefined,
            openingHoursJson: JSON.stringify(hoursJson),
            latitude: state.latitude ? Number(state.latitude) : undefined,
            longitude: state.longitude ? Number(state.longitude) : undefined,
            isActive: state.isActive,
            isPickupPoint: state.isPickupPoint,
            sortOrder: state.sortOrder,
            warehouseIds: state.warehouseIds,
            employeeIds: state.employeeIds,
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            toast.error('Kiểm tra lại các trường có lỗi');
            return;
        }
        setSubmitting(true);
        try {
            const dto = buildDto();
            if (editingId) {
                await storeApi.update(editingId, dto);
                toast.success('Đã cập nhật cửa hàng');
            } else {
                await storeApi.create(dto);
                toast.success('Đã tạo cửa hàng');
            }
            onSaved();
            onClose();
        } catch (err) {
            const anyErr = err as { response?: { data?: { message?: string } } };
            toast.error(anyErr.response?.data?.message || 'Không thể lưu cửa hàng');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleId = (list: string[], id: string): string[] =>
        list.includes(id) ? list.filter(x => x !== id) : [...list, id];

    const dayRows = useMemo(() => DAY_KEYS.map(d => ({ key: d as string, label: DAY_LABELS[d] })), []);

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <StoreIcon className="w-5 h-5 text-[var(--accent-primary,#dc2626)]" />
                        {editingId ? 'Sửa chi nhánh' : 'Tạo chi nhánh mới'}
                    </h2>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Cơ bản */}
                        <Section title="Thông tin cơ bản" icon={<StoreIcon className="w-4 h-4" />}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Mã cửa hàng" required error={errors.code}>
                                    <input
                                        type="text"
                                        value={state.code}
                                        onChange={e => patch('code', e.target.value.toUpperCase())}
                                        placeholder="VD: STORE_HN_01"
                                        className="input"
                                        disabled={!!editingId}
                                    />
                                </Field>
                                <Field label="Tên hiển thị" required error={errors.name}>
                                    <input
                                        type="text"
                                        value={state.name}
                                        onChange={e => patch('name', e.target.value)}
                                        placeholder="VD: Chi nhánh Cầu Giấy"
                                        className="input"
                                    />
                                </Field>
                                <Field label="Số điện thoại" required error={errors.phone}>
                                    <input
                                        type="tel"
                                        value={state.phone}
                                        onChange={e => patch('phone', e.target.value)}
                                        placeholder="0987xxxxxx"
                                        className="input"
                                    />
                                </Field>
                                <Field label="Email" error={errors.email}>
                                    <input
                                        type="email"
                                        value={state.email}
                                        onChange={e => patch('email', e.target.value)}
                                        placeholder="cn@quanghuong.com"
                                        className="input"
                                    />
                                </Field>
                                <Field label="Thứ tự hiển thị">
                                    <input
                                        type="number"
                                        value={state.sortOrder}
                                        onChange={e => patch('sortOrder', Number(e.target.value) || 0)}
                                        className="input"
                                    />
                                </Field>
                                <div className="flex items-end gap-4">
                                    <Toggle
                                        label="Đang hoạt động"
                                        checked={state.isActive}
                                        onChange={v => patch('isActive', v)}
                                    />
                                    <Toggle
                                        label="Cho phép nhận tại cửa hàng"
                                        checked={state.isPickupPoint}
                                        onChange={v => patch('isPickupPoint', v)}
                                    />
                                </div>
                            </div>
                        </Section>

                        {/* Địa chỉ */}
                        <Section title="Địa chỉ" icon={<MapPin className="w-4 h-4" />}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Địa chỉ chi tiết" required error={errors.address}>
                                    <input
                                        type="text"
                                        value={state.address}
                                        onChange={e => patch('address', e.target.value)}
                                        placeholder="Số nhà, đường"
                                        className="input"
                                    />
                                </Field>
                                <Field label="Phường / Xã">
                                    <input
                                        type="text"
                                        value={state.ward}
                                        onChange={e => patch('ward', e.target.value)}
                                        className="input"
                                    />
                                </Field>
                                <Field label="Quận / Huyện">
                                    <input
                                        type="text"
                                        value={state.district}
                                        onChange={e => patch('district', e.target.value)}
                                        className="input"
                                    />
                                </Field>
                                <Field label="Tỉnh / Thành phố">
                                    <input
                                        type="text"
                                        list="province-suggestions"
                                        value={state.province}
                                        onChange={e => patch('province', e.target.value)}
                                        className="input"
                                    />
                                    <datalist id="province-suggestions">
                                        {COMMON_PROVINCES.map(p => <option key={p} value={p} />)}
                                    </datalist>
                                </Field>
                                <Field label="Vĩ độ (latitude)" error={errors.latitude}>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={state.latitude}
                                        onChange={e => patch('latitude', e.target.value)}
                                        placeholder="VD: 21.0285"
                                        className="input"
                                    />
                                </Field>
                                <Field label="Kinh độ (longitude)" error={errors.longitude}>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={state.longitude}
                                        onChange={e => patch('longitude', e.target.value)}
                                        placeholder="VD: 105.8542"
                                        className="input"
                                    />
                                </Field>
                            </div>
                        </Section>

                        {/* Giờ mở cửa */}
                        <Section title="Giờ mở cửa" icon={<Clock className="w-4 h-4" />}>
                            <div className="space-y-2">
                                {dayRows.map(({ key, label }) => {
                                    const h = state.hours[key];
                                    const err = errors[`hours.${key}`];
                                    return (
                                        <div key={key} className="flex items-center gap-3 flex-wrap">
                                            <span className="w-20 text-sm font-medium text-gray-700">{label}</span>
                                            <Toggle
                                                label={h.open ? 'Mở cửa' : 'Nghỉ'}
                                                checked={h.open}
                                                onChange={v => patchDay(key, { open: v })}
                                            />
                                            <input
                                                type="time"
                                                disabled={!h.open}
                                                value={h.from}
                                                onChange={e => patchDay(key, { from: e.target.value })}
                                                className="input w-28"
                                            />
                                            <span className="text-gray-400">→</span>
                                            <input
                                                type="time"
                                                disabled={!h.open}
                                                value={h.to}
                                                onChange={e => patchDay(key, { to: e.target.value })}
                                                className="input w-28"
                                            />
                                            {err && <span className="text-xs text-red-600">{err}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </Section>

                        {/* Kho + Nhân sự */}
                        <Section title="Kho trực thuộc" icon={<WarehouseIcon className="w-4 h-4" />}>
                            {warehouses.length === 0 ? (
                                <p className="text-sm italic text-gray-500">Chưa có kho nào để gán</p>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                                    {warehouses.filter(w => w.isActive).map(w => (
                                        <label key={w.id} className="flex items-start gap-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer text-sm">
                                            <input
                                                type="checkbox"
                                                checked={state.warehouseIds.includes(w.id)}
                                                onChange={() => patch('warehouseIds', toggleId(state.warehouseIds, w.id))}
                                            />
                                            <span className="flex-1 min-w-0">
                                                <span className="block font-medium text-gray-800 truncate">{w.name}</span>
                                                <span className="block text-xs text-gray-500">{w.code} · {w.type}</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </Section>

                        <Section title="Nhân sự trực thuộc" icon={<Users className="w-4 h-4" />}>
                            {employees.length === 0 ? (
                                <p className="text-sm italic text-gray-500">Chưa có nhân sự nào để gán</p>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                                    {employees.filter(e => e.status === 'Active').map(emp => (
                                        <label key={emp.id} className="flex items-start gap-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer text-sm">
                                            <input
                                                type="checkbox"
                                                checked={state.employeeIds.includes(emp.id)}
                                                onChange={() => patch('employeeIds', toggleId(state.employeeIds, emp.id))}
                                            />
                                            <span className="flex-1 min-w-0">
                                                <span className="block font-medium text-gray-800 truncate">{emp.fullName}</span>
                                                <span className="block text-xs text-gray-500 truncate">{emp.position}</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </Section>

                        <div className="flex gap-3 pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Huỷ
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 px-4 py-3 bg-[var(--accent-primary,#dc2626)] text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                {editingId ? 'Lưu thay đổi' : 'Tạo chi nhánh'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <style>{`.input{padding:.6rem .75rem;border:1px solid #e5e7eb;border-radius:.5rem;width:100%;font-size:.875rem;outline:none;transition:border-color .15s}.input:focus{border-color:var(--accent-primary,#dc2626)}.input:disabled{background:#f3f4f6;color:#6b7280}`}</style>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Small internal presentational helpers
// ---------------------------------------------------------------------------

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <fieldset className="border border-gray-200 rounded-xl p-4">
            <legend className="px-2 text-sm font-semibold text-gray-700 flex items-center gap-2">
                {icon}
                {title}
            </legend>
            {children}
        </fieldset>
    );
}

function Field({
    label, required, error, children,
}: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="block text-xs font-semibold text-gray-600 mb-1">
                {label}{required && <span className="text-red-500"> *</span>}
            </span>
            {children}
            {error && <span className="block mt-1 text-xs text-red-600">{error}</span>}
        </label>
    );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <span className="relative">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked}
                    onChange={e => onChange(e.target.checked)}
                />
                <span className="block w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-[var(--accent-primary,#dc2626)]" />
                <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
            </span>
            {label}
        </label>
    );
}

// ---------------------------------------------------------------------------
// State mapping
// ---------------------------------------------------------------------------

function mapDetailToState(detail: StoreDetail): FormState {
    const hoursObj = parseOpeningHours(detail.openingHoursJson);
    const hours = { ...DEFAULT_HOURS };
    for (const day of DAY_KEYS) {
        const raw = hoursObj[day];
        if (!raw || raw === 'closed') {
            hours[day] = { open: false, from: '09:00', to: '21:00' };
        } else {
            const [from, to] = raw.split('-').map(s => s.trim());
            if (from && to) hours[day] = { open: true, from, to };
        }
    }
    return {
        code: detail.code,
        name: detail.name,
        phone: detail.phone,
        email: detail.email ?? '',
        address: detail.address,
        ward: detail.ward ?? '',
        district: detail.district ?? '',
        province: detail.province ?? '',
        latitude: detail.latitude != null ? String(detail.latitude) : '',
        longitude: detail.longitude != null ? String(detail.longitude) : '',
        isActive: detail.isActive,
        isPickupPoint: detail.isPickupPoint,
        sortOrder: detail.sortOrder,
        hours,
        warehouseIds: detail.warehouses.map(w => w.warehouseId),
        employeeIds: detail.employees.map(e => e.employeeId),
    };
}

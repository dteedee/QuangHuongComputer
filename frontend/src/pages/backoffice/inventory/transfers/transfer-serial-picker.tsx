/**
 * Pick exactly `quantity` serials (status InStock, in the source warehouse) for a serial-tracked
 * line. The server re-checks every serial at create time AND again at ship time.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../../../api/inventory';
import { Checkbox, Input, Skeleton } from '../../../../components/ui';

interface TransferSerialPickerProps {
    productId: string;
    warehouseId: string;
    quantity: number;
    value: string[];
    onChange: (serials: string[]) => void;
    error?: string;
}

export function TransferSerialPicker({ productId, warehouseId, quantity, value, onChange, error }: TransferSerialPickerProps) {
    const [filter, setFilter] = useState('');
    const serialsQuery = useQuery({
        queryKey: ['inventory', 'serials', 'in-stock', productId, warehouseId],
        queryFn: () => inventoryApi.serials.getList({ productId, warehouseId, status: 'InStock', pageSize: 200 }),
        enabled: Boolean(productId && warehouseId),
    });

    const serials = useMemo(() => {
        const all = serialsQuery.data?.items.map((s) => s.serial) ?? [];
        const q = filter.trim().toLowerCase();
        return q ? all.filter((s) => s.toLowerCase().includes(q)) : all;
    }, [serialsQuery.data, filter]);

    const toggle = (serial: string, checked: boolean) =>
        onChange(checked ? [...value, serial] : value.filter((s) => s !== serial));

    if (serialsQuery.isPending) return <Skeleton className="h-20 w-full" />;
    if (serialsQuery.isError) return <p className="text-13 text-danger">Không tải được danh sách serial.</p>;

    const total = serialsQuery.data?.items.length ?? 0;
    return (
        <fieldset className="rounded-lg border border-line p-3">
            <legend className="px-1 text-13 font-medium text-fg">
                Chọn serial <span className="num">({value.length}/{quantity})</span>
            </legend>
            {total === 0 ? (
                <p className="text-13 text-warning">Kho xuất không còn serial nào của sản phẩm này đang trong kho.</p>
            ) : (
                <>
                    {total > 8 && (
                        <Input
                            aria-label="Lọc serial"
                            placeholder="Lọc theo số serial"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="mb-2"
                        />
                    )}
                    <ul className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                        {serials.map((serial) => {
                            const checked = value.includes(serial);
                            return (
                                <li key={serial}>
                                    <Checkbox
                                        label={<span className="num text-13">{serial}</span>}
                                        checked={checked}
                                        disabled={!checked && value.length >= quantity}
                                        onChange={(e) => toggle(serial, e.target.checked)}
                                    />
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
            {error && <p role="alert" className="mt-2 text-13 text-danger">{error}</p>}
        </fieldset>
    );
}

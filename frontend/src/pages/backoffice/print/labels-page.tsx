import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { labelDataApi, type LabelDataItem } from '../../../api/bulk-tools';
import { Card, CardBody, Button, EmptyState, ErrorState, Skeleton } from '../../../components/ui';
import { PrintPageShell } from '../../../components/print/print-page-shell';
import { LabelSheetA4 } from '../../../components/print/label-sheet-a4';
import { LabelRoll40x30 } from '../../../components/print/label-roll-40x30';
import { LabelPickerPanel } from './label-picker-panel';

type SheetLayout = 'a4-3x8' | 'roll-40x30';

/** Expands each `LabelDataItem` into one entry per physical label — serial-tracked SKUs print
 *  once per serial, others once per item (Implementation Steps #5). */
function expandLabels(items: LabelDataItem[]) {
    const out: { item: LabelDataItem; serial?: string }[] = [];
    for (const item of items) {
        if (item.serials.length > 0) item.serials.forEach((serial) => out.push({ item, serial }));
        else out.push({ item });
    }
    return out;
}

export default function LabelsPage() {
    const [mode, setMode] = useState<'products' | 'grn'>('products');
    const [picked, setPicked] = useState<{ id: string; sku: string; name: string }[]>([]);
    const [grnId, setGrnId] = useState<string | null>(null);
    const [layout, setLayout] = useState<SheetLayout>('a4-3x8');
    const [triggered, setTriggered] = useState(false);

    const skus = picked.map((p) => p.sku);
    const query = useQuery({
        queryKey: ['bulk-tools', 'label-data', mode, skus, grnId],
        queryFn: () => (mode === 'grn' && grnId ? labelDataApi.byGrn(grnId) : labelDataApi.bySkus(skus)),
        enabled: triggered && (mode === 'grn' ? !!grnId : skus.length > 0),
    });

    const canGenerate = mode === 'grn' ? !!grnId : picked.length > 0;
    const labels = query.data ? expandLabels(query.data) : [];

    return (
        <PrintPageShell
            title="In nhãn sản phẩm"
            toolbar={
                <select
                    aria-label="Kiểu bố cục"
                    className="no-print rounded border border-line bg-surface px-2 py-1.5 text-sm"
                    value={layout}
                    onChange={(e) => setLayout(e.target.value as SheetLayout)}
                >
                    <option value="a4-3x8">Tờ A4 3x8</option>
                    <option value="roll-40x30">Cuộn nhiệt 40x30mm</option>
                </select>
            }
        >
            <div className="no-print mx-auto max-w-4xl px-4">
                <Card>
                    <CardBody className="space-y-4">
                        <LabelPickerPanel
                            mode={mode}
                            onModeChange={(m) => { setMode(m); setTriggered(false); }}
                            picked={picked}
                            onPickedChange={(p) => { setPicked(p); setTriggered(false); }}
                            grnId={grnId}
                            onGrnIdChange={(id) => { setGrnId(id); setTriggered(false); }}
                        />
                        <Button disabled={!canGenerate} onClick={() => setTriggered(true)}>
                            Xem trước nhãn
                        </Button>
                    </CardBody>
                </Card>

                <div className="mt-4">
                    {query.isPending && triggered && <Skeleton className="h-40 w-full" />}
                    {query.isError && (
                        <ErrorState
                            description="Không tải được dữ liệu nhãn."
                            onRetry={() => query.refetch()}
                        />
                    )}
                    {triggered && query.data && labels.length === 0 && (
                        <EmptyState title="Không có nhãn nào" description="Không có serial hoặc sản phẩm khớp lựa chọn." />
                    )}
                </div>
            </div>

            {labels.length > 0 && (
                layout === 'a4-3x8' ? <LabelSheetA4 labels={labels} /> : <LabelRoll40x30 labels={labels} />
            )}
        </PrintPageShell>
    );
}

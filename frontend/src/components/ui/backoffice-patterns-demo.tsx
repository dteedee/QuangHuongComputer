/**
 * BackofficePatternsDemo — KHUÔN MẪU chuẩn của một trang back office, để 6 track chuyển
 * 170 trang copy đúng một lần rồi thôi. Đây là trang mẫu "soi được", không phải thư viện:
 * mọi thứ bên trong đều là primitive có sẵn của `components/ui`.
 *
 * Nằm ở `components/ui/` chứ không nhét thêm vào `pages/dev/kitchen-sink*` vì thư mục
 * `pages/` không thuộc quyền sửa của track này — xem báo cáo
 * `plans/reports/uiux-260920-1305-vo-backoffice.md`, mục "Câu hỏi chưa giải quyết".
 * Chủ của `pages/dev/kitchen-sink-page.tsx` chỉ cần thêm một mục:
 *   { id: 'backoffice', label: 'Back office', node: <BackofficePatternsDemo /> }
 *
 * Bốn thứ bắt buộc thuộc lòng (design-guidelines §9.3 + §9.4):
 *   1. `PageHeader` — mọi trang, tiêu đề + mô tả MỘT dòng + khe hành động phải.
 *   2. `DataTable` — mọi danh sách. Không tự viết `<table>`.
 *   3. `SaveButton` — mọi form. Bốn trạng thái, "Đã lưu" không phải nút.
 *   4. `StatusBadge` — mọi trạng thái nghiệp vụ. Không tự chọn màu.
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from './page-header';
import { DataTable } from './data-table';
import { Pagination } from './pagination';
import { StatusBadge } from './status-badge';
import { SaveButton, type SaveStatus } from './save-button';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { Card } from './card';
import { formatDong } from './kit-utils';
import type { DataTableColumn, SortState } from './data-table-types';

interface DemoRow {
    id: string;
    code: string;
    customer: string;
    total: number;
    status: 'pending' | 'done' | 'cancelled';
}

const DEMO_ROWS: DemoRow[] = [
    { id: '1', code: 'DH-2601', customer: 'Nguyễn Văn Được', total: 24990000, status: 'pending' },
    { id: '2', code: 'DH-2602', customer: 'Trần Thị Hường', total: 8450000, status: 'done' },
    { id: '3', code: 'DH-2603', customer: 'Lê Quang Đạt', total: 1290000, status: 'cancelled' },
];

/** Enum backend -> [tone, nhãn tiếng Việt]. Khai báo MỘT lần cho mỗi nghiệp vụ. */
const STATUS: Record<DemoRow['status'], { tone: 'warning' | 'success' | 'neutral'; label: string }> = {
    pending: { tone: 'warning', label: 'Chờ xử lý' },
    done: { tone: 'success', label: 'Hoàn tất' },
    cancelled: { tone: 'neutral', label: 'Đã huỷ' },
};

export const BackofficePatternsDemo = () => {
    const [sort, setSort] = useState<SortState | null>({ id: 'code', dir: 'asc' });
    const [selected, setSelected] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

    const columns: DataTableColumn<DemoRow>[] = [
        { id: 'code', header: 'Mã đơn', sortable: true, cell: r => <span className="num font-medium">{r.code}</span> },
        { id: 'customer', header: 'Khách hàng', cell: r => r.customer },
        {
            id: 'total', header: 'Thành tiền', align: 'right', sortable: true,
            /* §9.6: mọi con số tiền phải có đơn vị. */
            cell: r => <span className="num">{formatDong(r.total)} ₫</span>,
        },
        {
            id: 'status', header: 'Trạng thái', align: 'center',
            cell: r => <StatusBadge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</StatusBadge>,
        },
    ];

    /* Giả lập một lần lưu: rảnh -> đang lưu -> đã lưu -> (tự hết) rảnh. */
    const fakeSave = () => {
        setSaveStatus('saving');
        window.setTimeout(() => setSaveStatus('saved'), 900);
    };

    return (
        <div className="space-y-4">
            {/* 1 — PageHeader khuôn admin */}
            <PageHeader
                density="compact"
                title="Đơn hàng"
                description="Danh sách đơn bán lẻ. Mô tả đúng một dòng, dài thì cắt."
                actions={
                    <>
                        <Button variant="outline" size="sm">Xuất Excel</Button>
                        {/* Mỗi màn TỐI ĐA một nút đỏ (§9.1). */}
                        <Button size="sm" icon={Plus}>Tạo đơn</Button>
                    </>
                }
            />

            {/* 2 — DataTable gọn: sắp xếp, chọn, phân trang, rỗng/lỗi/khung xương lo sẵn */}
            <Card padded radius="xl">
                <DataTable
                    density="compact"
                    caption="Danh sách đơn hàng mẫu"
                    columns={columns}
                    rows={DEMO_ROWS}
                    rowKey={r => r.id}
                    sort={sort}
                    onSortChange={setSort}
                    selectedIds={selected}
                    onSelectionChange={setSelected}
                    enableColumnVisibility
                    empty={{ title: 'Chưa có đơn nào', description: 'Đơn mới sẽ hiện ở đây.' }}
                    bulkActions={ids => (
                        <Button size="sm" variant="outline">Xoá {ids.length} đơn</Button>
                    )}
                    pagination={
                        <Pagination
                            page={page}
                            pageSize={20}
                            total={DEMO_ROWS.length}
                            onPageChange={setPage}
                        />
                    }
                />
            </Card>

            {/* 3 — Form gọn + nút lưu 4 trạng thái */}
            <Card padded radius="xl">
                <h3 className="mb-3 text-13 font-semibold uppercase tracking-wider text-fg-subtle">
                    Thông tin đơn
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Input label="Mã đơn" defaultValue="DH-2601" inputSize="md" />
                    <Select
                        label="Trạng thái"
                        defaultValue="pending"
                        options={[
                            { value: 'pending', label: 'Chờ xử lý' },
                            { value: 'done', label: 'Hoàn tất' },
                            { value: 'cancelled', label: 'Đã huỷ' },
                        ]}
                    />
                    {/* §9.6: đường dẫn/URL dùng ô rộng hết hàng, không cắt cụt. */}
                    <Input
                        label="Đường dẫn theo dõi"
                        className="sm:col-span-2"
                        defaultValue="https://quanghuong.vn/theo-doi-don-hang/DH-2601"
                    />
                </div>

                <div className="mt-4 flex items-center justify-end gap-3 border-t border-line pt-3">
                    <Button variant="ghost" size="sm">Huỷ</Button>
                    <SaveButton
                        size="sm"
                        status={saveStatus}
                        errorMessage="Không lưu được, thử lại."
                        onClick={fakeSave}
                        onDone={() => setSaveStatus('idle')}
                    />
                    {/* Thử trạng thái lỗi. */}
                    <Button variant="dashed" size="sm" onClick={() => setSaveStatus('error')}>
                        Giả lập lỗi
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default BackofficePatternsDemo;

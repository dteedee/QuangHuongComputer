/**
 * Quản lý khuyến mãi — viết lại giao diện theo design-guidelines §9.
 *  · `<table>` tự viết → `DataTable` của bộ UI kit (§9.3): sắp xếp, rỗng, lỗi, khung xương lo sẵn.
 *  · Trạng thái dùng `StatusBadge` thay cho bảng màu `bg-green-100/...` tự chế (§9.1).
 *  · Token thay hết `gray-*` / `bg-white`; tiêu đề `text-xl` qua `PageHeader` (§9.2).
 *  · Mỗi màn TỐI ĐA một nút đỏ — ở đây là "Tạo khuyến mãi".
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, RefreshCw, Play, Pause, BarChart3, Ticket, Filter, Archive, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  promotionsApi,
  formatDiscount,
  promotionStatusLabel,
  promotionTypeLabel,
  type Promotion,
  type PromotionListFilter,
  type PromotionStatus,
  type PromotionType,
} from '../../api/promotions';
import { PromotionWizard } from '../../components/admin/promotion-wizard';
import { PromotionEffectivenessReport } from '../../components/admin/promotion-effectiveness-report';
import {
  Button, Card, ConfirmDialog, DataTable, IconButton, Input, PageHeader, Select, StatusBadge,
  Tab, TabList, Tabs, type DataTableColumn, type StatusTone,
} from '../../components/ui';

type TabKey = 'list' | 'report';

/** Enum backend → tone của `StatusBadge`. Khai báo MỘT lần (§9.1). */
const STATUS_TONE: Record<PromotionStatus, StatusTone> = {
  Draft: 'neutral',
  Active: 'success',
  Paused: 'warning',
  Expired: 'danger',
};

export default function PromotionsPage() {
  const [params, setParams] = useSearchParams();
  const filterType = (params.get('type') as PromotionType | null) ?? undefined;
  const [statusFilter, setStatusFilter] = useState<PromotionStatus | ''>('');
  const [storeFilter, setStoreFilter] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabKey>('list');

  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [selectedReport, setSelectedReport] = useState<Promotion | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ promotion: Promotion; action: 'archive' | 'delete' } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const filter: PromotionListFilter = useMemo(() => ({
    type: filterType,
    status: statusFilter || undefined,
    storeId: storeFilter || undefined,
  }), [filterType, statusFilter, storeFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await promotionsApi.list(filter);
      setItems(data ?? []);
      setLoadError(null);
    } catch (e) {
      setLoadError(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, statusFilter, storeFilter]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((p) => p.name.toLowerCase().includes(q) || (p.code?.toLowerCase().includes(q) ?? false));
  }, [items, search]);

  const closeWizard = (reload: boolean) => {
    setWizardOpen(false);
    setEditing(null);
    if (reload) void load();
  };

  const openCreate = () => { setEditing(null); setWizardOpen(true); };

  const doActivate = async (p: Promotion) => {
    try { await promotionsApi.activate(p.id); toast.success('Đã kích hoạt'); void load(); }
    catch { toast.error('Không kích hoạt được'); }
  };
  const doPause = async (p: Promotion) => {
    try { await promotionsApi.pause(p.id); toast.success('Đã tạm dừng'); void load(); }
    catch { toast.error('Không tạm dừng được'); }
  };

  const confirmArchiveOrDelete = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      if (confirmTarget.action === 'archive') {
        await promotionsApi.archive(confirmTarget.promotion.id);
        toast.success('Đã lưu trữ khuyến mãi');
      } else {
        await promotionsApi.remove(confirmTarget.promotion.id);
        toast.success('Đã xoá khuyến mãi');
      }
      setConfirmTarget(null);
      void load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (confirmTarget.action === 'archive'
          ? 'Không lưu trữ được — khuyến mãi đã có lượt dùng, hãy Tạm dừng thay thế.'
          : 'Không xoá được — khuyến mãi đã có lượt dùng, hãy Lưu trữ thay thế.');
      toast.error(msg);
    } finally {
      setConfirmLoading(false);
    }
  };

  const changeType = (t: PromotionType | '') => {
    const next = new URLSearchParams(params);
    if (t) next.set('type', t); else next.delete('type');
    setParams(next, { replace: true });
  };

  const columns: DataTableColumn<Promotion>[] = [
    {
      id: 'name', header: 'Tên / Mã', locked: true,
      cell: (p) => (
        <button type="button" onClick={() => { setEditing(p); setWizardOpen(true); }} className="text-left">
          <span className="block font-medium text-fg">{p.name}</span>
          {p.code && <code className="mt-0.5 block font-mono text-2xs text-fg-subtle">{p.code}</code>}
        </button>
      ),
    },
    { id: 'type', header: 'Loại', cell: (p) => promotionTypeLabel[p.type] },
    { id: 'discount', header: 'Giảm', nowrap: true, cell: (p) => <span className="font-medium text-brand-text">{formatDiscount(p)}</span> },
    {
      id: 'status', header: 'Trạng thái', align: 'center',
      cell: (p) => <StatusBadge tone={STATUS_TONE[p.status]}>{promotionStatusLabel[p.status]}</StatusBadge>,
    },
    { id: 'priority', header: 'Ưu tiên', align: 'right', cell: (p) => <span className="num">{p.priority}</span> },
    {
      id: 'usage', header: 'Sử dụng', align: 'right',
      cell: (p) => <span className="num">{p.currentUsage}{p.maxTotalUsage ? ` / ${p.maxTotalUsage}` : ''}</span>,
    },
    {
      id: 'period', header: 'Hiệu lực', nowrap: true,
      cell: (p) => (
        <span className="text-2xs text-fg-muted">
          {new Date(p.startAt).toLocaleDateString('vi-VN')}
          {p.endAt && <> → {new Date(p.endAt).toLocaleDateString('vi-VN')}</>}
        </span>
      ),
    },
    {
      id: 'actions', header: 'Thao tác', align: 'right', width: '1%', locked: true,
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          {p.status === 'Active' ? (
            <IconButton aria-label="Tạm dừng" title="Tạm dừng" variant="ghost" size="sm" onClick={() => doPause(p)}>
              <Pause className="h-4 w-4" />
            </IconButton>
          ) : (
            <IconButton aria-label="Kích hoạt" title="Kích hoạt" variant="ghost" size="sm" onClick={() => doActivate(p)}>
              <Play className="h-4 w-4" />
            </IconButton>
          )}
          <IconButton aria-label="Báo cáo hiệu quả" title="Báo cáo hiệu quả" variant="ghost" size="sm" onClick={() => { setSelectedReport(p); setTab('report'); }}>
            <BarChart3 className="h-4 w-4" />
          </IconButton>
          <IconButton aria-label="Lưu trữ" title="Lưu trữ" variant="ghost" size="sm" onClick={() => setConfirmTarget({ promotion: p, action: 'archive' })}>
            <Archive className="h-4 w-4" />
          </IconButton>
          <IconButton aria-label="Xoá" title="Xoá" variant="ghost" size="sm" onClick={() => setConfirmTarget({ promotion: p, action: 'delete' })}>
            <Trash2 className="h-4 w-4 text-danger" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Khuyến mãi"
        description="Mã nhập tay, khuyến mãi tự động và Flash Sale — thay thế Coupons + Flash Sales cũ."
        actions={
          <>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => void load()}>Làm mới</Button>
            {/* Nút đỏ DUY NHẤT của màn hình (§9.1). */}
            <Button size="sm" icon={Plus} onClick={openCreate}>Tạo khuyến mãi</Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabList aria-label="Chế độ xem khuyến mãi">
          <Tab value="list">Danh sách</Tab>
          <Tab value="report" disabled={!selectedReport}>Báo cáo hiệu quả</Tab>
        </TabList>
      </Tabs>

      {tab === 'list' && (
        <>
          <Card padded radius="xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="min-w-0 flex-1">
                <Input
                  label="Tìm kiếm"
                  icon={Search}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên hoặc mã…"
                />
              </div>
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <Select
                  label="Loại"
                  value={filterType ?? ''}
                  onChange={(e) => changeType(e.target.value as PromotionType | '')}
                  options={[
                    { value: '', label: 'Tất cả loại' },
                    { value: 'Code', label: 'Mã nhập tay' },
                    { value: 'Automatic', label: 'Tự động' },
                    { value: 'FlashSale', label: 'Flash Sale' },
                  ]}
                />
                <Select
                  label="Trạng thái"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as PromotionStatus | '')}
                  options={[
                    { value: '', label: 'Tất cả trạng thái' },
                    { value: 'Draft', label: 'Nháp' },
                    { value: 'Active', label: 'Đang chạy' },
                    { value: 'Paused', label: 'Tạm dừng' },
                    { value: 'Expired', label: 'Hết hạn' },
                  ]}
                />
                <Input
                  label="Chi nhánh"
                  icon={Filter}
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  placeholder="Mã chi nhánh…"
                />
              </div>
            </div>
          </Card>

          <Card padded radius="xl">
            <DataTable
              caption="Danh sách khuyến mãi"
              columns={columns}
              rows={loading ? undefined : filtered}
              rowKey={(p) => p.id}
              loading={loading}
              error={loadError}
              onRetry={() => void load()}
              enableColumnVisibility
              empty={{
                icon: Ticket,
                title: 'Chưa có khuyến mãi nào',
                description: 'Tạo khuyến mãi đầu tiên để áp dụng cho đơn hàng.',
                action: { label: 'Tạo khuyến mãi', onClick: openCreate, icon: Plus },
              }}
            />
          </Card>
        </>
      )}

      {tab === 'report' && selectedReport && (
        <div className="space-y-3">
          <Button variant="ghost" size="sm" onClick={() => setTab('list')}>← Quay lại danh sách</Button>
          <h2 className="text-13 font-semibold uppercase tracking-wider text-fg-subtle">
            Báo cáo: {selectedReport.name}
          </h2>
          <PromotionEffectivenessReport promotion={selectedReport} />
        </div>
      )}

      {wizardOpen && (
        <PromotionWizard
          initial={editing}
          defaultType={filterType}
          onClose={() => closeWizard(false)}
          onSaved={() => closeWizard(true)}
        />
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => { if (!open) setConfirmTarget(null); }}
        title={confirmTarget?.action === 'archive' ? 'Lưu trữ khuyến mãi?' : 'Xoá khuyến mãi?'}
        description={
          confirmTarget?.action === 'archive'
            ? `"${confirmTarget?.promotion.name}" sẽ chuyển sang Hết hạn và không thể kích hoạt lại. Nếu đã có lượt dùng, dùng Tạm dừng thay thế.`
            : `Xoá vĩnh viễn "${confirmTarget?.promotion.name}". Không thể hoàn tác. Nếu đã có lượt dùng, hệ thống sẽ báo lỗi — dùng Lưu trữ thay thế.`
        }
        confirmLabel={confirmTarget?.action === 'archive' ? 'Lưu trữ' : 'Xoá'}
        tone="danger"
        loading={confirmLoading}
        onConfirm={() => void confirmArchiveOrDelete()}
      />
    </div>
  );
}

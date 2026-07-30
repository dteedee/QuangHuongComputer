import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, RefreshCw, Play, Pause, BarChart3, Ticket, X, Filter } from 'lucide-react';
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

type Tab = 'list' | 'report';

const STATUS_STYLE: Record<PromotionStatus, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Active: 'bg-green-100 text-green-700',
  Paused: 'bg-amber-100 text-amber-700',
  Expired: 'bg-red-100 text-red-700',
};

export default function PromotionsPage() {
  const [params, setParams] = useSearchParams();
  const filterType = (params.get('type') as PromotionType | null) ?? undefined;
  const [statusFilter, setStatusFilter] = useState<PromotionStatus | ''>('');
  const [storeFilter, setStoreFilter] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('list');

  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [selectedReport, setSelectedReport] = useState<Promotion | null>(null);

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
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Không tải được danh sách promotion — backend chưa sẵn sàng?';
      toast.error(msg);
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
  const openEdit = (p: Promotion) => { setEditing(p); setWizardOpen(true); };

  const doActivate = async (p: Promotion) => {
    try { await promotionsApi.activate(p.id); toast.success('Đã kích hoạt'); void load(); }
    catch { toast.error('Không kích hoạt được'); }
  };
  const doPause = async (p: Promotion) => {
    try { await promotionsApi.pause(p.id); toast.success('Đã tạm dừng'); void load(); }
    catch { toast.error('Không tạm dừng được'); }
  };

  const changeType = (t: PromotionType | '') => {
    const next = new URLSearchParams(params);
    if (t) next.set('type', t); else next.delete('type');
    setParams(next, { replace: true });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket className="w-7 h-7 text-accent" /> Quản lý Khuyến mãi
          </h1>
          <p className="text-sm text-gray-500">
            Mã nhập tay, khuyến mãi tự động và Flash Sale — thay thế Coupons + Flash Sales cũ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Làm mới
          </button>
          <button onClick={openCreate} className="flex items-center gap-1 px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover">
            <Plus className="w-4 h-4" /> Tạo Promotion
          </button>
        </div>
      </header>

      <div className="flex items-center gap-1 border-b border-gray-200">
        <TabButton active={tab === 'list'} onClick={() => setTab('list')}>Danh sách</TabButton>
        <TabButton active={tab === 'report'} onClick={() => setTab('report')} disabled={!selectedReport}>
          <span className="flex items-center gap-1"><BarChart3 className="w-4 h-4" /> Báo cáo hiệu quả</span>
        </TabButton>
      </div>

      {tab === 'list' && (
        <>
          <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên hoặc mã..."
                className="w-full pl-10 pr-9 py-2 border rounded-lg text-sm focus:outline-none focus:border-accent"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-gray-400" />
              <select value={filterType ?? ''} onChange={(e) => changeType(e.target.value as PromotionType | '')} className="px-3 py-2 border rounded-lg text-sm">
                <option value="">Tất cả loại</option>
                <option value="Code">Mã nhập tay</option>
                <option value="Automatic">Tự động</option>
                <option value="FlashSale">Flash Sale</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter((e.target.value as PromotionStatus | ''))} className="px-3 py-2 border rounded-lg text-sm">
                <option value="">Tất cả trạng thái</option>
                <option value="Draft">Nháp</option>
                <option value="Active">Đang chạy</option>
                <option value="Paused">Tạm dừng</option>
                <option value="Expired">Hết hạn</option>
              </select>
              <input value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} placeholder="Store ID..."
                className="px-3 py-2 border rounded-lg text-sm w-40" />
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-sm text-gray-500">Đang tải...</div>
            ) : filtered.length === 0 ? (
              <EmptyState onCreate={openCreate} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs uppercase text-gray-500">
                      <Th>Tên / Mã</Th>
                      <Th>Loại</Th>
                      <Th>Giảm</Th>
                      <Th>Trạng thái</Th>
                      <Th>Ưu tiên</Th>
                      <Th>Sử dụng</Th>
                      <Th>Hiệu lực</Th>
                      <Th className="text-right">Thao tác</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <button onClick={() => openEdit(p)} className="text-left">
                            <div className="font-semibold text-gray-900">{p.name}</div>
                            {p.code && <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{p.code}</code>}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{promotionTypeLabel[p.type]}</td>
                        <td className="px-4 py-3 text-red-600 font-medium">{formatDiscount(p)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[p.status]}`}>
                            {promotionStatusLabel[p.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{p.priority}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {p.currentUsage}{p.maxTotalUsage ? ` / ${p.maxTotalUsage}` : ''}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {new Date(p.startAt).toLocaleDateString('vi-VN')}
                          {p.endAt && <> → {new Date(p.endAt).toLocaleDateString('vi-VN')}</>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {p.status === 'Active' ? (
                              <IconBtn onClick={() => doPause(p)} title="Tạm dừng"><Pause className="w-4 h-4" /></IconBtn>
                            ) : (
                              <IconBtn onClick={() => doActivate(p)} title="Kích hoạt"><Play className="w-4 h-4" /></IconBtn>
                            )}
                            <IconBtn onClick={() => { setSelectedReport(p); setTab('report'); }} title="Báo cáo">
                              <BarChart3 className="w-4 h-4" />
                            </IconBtn>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'report' && selectedReport && (
        <div className="space-y-4">
          <button onClick={() => setTab('list')} className="text-sm text-gray-500 hover:text-accent">
            ← Quay lại danh sách
          </button>
          <h2 className="text-lg font-bold text-gray-900">Báo cáo: {selectedReport.name}</h2>
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
    </div>
  );
}

function TabButton({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-800'
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-semibold ${className}`}>{children}</th>;
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title} className="p-1.5 text-gray-500 hover:text-accent hover:bg-accent/10 rounded-lg">
      {children}
    </button>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="p-10 text-center">
      <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-500 mb-3">Chưa có promotion nào.</p>
      <button onClick={onCreate} className="inline-flex items-center gap-1 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover">
        <Plus className="w-4 h-4" /> Tạo promotion đầu tiên
      </button>
      <div className="mt-3">
        <Link to="/backoffice/flash-sales" className="text-xs text-gray-400 hover:underline">
          (Trang Flash Sales cũ)
        </Link>
      </div>
    </div>
  );
}

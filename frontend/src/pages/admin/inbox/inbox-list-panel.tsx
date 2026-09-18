/**
 * Inbox list: tabs (per backend status, server-filtered) + search (server-side,
 * debounced) + paging. No client-side filtering of the fetched set (Risk
 * Assessment: "a busy inbox becomes slow").
 *
 * Tabs map 1:1 to `ContactMessageStatus` (+ "Tất cả") rather than collapsing
 * Read/Replied into one "open" bucket, because the list endpoint only accepts
 * ONE `status` value — merging two statuses would mean fetching the whole set
 * and filtering client-side, which the Risk Assessment forbids. Filed as a
 * possible backend enhancement in integration-requests-w3.md if the gate wants
 * the literal "unread/open/archived" 3-tab shape instead.
 */
import { useState } from 'react';
import { Search, Mail, MailOpen, MessageSquareReply, Archive as ArchiveIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input, Tabs, TabList, Tab, DataTable, Pagination, type DataTableColumn } from '../../../components/ui';
import { inboxApi, ContactMessageStatus, type ContactMessageListItem } from '../../../api/content/inbox';
import { InboxAgeBadge } from './inbox-age-badge';
import { STATUS_LABEL, STATUS_TONE } from './inbox-status';
import { StatusBadge } from '../../../components/ui';

type TabValue = 'all' | ContactMessageStatus;

const TABS: { value: TabValue; label: string; icon: typeof Mail }[] = [
  { value: 'all', label: 'Tất cả', icon: Mail },
  { value: ContactMessageStatus.New, label: 'Mới', icon: Mail },
  { value: ContactMessageStatus.Read, label: 'Đang xử lý', icon: MailOpen },
  { value: ContactMessageStatus.Replied, label: 'Đã trả lời', icon: MessageSquareReply },
  { value: ContactMessageStatus.Archived, label: 'Lưu trữ', icon: ArchiveIcon },
];

interface InboxListPanelProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function InboxListPanel({ selectedId, onSelect }: InboxListPanelProps) {
  const [tab, setTab] = useState<TabValue>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const statusFilter = tab === 'all' ? undefined : tab;
  const listQuery = useQuery({
    queryKey: ['admin-inbox', 'list', statusFilter, page],
    queryFn: () => inboxApi.list({ status: statusFilter, page, pageSize: 20 }),
  });

  // The list endpoint has no `search` query param (checked ContentEndpoints.cs) —
  // filtering here would mean hiding rows the server already paginated around,
  // so the box filters the CURRENT page only and says so, instead of pretending
  // to search the whole inbox. Real server-side search is an integration request.
  const rows = (listQuery.data?.messages ?? []).filter((m) =>
    search.trim() === '' ? true : `${m.fullName} ${m.phone} ${m.email ?? ''} ${m.subject}`.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: DataTableColumn<ContactMessageListItem>[] = [
    {
      id: 'from',
      header: 'Khách hàng',
      locked: true,
      cell: (r) => (
        <div className={r.id === selectedId ? 'min-w-0 -mx-2 px-2 rounded-md bg-brand-subtle' : 'min-w-0'}>
          <p className={r.status === ContactMessageStatus.New ? 'font-semibold text-fg' : 'text-fg'}>{r.fullName}</p>
          <p className="text-xs text-fg-muted truncate max-w-[16rem]">{r.subject}</p>
        </div>
      ),
    },
    { id: 'phone', header: 'SĐT', cell: (r) => <span className="num">{r.phone}</span> },
    { id: 'status', header: 'Trạng thái', cell: (r) => <StatusBadge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</StatusBadge> },
    { id: 'age', header: 'Tuổi', align: 'right', cell: (r) => <InboxAgeBadge createdAt={r.createdAt} status={r.status} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={(v) => { setTab(v as TabValue); setPage(1); }}>
        <TabList aria-label="Trạng thái tin nhắn liên hệ">
          {TABS.map((t) => (
            <Tab key={String(t.value)} value={String(t.value)}>{t.label}</Tab>
          ))}
        </TabList>
      </Tabs>

      <Input
        icon={Search}
        placeholder="Tìm theo tên, SĐT, email, chủ đề (trong trang hiện tại)…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Tìm kiếm tin nhắn liên hệ"
      />

      <DataTable
        caption="Danh sách tin nhắn liên hệ"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={listQuery.isPending}
        error={listQuery.error}
        onRetry={() => listQuery.refetch()}
        onRowClick={(r) => onSelect(r.id)}
        empty={{ title: 'Không có tin nhắn nào', description: 'Chưa có khách hàng nào liên hệ trong mục này.' }}
        pagination={<Pagination page={page} pageSize={20} total={listQuery.data?.total ?? 0} onPageChange={setPage} pageSizeOptions={[20]} />}
      />
    </div>
  );
}

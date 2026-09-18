/**
 * Detail pane: message + customer info, append-only notes/reply thread,
 * archive/delete. See `api/content/inbox.ts` header for the two real backend
 * gaps this works around honestly: no e-mail is actually sent, and the
 * server field is overwrite-not-append (worked around client-side).
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Phone, Trash2, Archive as ArchiveIcon, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Drawer, Button, Textarea, Skeleton, SkeletonText, ErrorState, StatusBadge, ConfirmDialog,
} from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { inboxApi, appendNoteEntry, ContactMessageStatus } from '../../../api/content/inbox';
import { STATUS_LABEL, STATUS_TONE } from './inbox-status';
import { InboxAgeBadge } from './inbox-age-badge';

interface InboxDetailPanelProps {
  messageId: string | null;
  onClose: () => void;
}

export function InboxDetailPanel({ messageId, onClose }: InboxDetailPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['admin-inbox', 'detail', messageId],
    queryFn: () => inboxApi.get(messageId as string),
    enabled: !!messageId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-inbox'] });
  };

  const markReadMutation = useMutation({
    mutationFn: () => inboxApi.markRead(messageId as string),
    onSuccess: invalidate,
  });

  const replyMutation = useMutation({
    mutationFn: () => {
      const author = user?.fullName ?? 'Admin';
      const thread = appendNoteEntry(detailQuery.data?.adminNotes ?? null, { kind: 'Trả lời', author, text: replyText.trim() });
      return inboxApi.reply(messageId as string, thread);
    },
    onSuccess: () => {
      setReplyText('');
      invalidate();
      toast.success('Đã ghi nhận trả lời. Hệ thống CHƯA tự gửi email — vui lòng liên hệ khách qua điện thoại/email trực tiếp.', { duration: 6000 });
    },
    onError: () => toast.error('Gửi trả lời thất bại, thử lại.'),
  });

  const noteMutation = useMutation({
    mutationFn: () => {
      const author = user?.fullName ?? 'Admin';
      const thread = appendNoteEntry(detailQuery.data?.adminNotes ?? null, { kind: 'Ghi chú', author, text: noteText.trim() });
      return inboxApi.addNote(messageId as string, thread);
    },
    onSuccess: () => { setNoteText(''); invalidate(); toast.success('Đã thêm ghi chú'); },
    onError: () => toast.error('Thêm ghi chú thất bại, thử lại.'),
  });

  const archiveMutation = useMutation({
    mutationFn: () => inboxApi.archive(messageId as string),
    onSuccess: () => { invalidate(); onClose(); toast.success('Đã lưu trữ tin nhắn'); },
    onError: () => toast.error('Lưu trữ thất bại, thử lại.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => inboxApi.remove(messageId as string),
    onSuccess: () => { invalidate(); setConfirmDelete(false); onClose(); toast.success('Đã xoá tin nhắn'); },
    onError: () => { setConfirmDelete(false); toast.error('Xoá thất bại, thử lại.'); },
  });

  const message = detailQuery.data;

  return (
    <Drawer open={!!messageId} onOpenChange={(o) => !o && onClose()} title={message ? message.subject : 'Tin nhắn liên hệ'} side="right">
      {!message && detailQuery.isPending && (
        <div className="space-y-3 p-1">
          <Skeleton className="h-6 w-2/3" />
          <SkeletonText lines={4} />
        </div>
      )}
      {detailQuery.isError && <ErrorState error={detailQuery.error} onRetry={() => detailQuery.refetch()} />}

      {message && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge tone={STATUS_TONE[message.status]}>{STATUS_LABEL[message.status]}</StatusBadge>
            <InboxAgeBadge createdAt={message.createdAt} status={message.status} />
            {message.status === ContactMessageStatus.New && (
              <Button size="sm" variant="ghost" onClick={() => markReadMutation.mutate()} loading={markReadMutation.isPending}>
                Đánh dấu đã đọc
              </Button>
            )}
          </div>

          <section className="space-y-1">
            <p className="font-semibold text-fg">{message.fullName}</p>
            <p className="flex items-center gap-1.5 text-sm text-fg-muted"><Phone size={14} /> {message.phone}</p>
            {message.email && <p className="flex items-center gap-1.5 text-sm text-fg-muted"><Mail size={14} /> {message.email}</p>}
          </section>

          <section className="rounded-xl border border-line bg-surface p-4 text-sm whitespace-pre-wrap">{message.message}</section>

          <section className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-subtle p-3 text-xs text-fg-muted">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
            <span>Hệ thống ghi nhận trả lời vào đây, nhưng KHÔNG tự gửi email cho khách (backend chưa nối đường gửi email cho luồng này). Hãy chủ động gọi hoặc email khách.</span>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-fg">Ghi chú &amp; trả lời</h3>
            <div className="rounded-xl border border-line bg-surface p-3 text-sm whitespace-pre-wrap min-h-[3rem] max-h-64 overflow-y-auto">
              {message.adminNotes && message.adminNotes.trim().length > 0 ? message.adminNotes : <span className="text-fg-subtle">Chưa có ghi chú nào.</span>}
            </div>
          </section>

          <section className="space-y-2">
            <Textarea label="Soạn trả lời cho khách" rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)} hint="Ghi vào hệ thống + đánh dấu Đã trả lời — không gửi email tự động." />
            <Button size="sm" onClick={() => replyMutation.mutate()} disabled={!replyText.trim()} loading={replyMutation.isPending}>Ghi nhận trả lời</Button>
          </section>

          <section className="space-y-2">
            <Textarea label="Ghi chú nội bộ" rows={2} value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            <Button size="sm" variant="outline" onClick={() => noteMutation.mutate()} disabled={!noteText.trim()} loading={noteMutation.isPending}>Thêm ghi chú</Button>
          </section>

          <div className="flex items-center gap-2 pt-2 border-t border-line">
            {message.status !== ContactMessageStatus.Archived && (
              <Button size="sm" variant="outline" onClick={() => archiveMutation.mutate()} loading={archiveMutation.isPending}>
                <ArchiveIcon size={14} className="mr-1.5" /> Lưu trữ
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} className="mr-1.5" /> Xoá
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Xoá tin nhắn liên hệ?"
        description="Đây là dữ liệu cá nhân của khách — xoá thật, không thể hoàn tác."
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        tone="danger"
      />
    </Drawer>
  );
}

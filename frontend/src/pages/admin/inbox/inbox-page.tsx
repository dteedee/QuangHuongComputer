/**
 * Admin contact inbox (W3-18). The contact form has written to
 * `content.contact_messages` since W1-10 with nowhere for staff to read it —
 * this page is the missing other half. Permission: `Content.ManageContacts`
 * (route-level gate — see `routes/admin-inbox.routes.ts`; the backend admin
 * group is currently still `Content.ManagePages`, a real mismatch filed as an
 * integration request).
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '../../../components/ui';
import { fadeUpAdmin } from '../../../design-system/motion';
import { InboxListPanel } from './inbox-list-panel';
import { InboxDetailPanel } from './inbox-detail-panel';

export default function InboxPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <motion.div variants={fadeUpAdmin} initial="hidden" animate="show" className="space-y-4 pb-8">
      <PageHeader
        title="Hộp thư liên hệ"
        description="Tin nhắn từ form liên hệ trên website — xác nhận tiếp nhận trong 03 ngày làm việc (Luật BVQLNTD 19/2023 Đ.31)."
      />
      <InboxListPanel selectedId={selectedId} onSelect={setSelectedId} />
      <InboxDetailPanel messageId={selectedId} onClose={() => setSelectedId(null)} />
    </motion.div>
  );
}

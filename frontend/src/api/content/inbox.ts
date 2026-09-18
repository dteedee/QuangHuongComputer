/**
 * Contact inbox — admin client for `/api/content/admin/contact-messages/*`
 * (backend: `Content/ContentEndpoints.cs`, W3-18 carve-out; a deliberately
 * NEW file per D10 so nothing here couples to W3-11's `api/content/{admin,types}.ts`).
 *
 * Two real backend gaps, kept honest here rather than papered over (D12 rule 7):
 *  1. The reply endpoint (`POST /{id}/reply`) has NO reply-body field and never
 *     sends an e-mail — it only flips status to Replied and can set `AdminNotes`.
 *     There is no wired e-mail-send path reachable from the admin API (checked
 *     `docs/api-contracts/communication-ai.md` — `IEmailSender` is event-driven,
 *     backend-internal only). See integration-requests-w3.md.
 *  2. `AddNotes`/`MarkAsReplied` OVERWRITE `AdminNotes`, they do not append — so
 *     there is no real thread on the server. `appendNoteEntry` below builds an
 *     append-only text block client-side and sends the WHOLE accumulated string
 *     back as `notes`, so what is stored is real (not fabricated), just composed
 *     on this side instead of the server's.
 */
import { client } from '../client';

/** Wire value is the STRING enum name — `JsonStringEnumConverter` IS
 *  registered (`BuildingBlocks/Endpoints/UtcDateTimeJsonConverter.cs:76`,
 *  wired into `ApiGateway` via an options extension) — verified against the
 *  TEST stack 2026-09-18: `GET .../contact-messages` returns `"status":"New"`,
 *  and `?status=Replied` filters correctly (enum query binding accepts the
 *  name). `erasableSyntaxOnly` forbids a real TS `enum`, hence the const object. */
export const ContactMessageStatus = {
  New: 'New',
  Read: 'Read',
  Replied: 'Replied',
  Archived: 'Archived',
} as const;
export type ContactMessageStatus = (typeof ContactMessageStatus)[keyof typeof ContactMessageStatus];

export interface ContactMessageListItem {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  adminNotes: string | null;
  repliedBy: string | null;
  repliedAt: string | null;
  ipAddress: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export type ContactMessageDetail = ContactMessageListItem;

export interface ContactMessageListResponse {
  messages: ContactMessageListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ContactMessageStats {
  total: number;
  new: number;
  read: number;
  replied: number;
  archived: number;
}

const BASE = '/content/admin/contact-messages';

export const inboxApi = {
  list: async (params: { status?: ContactMessageStatus; page?: number; pageSize?: number }) => {
    const { data } = await client.get<ContactMessageListResponse>(BASE, {
      params: { status: params.status, page: params.page ?? 1, pageSize: params.pageSize ?? 20 },
    });
    return data;
  },

  get: async (id: string) => {
    const { data } = await client.get<ContactMessageDetail>(`${BASE}/${id}`);
    return data;
  },

  markRead: async (id: string) => {
    const { data } = await client.post<{ message: string; status: string }>(`${BASE}/${id}/read`);
    return data;
  },

  /** `notes` is the FULL accumulated thread text (see file header) — build it
   *  with `appendNoteEntry` before calling. */
  reply: async (id: string, notes: string) => {
    const { data } = await client.post<{ message: string; status: string }>(`${BASE}/${id}/reply`, { notes });
    return data;
  },

  addNote: async (id: string, notes: string) => {
    const { data } = await client.post<{ message: string }>(`${BASE}/${id}/notes`, { notes });
    return data;
  },

  archive: async (id: string) => {
    const { data } = await client.post<{ message: string; status: string }>(`${BASE}/${id}/archive`);
    return data;
  },

  remove: async (id: string) => {
    const { data } = await client.delete<{ message: string }>(`${BASE}/${id}`);
    return data;
  },

  stats: async () => {
    const { data } = await client.get<ContactMessageStats>(`${BASE}/stats`);
    return data;
  },
};

/** Client-side append so the server's single `AdminNotes` field behaves like a
 *  thread. `kind` labels the block so the detail pane can tell notes from replies
 *  when it re-renders the accumulated text. */
export function appendNoteEntry(
  existing: string | null,
  entry: { kind: 'Ghi chú' | 'Trả lời'; author: string; text: string },
): string {
  const stamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const block = `[${entry.kind} — ${entry.author} — ${stamp}]\n${entry.text}`;
  return existing && existing.trim().length > 0 ? `${existing}\n\n${block}` : block;
}

/**
 * Status labels + the "age vs. published deadline" badge for the contact inbox.
 *
 * Deadline source: `decisions/D08-chinh-sach-bao-hanh-doi-tra.md` line 18/61 —
 * Luật Bảo vệ NTD 19/2023 Đ.31 requires acknowledging receipt of a complaint
 * within **03 ngày làm việc**. NĐ 248/2026 Đ.7 (D09 line 42/133) additionally
 * requires the site to PUBLISH a first-response deadline, but no
 * `SystemConfig` key for it exists yet (grepped, none found) — filed as an
 * integration request. Until that key exists, 3 working days is the real,
 * researched legal figure from the binding decision file, not an invented one.
 */
import type { StatusTone } from '../../../components/ui';
import { ContactMessageStatus } from '../../../api/content/inbox';

export const STATUS_LABEL: Record<ContactMessageStatus, string> = {
  [ContactMessageStatus.New]: 'Mới',
  [ContactMessageStatus.Read]: 'Đang xử lý',
  [ContactMessageStatus.Replied]: 'Đã trả lời',
  [ContactMessageStatus.Archived]: 'Lưu trữ',
};

export const STATUS_TONE: Record<ContactMessageStatus, StatusTone> = {
  [ContactMessageStatus.New]: 'danger',
  [ContactMessageStatus.Read]: 'warning',
  [ContactMessageStatus.Replied]: 'success',
  [ContactMessageStatus.Archived]: 'neutral',
};

/** 3 ngày làm việc = 3 lượt qua nửa đêm KHÔNG rơi vào Thứ 7/Chủ nhật. */
export function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay(); // 0 = Sun, 6 = Sat
    if (dow !== 0 && dow !== 6) added += 1;
  }
  return d;
}

export const FIRST_RESPONSE_WORKING_DAYS = 3;

export interface DeadlineInfo {
  deadline: Date;
  isOverdue: boolean;
  hoursLeftOrOver: number;
}

/** Only meaningful while the message hasn't been replied to / archived — a
 *  message the shop already answered isn't "overdue" any more. */
export function computeDeadline(createdAt: string): DeadlineInfo {
  const created = new Date(createdAt);
  const deadline = addWorkingDays(created, FIRST_RESPONSE_WORKING_DAYS);
  const now = new Date();
  const diffMs = now.getTime() - deadline.getTime();
  return { deadline, isOverdue: diffMs > 0, hoursLeftOrOver: Math.abs(diffMs) / 3_600_000 };
}

export function formatAge(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const hours = ms / 3_600_000;
  if (hours < 1) return '< 1 giờ';
  if (hours < 24) return `${Math.floor(hours)} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
}

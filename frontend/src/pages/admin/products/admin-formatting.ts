/**
 * Định dạng ngày giờ cho các màn quản trị catalogue.
 *
 * `utils/format.ts` (đóng băng ở wave 3) dùng múi giờ của trình duyệt; hợp
 * đồng wave 3 yêu cầu chốt cứng `Asia/Ho_Chi_Minh` để máy chủ, nhân viên ở
 * chi nhánh và ảnh chụp màn hình luôn đọc ra cùng một mốc thời gian.
 */
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

const dateTimeFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const parse = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDateTime = (value: string | null | undefined): string => {
  const d = parse(value);
  return d ? dateTimeFormat.format(d) : '—';
};

export const formatDate = (value: string | null | undefined): string => {
  const d = parse(value);
  return d ? dateFormat.format(d) : '—';
};

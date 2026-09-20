/**
 * SaveButton — nút lưu đủ BỐN trạng thái của design-guidelines §9.4.
 *
 *   rảnh     → nút primary, bấm được.
 *   đang lưu → spinner + khoá (Button `loading` giữ nguyên bề rộng nên không giật).
 *   đã lưu   → KHÔNG PHẢI NÚT. Là dòng chữ mờ kèm dấu tích, tự biến mất sau `savedFor` ms.
 *   lỗi      → nút trở lại trạng thái rảnh + thông báo lỗi bên cạnh (`role="alert"`).
 *
 * Sai lầm cũ ở Menu Manager: "Đã lưu" vẫn là một nút đỏ nhạt, người dùng không biết đã
 * xong hay đang chờ mình bấm. Thành phần này tồn tại để 170 trang không lặp lại lỗi đó.
 *
 * Trạng thái do TRANG sở hữu (controlled) — mutation biết khi nào xong, component không
 * đoán. Khi hết `savedFor`, component gọi `onDone?.()`; trang đặt lại `status='idle'`.
 * Không truyền `onDone` thì dòng "Đã lưu" tự ẩn, nút hiện lại (dùng state nội bộ).
 */
import { useEffect, useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, type ButtonProps } from './Button';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SaveButtonProps
  extends Omit<ButtonProps, 'loading' | 'success' | 'children' | 'variant'> {
  status: SaveStatus;
  /** Nhãn nút ở trạng thái rảnh / lỗi. */
  label?: string;
  savingLabel?: string;
  savedLabel?: string;
  /** Thông báo lỗi hiển thị cạnh nút khi `status === 'error'`. */
  errorMessage?: string;
  /** ms giữ dòng "Đã lưu" trước khi ẩn. 0 = không tự ẩn. */
  savedFor?: number;
  /** Gọi khi dòng "Đã lưu" hết hạn — trang đặt lại `status` về `'idle'`. */
  onDone?: () => void;
  className?: string;
}

export const SaveButton = ({
  status,
  label = 'Lưu thay đổi',
  savingLabel = 'Đang lưu…',
  savedLabel = 'Đã lưu',
  errorMessage,
  savedFor = 2500,
  onDone,
  className,
  disabled,
  ...props
}: SaveButtonProps) => {
  /* Dự phòng khi trang không truyền `onDone`: tự quay về nút sau `savedFor`. */
  const [savedExpired, setSavedExpired] = useState(false);

  useEffect(() => {
    if (status !== 'saved') {
      setSavedExpired(false);
      return;
    }
    if (savedFor <= 0) return;
    const t = window.setTimeout(() => {
      setSavedExpired(true);
      onDone?.();
    }, savedFor);
    return () => window.clearTimeout(t);
  }, [status, savedFor, onDone]);

  if (status === 'saved' && !savedExpired) {
    return (
      <p
        role="status"
        className={cn(
          'inline-flex items-center gap-1.5 text-13 font-medium text-fg-muted',
          'animate-in fade-in-0 duration-220 ease-out motion-reduce:animate-none',
          className,
        )}
      >
        <Check size={15} aria-hidden className="text-success" />
        {savedLabel}
      </p>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {status === 'error' && errorMessage && (
        <span role="alert" className="inline-flex items-center gap-1 text-13 font-medium text-danger">
          <AlertCircle size={15} aria-hidden />
          {errorMessage}
        </span>
      )}
      <Button
        variant="primary"
        loading={status === 'saving'}
        disabled={disabled}
        {...props}
      >
        {status === 'saving' ? savingLabel : label}
      </Button>
    </span>
  );
};

export default SaveButton;

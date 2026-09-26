import { useEffect } from 'react';

/**
 * Bật một cờ `data-*` trên `<html>` khi `active` = true, gỡ khi tắt/unmount.
 *
 * Các lớp nổi dưới đáy màn hình (thanh điều hướng mobile, thanh mua nhanh trên trang sản phẩm,
 * nút chat, nút lên đầu trang, thanh so sánh) KHÔNG biết nhau. Chúng phối hợp qua biến CSS
 * `--mobile-nav-offset` / `--sticky-buy-offset` (styles/base.css §"bottom stack"), và các biến đó
 * chỉ khác 0 khi cờ tương ứng có mặt — nên không component nào phải đo chiều cao của component khác.
 */
export function useRootFlag(name: string, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.setAttribute(name, '');
    return () => root.removeAttribute(name);
  }, [name, active]);
}

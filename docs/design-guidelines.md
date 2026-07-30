# Design Guidelines — Quang Hưởng Computer

Tài liệu hệ thiết kế đỏ-trắng thương hiệu. Cập nhật khi thêm/đổi token.

Nguồn duy nhất của bảng màu: `frontend/src/design-system/brand-tokens.ts`.
Áp dụng qua Tailwind (`frontend/tailwind.config.js`) và CSS variables (`frontend/src/index.css`).

## 1. Bảng màu

### Thương hiệu (đỏ)
| Token Tailwind | Hex | Dùng cho |
|---|---|---|
| `brand` / `primary-600` | `#D22B2B` | CTA chính, link, tiêu đề nhấn |
| `brand-dark` / `primary-700` | `#B02020` | Hover / active |
| `primary-800` | `#8C1919` | Nhấn mạnh, nền footer/banner tối |
| `brand-light` / `primary-50` | `#FEF2F2` | Nền nhẹ, badge |
| `primary-100` | `#FEE2E2` | Viền nhẹ, chip |
| `primary-900` | `#701212` | Text đỏ đậm trên nền sáng |

### Ink (chữ)
| Token | Hex | Dùng cho |
|---|---|---|
| `ink-900` | `#1A1A1A` | Chữ chính |
| `ink-600` | `#525252` | Chữ phụ, meta |
| `ink-400` | `#A3A3A3` | Placeholder, disabled |

**KHÔNG dùng** `text-gray-400`/`text-gray-300` cho chữ trên nền trắng — không đạt WCAG AA (2.8:1).
Chữ phụ tối thiểu `text-gray-600` hoặc `ink-600`.

### Surface
| Token | Hex | Dùng cho |
|---|---|---|
| `surface` | `#FFFFFF` | Nền trang |
| `surface-alt` | `#FAFAFA` | Nền section xen kẽ |
| `surface-subtle` | `#F5F5F5` | Nền card mờ |

### Semantic (bắt buộc tách khỏi brand)
| Token | Hex | Ý nghĩa |
|---|---|---|
| `success` | `#16A34A` | Còn hàng, thành công |
| `warning` | `#F59E0B` | Sắp hết hàng, cảnh báo |
| `danger` | `#EA580C` | **Xoá, lỗi** — cam đỏ, KHÁC brand |
| `info` | `#0891B2` | Thông tin, ghi chú |

**Vì sao danger ≠ brand:** đỏ vừa là màu thương hiệu vừa là màu cảnh báo sẽ khiến người dùng không phân biệt được "Mua ngay" vs "Xoá". Danger dùng cam đỏ `#EA580C` để giữ ý nghĩa nguy hiểm mà vẫn tách khỏi CTA.

## 2. Thang chữ

Dùng thang mặc định Tailwind, `Inter` là font chính.

| Tailwind | Kích thước | Dùng cho |
|---|---|---|
| `text-xs` (12px) | Nhãn nhỏ, meta, badge |
| `text-sm` (14px) | Nội dung phụ, footer |
| `text-base` (16px) | **Body — mặc định** |
| `text-lg` (18px) | Body nhấn, subtitle |
| `text-xl` (20px) | Section title |
| `text-2xl` (24px) | Card title |
| `text-3xl` (30px) | Page title |
| `text-4xl` (36px) | Hero heading (mobile) |
| `text-5xl` (48px) | Hero heading (desktop) |

Cỡ chữ gốc `html { font-size: 16px }` — mọi đơn vị `rem` co giãn tự động khi bật chế độ chữ to (luồng B).

## 3. Khoảng cách

Dùng thang space mặc định Tailwind (4px base). Quy ước:
- `space-y-2` (8px) trong card
- `space-y-4` (16px) giữa các block trong section
- `space-y-8` (32px) giữa các section
- `py-12` / `py-16` cho khoảng thở section trên trang chủ

Vùng bấm tối thiểu **44x44px** trên mobile (WCAG target size). Nút icon-only phải có `min-w-11 min-h-11` hoặc `p-3` với icon ≥ 20px.

## 4. Bán kính bo

| Token | Dùng cho |
|---|---|
| `rounded-md` (6px) | Input, badge nhỏ |
| `rounded-lg` (8px) | Button, card nhỏ |
| `rounded-xl` (12px) | Card sản phẩm |
| `rounded-2xl` (16px) | Modal, panel lớn |
| `rounded-full` | Avatar, chip, icon tròn |

## 5. Đổ bóng

| Token | Dùng cho |
|---|---|
| `shadow-sm` | Card mặc định |
| `shadow-md` | Card khi hover, dropdown |
| `shadow-lg` | Modal, popover |
| `shadow-brand` | CTA đỏ, nút chính (đổ bóng đỏ nhẹ) |
| `shadow-brand-lg` | Hero CTA |

## 6. Quy tắc nút (button variants)

Định nghĩa tại `frontend/src/design-system/variants.ts`.

| Variant | Khi nào dùng |
|---|---|
| `primary` | 1 CTA chính mỗi màn (Mua ngay, Đặt hàng, Thanh toán) |
| `secondary` | Hành động phụ ngang cấp (Thêm vào giỏ, Lưu) |
| `outline` | Hành động thứ 3 (Xem thêm, So sánh) |
| `ghost` | Trong toolbar, ít nổi bật |
| `danger` | **Xoá, huỷ đơn, huỷ tài khoản** — cam đỏ |
| `success` | Xác nhận đơn, hoàn tất — xanh |

**KHÔNG** dùng `danger` cho CTA "Mua ngay" — sẽ khiến người dùng do dự.
**KHÔNG** dùng nhiều `primary` cùng lúc trên 1 màn hình.

## 7. Focus & Accessibility

- Focus ring: `outline: 2px solid var(--accent-primary); outline-offset: 2px;` (đã có ở `index.css`)
- Tương phản tối thiểu 4.5:1 chữ thường, 3:1 chữ ≥18px
- `#D22B2B` trên `#FFFFFF` = 5.1:1 (AA) ✓
- Chữ trắng trên `#D22B2B` = 5.1:1 (AA) ✓
- Nhãn form luôn hiện, không dùng placeholder thay label
- Icon-only button phải có `aria-label`

## 8. Admin đổi màu

Admin có thể ghi đè `--accent-primary` và `--accent-primary-hover` qua SystemConfig:
- Key: `theme.accentPrimary` (Color, mặc định `#D22B2B`)
- Key: `theme.accentPrimaryHover` (Color, mặc định `#B02020`)
- Key: `theme.logoUrl` (Url, mặc định `/brand/logo.svg`)

`ThemeContext.tsx` fetch `/api/config/public` lúc khởi động, validate hex `^#[0-9A-Fa-f]{6}$` (chống CSS injection), set CSS variable trực tiếp. Fallback về `#D22B2B` nếu API lỗi.

## 9. Dark mode

Xem `frontend/src/dark-theme.css`. Dark mode chỉ đổi surface/text, KHÔNG đổi accent — accent giữ đỏ nhất quán.

## 10. Đồng bộ khi thêm màu

Khi thêm token mới:
1. Cập nhật `frontend/src/design-system/brand-tokens.ts`
2. Cập nhật `frontend/tailwind.config.js` (nếu cần class Tailwind)
3. Cập nhật `frontend/src/index.css` (nếu cần CSS variable)
4. Cập nhật bảng này

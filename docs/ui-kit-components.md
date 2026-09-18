# UI Kit — hợp đồng component (Quang Hưởng Computer)

> **Bắt buộc đọc trước khi dựng bất kỳ trang nào (wave 3 trở đi).**
> Chủ sở hữu: W1-12. Hợp đồng thị giác/chuyển động: `plans/260917-2100-full-system-overhaul/design/design-direction.md`.
> Mọi primitive nằm ở `frontend/src/components/ui/`, import qua đúng một đường dẫn:
> ```ts
> import { Button, Dialog, DataTable, Price, QueryBoundary } from '@/components/ui';
> ```

## 0. Ba luật không thương lượng

1. **Không có `<button>`, modal, bảng, ảnh hay HTML-từ-server tự chế.** Thiếu gì thì báo lead, không fork.
2. **Chỉ token ngữ nghĩa.** `bg-surface`, `text-fg-muted`, `border-line`, `text-brand-text`… Cấm hex rời, cấm `red-600`/`gray-400`, cấm `!important`, cấm `isDark ? … : …` trong TSX. Dark mode tự đúng vì token tự đổi.
3. **Không tự chế chuyển động.** Thời lượng/easing lấy từ `@/design-system/motion`. Cấm `initial={{…}}` nội tuyến. Cấm animate `box-shadow`/`width`/`height`/`top`/`left`.

Kiểm tra tự động: `plans/260917-2100-full-system-overhaul/reports/probes/W1-12-ui-kit-verify.sh`.

---

## 1. Mật độ & ngữ cảnh

Kit tự đổi mật độ theo shell — **không có prop `density`**. Layout admin đặt `data-shell="admin"` ở gốc (W1-8); mọi component bên trong tự thu lại:

| | Storefront | Admin (`[data-shell="admin"]`) |
|---|---|---|
| Nút `size="md"` | cao 44 · 16px | cao 40 · 13px |
| Nút `size="sm"` | cao 36 | cao 32 |
| Badge | cao 22 · 11px | cao 24 · 12px |
| Padding `<Card padded>` | `p-5 lg:p-7` | `p-4 lg:p-5` |
| Input / Select / Textarea | cao 40 (như nhau) | cao 40 |

---

## 2. Bảng tra nhanh

| Component | Dùng khi | Ghi chú bắt buộc |
|---|---|---|
| `Button` | mọi hành động | `variant`: `primary` `ink` `outline` `ghost` `dashed` `danger` · `size` `sm|md|lg` · `loading` giữ nguyên bề rộng |
| `IconButton` | nút chỉ có icon | **`aria-label` bắt buộc theo kiểu TS** — không truyền là lỗi biên dịch |
| `Badge` / `StatusBadge` | nhãn, trạng thái | `StatusBadge` luôn có chấm + chữ; màu không bao giờ là kênh duy nhất |
| `Card` (+`CardHeader/Body/Footer/Title`) | khung bề mặt | mặc định viền `line` + `shadow-xs`; `interactive` mới nâng 3px khi hover |
| `Avatar` | ảnh đại diện | fallback = 2 âm tiết CUỐI (`Trần Quang Hưởng` → `QH`) |
| `Img` | **mọi** ảnh | thay `LazyImage`; khung tỉ lệ cố định → CLS 0; tự gọi `resolveMediaUrl` |
| `SafeHtml` | HTML do server/CMS trả về | **nơi duy nhất** được `dangerouslySetInnerHTML` |
| `Price` / `Money` | mọi số tiền | VND nguyên, ĐÃ gồm VAT (D01); FE không tính thuế |
| `PageHeader` | đầu trang | luôn phát ra `<h1>` |
| `StatCard` | ô KPI | `value={null}` → `—`, **không phải 0** |
| `Breadcrumb` | đường dẫn | mục cuối `aria-current="page"`, không phải link |
| `Skeleton` / `SkeletonText` / `SkeletonCircle` | chờ tải | khung phải khớp khung thật |
| `EmptyState` | rỗng hợp lệ | luôn kèm 1 hành động |
| `ErrorState` | request lỗi | nói việc người dùng làm được, mã lỗi giấu trong `<details>` |
| `QueryBoundary` | bọc mọi TanStack query | xem §4 — bắt buộc |
| `Input` `Textarea` `Select` `Combobox` `AsyncSearchableSelect` `Checkbox` `Radio`+`RadioGroup` `Switch` | nhập liệu | xem §3 |
| `Dialog` / `ConfirmDialog` | hộp thoại | Radix: focus trap, ESC, khoá cuộn, `aria-modal` |
| `Drawer` | giỏ hàng, lọc mobile, menu, sidebar admin | `side` `left|right|bottom` |
| `Popover` `Tooltip` `Tabs` | lớp nổi nhỏ | Tooltip **không** được chứa thông tin bắt buộc |
| `notify.*` | thông báo | bọc `react-hot-toast` đã mount sẵn |
| `Table`+`Th/Td/Tr/RowActions` | bảng viết tay | markup `<table>` thật |
| `DataTable` | mọi danh sách admin | xem §5 |
| `Pagination` | phân trang server | hiện dải thật “1–20 trên 137” |

Helper thuần (import cùng chỗ): `formatDong` `sanitizeImageSrc` `sanitizeHtml` `initialsOf` `pageWindow` `createStatusMap` `useSkeletonFloor`, và các `cva`: `buttonVariants` `controlVariants` `badgeVariants` `cardVariants` `overlayClass` `labelClass` `hintClass` `errorClass`.

---

## 3. Hợp đồng prop của input (chốt với `FormField` của W1-9)

Mọi input là wrapper mỏng có `forwardRef` trên phần tử DOM thật. `value` `onChange` `onBlur` `name` `ref` `disabled` `aria-*` đi thẳng xuống, nên `{...register('field')}` của RHF dùng được ngay.

```tsx
<Input label="Email" icon={Mail} error={errors.email?.message} {...register('email')} />
<Textarea label="Ghi chú" rows={4} hint="Tối đa 500 ký tự" {...register('note')} />
<Combobox options={provinces} value={value} onChange={onChange} />      // onChange(value: string)
<Select options={provinces} value={v} onChange={(e) => set(e.target.value)} />  // shape <select> cũ
<Checkbox label="Đồng ý" checked={v} onChange={(e) => set(e.target.checked)} />
<Switch checked={v} onCheckedChange={set} label="Nhận thông báo" />      // dùng cho bật/tắt có hiệu lực ngay
<RadioGroup legend="Giao hàng"><Radio name="ship" … /></RadioGroup>
```

- `label`/`error`/`hint` là tiện ích cho trang không dùng `FormField`. Khi `FormField` bọc, nó tự lo nhãn + `aria-describedby` + `aria-invalid`, và **không** truyền `label` xuống nữa.
- Viền control dùng `--control-line` (≥3:1, WCAG 1.4.11). Focus = viền brand + ring 3px. **Cấm `focus:outline-none`** nếu không thay bằng ring khác.
- `Switch` ≠ `Checkbox`: switch có hiệu lực ngay, checkbox chờ Lưu.
- `RadioGroup` phát ra `<fieldset><legend>` — nhóm radio không có nó sẽ bị đọc thành 3 control rời rạc.

---

## 4. `QueryBoundary` — luật chống “KPI = 0 khi API lỗi”

`data ?? []` che một cái 500. Bọc mọi query:

```tsx
<QueryBoundary
  query={ordersQuery}
  isEmpty={(d) => d.items.length === 0}
  skeleton={<SkeletonText lines={6} />}
  empty={{ title: 'Chưa có đơn hàng', action: { label: 'Tạo đơn', onClick: create } }}
>
  {(data) => <OrdersTable rows={data.items} />}
</QueryBoundary>
```

Bốn trạng thái là bắt buộc, không được bỏ qua trạng thái nào:
`pending` → skeleton (giữ tối thiểu 420ms, bỏ qua nếu người dùng bật giảm chuyển động) · `isError` → `ErrorState` + nút Thử lại · rỗng → `EmptyState` · còn lại → `children(data)`.

---

## 5. `DataTable`

Bảng **không** fetch, **không** sort, **không** phân trang — tất cả ở server; bảng chỉ báo ý định.

```tsx
const columns: DataTableColumn<Order>[] = [
  { id: 'code', header: 'Mã đơn', sortable: true, locked: true, cell: (r) => <span className="num">{r.code}</span> },
  { id: 'total', header: 'Tổng tiền', align: 'right', sortable: true, cell: (r) => <Money value={r.total} /> },
  { id: 'status', header: 'Trạng thái', cell: (r) => <StatusBadge {...orderStatus(r.status)} /> },
  { id: 'note', header: 'Ghi chú', defaultHidden: true, cell: (r) => r.note },
];

<DataTable
  caption="Danh sách đơn hàng"          // bắt buộc — tên cho trình đọc màn hình
  columns={columns} rows={data?.items} rowKey={(r) => r.id}
  loading={q.isPending} error={q.error} onRetry={q.refetch}
  sort={sort} onSortChange={setSort}
  selectedIds={sel} onSelectionChange={setSel}
  enableColumnVisibility
  bulkActions={(ids) => <Button variant="danger" size="sm">Xoá {ids.length}</Button>}
  pagination={<Pagination page={p} pageSize={20} total={data?.total ?? 0} onPageChange={setP} />}
/>
```

- Sắp xếp 3 trạng thái: tăng → giảm → bỏ sắp xếp; `aria-sort` đặt trên `<th>`.
- “Chọn tất cả” chỉ áp dụng cho **trang hiện tại**; bỏ chọn không làm mất lựa chọn ở trang khác.
- Cột mã/tiền/trạng thái mặc định `nowrap`; chỉ cột chữ dài mới co.
- `locked: true` = không cho ẩn (cột định danh, cột hành động). `defaultHidden` = ẩn sẵn, bật trong menu “Cột”.
- Nút hành động trong hàng bọc `<RowActions>` (mờ .55 → rõ khi hover/focus hàng).

---

## 6. Lớp phủ & chuyển động

- `Dialog`/`Drawer` dựng trên `@radix-ui/react-dialog`: focus trap, ESC, khoá cuộn nền, `role="dialog" aria-modal="true"`, thân cuộn riêng, `max-h-[85vh]`. `title` **bắt buộc** (là tên khả truy cập); dùng `hideTitle` nếu không muốn hiện.
- Vào/ra chạy bằng CSS theo `data-state` của Radix — scrim 220ms, panel 320ms, drawer 420ms vào / 360ms ra (ra luôn nhanh hơn vào). Không cần `AnimatePresence`.
- **Giảm chuyển động**: khối `@media (prefers-reduced-motion: reduce)` trong `styles/base.css` vô hiệu hoá mọi animation/transition (kể cả của kit); phần JS do `<MotionConfig reducedMotion="user">` lo. Không viết nhánh `if (reduced)` thủ công trong component.
- Thang z (không dùng số rời): `sticky 10 · topbar 30 · floating 40 · scrim 50 · drawer 60 · toast 70 · palette 80`.
- `notify.success|error|warning|info(title, { description, onUndo })`. Chỉ đặt `onUndo` khi hành động thật sự đảo được.
- `Tooltip` chỉ là gợi ý thêm; thiết bị cảm ứng không có hover.

---

## 7. Tiền, số và tiếng Việt

- `<Price value={27599000} compareAt={31990000} />` → `27.599.000₫` + giá cũ gạch + `-14%` (phần trăm **tự suy ra**, không truyền vào).
- `<Money value={x} />` cho ô bảng. `value={null}` → `—`, không bao giờ `0`.
- Giá đã gồm VAT (D01). **FE không tính thuế.** Nhãn “Giá đã bao gồm VAT” thuộc trang, không thuộc thẻ sản phẩm.
- Mọi con số (giá, SL, mã đơn, ngày, %) mang class `.num`/`.price`/`.money` → `tabular-nums`, cột tiền không nhảy khi đổi trang.
- `line-height ≥ 1.25` cho chữ Việt; mask chữ chừa `.14em` (`.line-mask`). Không có bậc chữ dưới 11px.

---

## 8. Ảnh & HTML từ server

```tsx
<Img src={p.imageUrl} alt={p.name} ratio="1/1" blend />        // sản phẩm: nền trắng hoà vào --stage
<Img src={b.url} alt="" ratio="16/9" fit="cover" priority />   // banner trên màn đầu
<SafeHtml html={product.descriptionHtml} />
```

- `Img` xử lý một chỗ: URL tuyệt đối giữ nguyên · `/media|/uploads` → `resolveMediaUrl` (D02) · skeleton khi tải · placeholder “Chưa có ảnh” khi lỗi · `javascript:`/`data:text/html` bị chặn.
- `alt` bắt buộc; ảnh trang trí truyền `alt=""`.
- `SafeHtml` lọc bằng DOMPurify với allow-list cố định (bỏ `script`/`iframe`/`style`/`on*`/`javascript:`) và ép `rel="noopener noreferrer"` cho link mở tab mới.

---

## 9. Shim còn lại (wave 3 phải dọn)

| File | Ai còn import | Việc phải làm | Chủ |
|---|---|---|---|
| `components/ui/Modal.tsx` | 15 file wave-0 | đổi `<Modal isOpen onClose>` → `<Dialog open onOpenChange>` rồi xoá file | track wave-3 của từng trang |
| `components/crud/DataTable.tsx` | 4 trang kế toán | đổi sang `DataTable` của kit (`key→id`, `label→header`, `render→cell`, thêm `caption`+`rowKey`) rồi xoá cả thư mục `crud/` | W3-9 |
| `components/ui/DashboardWidgets.tsx` | `kpi-dashboard-widgets.tsx`, `ManagerPortal.tsx` | dựng lại trên `StatCard`+`Card`+`QueryBoundary` rồi xoá | W3-4 / W3-8 |
| `Button variant="secondary"\|"success"` | vài trang wave-0 | đổi sang `outline` / `primary` | track wave-3 của từng trang |
| `pages/dev/**` | route dev-only | xoá ở gate W3 | W3-G |

Đã xoá hẳn ở W1-12: `components/atoms`, `components/molecules`, `components/LazyImage.tsx`, `components/ui/{Loading,LoadingButton,LoadingSpinner}.tsx`, `components/ui/animations/`, `components/backoffice/{Card,DataTable,StatsCard,PageHeader,EmptyState,StatusBadge,ActionButton,LoadingSpinner}.tsx` + `index.ts`, `components/crud/{index,CrudListPage,CrudFormModal,FilterBar,SearchInput,ActionButtons,FormField}`.

---

## 10. Kiểm tra trước khi merge một trang

```bash
scripts/qh-build.sh fe-tsc                                   # 0 lỗi
scripts/qh-build.sh fe-lint <đường dẫn bạn sửa>
scripts/qh-build.sh fe-test src/components/ui/ui-kit.test.tsx
bash plans/260917-2100-full-system-overhaul/reports/probes/W1-12-ui-kit-verify.sh
```

Thủ công: Tab hết trang (mọi control phải có vòng focus đỏ 2px) · mở Dialog rồi Tab (không thoát ra sau nền) · ESC đóng · bật “Giảm chuyển động” của hệ điều hành rồi mở lại Dialog/Drawer/Toast · xem ở light **và** dark · xem ở 390px (không tràn ngang).
Trang mẫu đủ mọi primitive: `/dev/kitchen-sink` (chỉ bản Development).

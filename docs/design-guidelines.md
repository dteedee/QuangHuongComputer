# Design Guidelines — Quang Hưởng Computer

**Hợp đồng hệ thiết kế, đóng băng bởi W1-7 (2026-09-18).** Mọi track wave 2–4 chỉ cần đọc file này.
Nguồn gốc giá trị: `plans/260917-2100-full-system-overhaul/design/design-direction.md` + 2 prototype trong cùng thư mục. **Tài liệu này và prototype không được lệch nhau** — sửa một bên thì sửa cả hai.

Cài đặt thực tế:
| Thứ | File |
|---|---|
| Token màu/bóng | `frontend/src/styles/tokens.css` |
| Base layer (chữ, số, focus, reveal, skeleton, reduced-motion) | `frontend/src/styles/base.css` |
| Map token → class Tailwind | `frontend/tailwind.config.js` |
| Preset chuyển động | `frontend/src/design-system/motion/presets.ts` |
| Primitive chuyển động React | `frontend/src/components/motion/*` |
| Test hợp đồng (chạy `qh-build.sh fe-test`) | `src/design-system/design-tokens.test.ts`, `src/components/motion/reveal.test.tsx` |

> Kit component (Button, Input, Dialog…) là **W1-12**, tài liệu riêng `docs/ui-kit-components.md`.

---

## 1. Nguyên tắc

1. Trung tính là nền, **đỏ chỉ là dấu nhấn**: giá, CTA chính, badge giảm giá, trạng thái active.
2. Mỗi trang đúng **một khối "to tiếng"** (storefront: panel Flash Sale nền `ink`; admin: không có).
3. Sản phẩm là nhân vật chính: ảnh 1:1 nền trắng, `object-contain`, `mix-blend-multiply`, padding 7%, khung nền `stage`.
4. Mật độ theo ngữ cảnh: storefront 16px / nút 44px; admin 14px / nút 40px / hàng bảng 44px.
5. Chuyển động phục vụ việc hiểu: chỉ `transform`/`opacity`, ≤ 560ms, luôn tôn trọng `prefers-reduced-motion`.
6. **Token hoặc không có gì**: không hex rời, không `red-600`, không `!important` để ép dark mode.
7. Tiếng Việt hạng nhất: `line-height` ≥ 1.25, mask chừa `.14em`, mọi con số `tabular-nums`.

## 2. Token màu (semantic)

Khai báo là **rgb triple** trên `:root` (light) và `.dark`; Tailwind đọc qua `rgb(var(--x) / <alpha-value>)` nên `bg-surface/60` hoạt động.

| Class Tailwind | Token | Dùng cho |
|---|---|---|
| `bg-bg` | `--bg` | nền trang (admin thêm `data-shell="admin"` trên phần tử gốc → xám hơn 1 bậc) |
| `bg-surface` | `--surface` | card, input, popover |
| `bg-sunken` | `--sunken` | nền phụ, skeleton, hover nhẹ |
| `bg-stage` | `--stage` | **khung ảnh sản phẩm** — dark mode cố tình giữ sáng để ảnh nền trắng không bị đảo |
| `border-line` / `border-line-strong` | `--line`, `--line-strong` | phân cách, viền card / hover, nhấn |
| `border-control-line` | `--control-line` | **viền input/select/checkbox** (≥3:1, WCAG 1.4.11) |
| `text-fg` / `text-fg-muted` / `text-fg-subtle` | `--fg…` | chữ chính / phụ / nhãn, meta |
| `bg-brand`, `hover:bg-brand-hover`, `bg-brand-subtle`, `border-brand-line`, `text-brand-text` | `--brand…` | CTA, badge, **giá** dùng `text-brand-text` |
| `bg-ink`, `bg-ink-soft`, `border-ink-line`, `text-on-ink`, `text-on-ink-muted` | `--ink…` | panel tối (Flash Sale, footer) |
| `text-success` + `bg-success-subtle` (tương tự `warning`, `danger`, `info`, `violet`) | | trạng thái |
| `text-savings` | `= --brand-text` | tiền tiết kiệm, `-x%` |
| `text-rating` | `--rating` | sao đánh giá — **luôn kèm số điểm bằng chữ** |

Tương phản đã tính: mọi cặp chữ ≥ 4.5:1, ranh giới control ≥ 3:1 (bảng đầy đủ: design-direction §2).
Thang số legacy (`primary-600`, `ink-900`, `success-50`…) vẫn còn trong Tailwind config cho trang wave-0 — **không dùng trong code mới**.

## 3. Chữ

- **Display** `font-display` = Be Vietnam Pro 500/600/700/800 — tiêu đề, giá lớn, số KPI.
- **Body/UI** `font-sans` = Inter 400–700, `font-feature-settings:"cv11","ss03"`.
- Thang: `text-2xs` 11/16 · `text-xs` 12/16 · `text-13` 13/20 (body admin) · `text-sm` 14/20 · `text-base` 16/24 · `text-lg` 18/24 (giá trên card) · `text-xl`–`text-3xl` 20–30 · `text-4xl` 36/44 · `text-5xl` 46/56. **Không có bậc nào dưới 11px.**
- Letter-spacing: tiêu đề ≥24px `tracking-tight`; `.price` −.015em; `.money` −.01em.
- Số: mọi con số mang `.num`. Giá storefront `.price` + `<span class="cur">₫</span>`; cột tiền admin `.money`. Giá cũ `.price-old` (gạch ngang, `fg-subtle`, weight 400).
- Dấu tiếng Việt: dòng bị cắt (`overflow-hidden`) phải bọc `.line-mask`.

## 4. Không gian, bo góc, đổ bóng, focus

- **Spacing**: thang Tailwind 4px. Section: storefront `mt-12 lg:mt-16`, admin `mt-3 lg:mt-4`. Padding card: storefront `p-5 lg:p-7`, admin `p-4 lg:p-5`.
- **Radius** (đúng 6 bậc): `rounded-sm` 6 · `md` 8 · `lg` 10 · `xl` 12 · `2xl` 16 · `3xl` 24 · `rounded-full` cho chip/switch/avatar.
- **Elevation** (đúng 5 bậc): `shadow-xs` viền mỏng · `sm` popover · `md` dropdown · `lg` card hover + modal · `xl` command palette. Card mặc định = `border border-line shadow-xs`; bóng chỉ tăng khi hover hoặc khi nổi lên trên. **Không animate `box-shadow`** — dùng lớp `::after` + `opacity`.
- **z-index** (dùng tên, cấm `z-[9999]`): `z-sticky` 10 · `z-topbar` 30 · `z-floating` 40 · `z-scrim` 50 · `z-drawer` 60 · `z-toast` 70 · `z-palette` 80.
- **Focus**: một quy tắc duy nhất trong `base.css` (`:focus-visible` outline 2px `brand`, offset 2). **Cấm `focus:outline-none`** nếu không thay bằng ring khác.
- **maxWidth**: `max-w-shell` 1320px (storefront), `max-w-admin` 1480px.

## 5. Chuyển động

Import **duy nhất** từ `@/design-system/motion` (hoặc đường dẫn tương đối). Cấm viết `initial={{…}}` rời trong trang.

- **Thời lượng** `dur`: `fast` .14 (đổi màu/hover/press) · `base` .22 (fade, scrim, popover) · `move` .36 (trượt/FLIP/layout) · `drawer` .42 · `toast` .48 (reveal admin, toast vào) · `reveal` .56 (reveal storefront, zoom ảnh) · `progress` .76 · `draw` 1.1 (vẽ đường biểu đồ).
- **Easing** `ease` (4 đường cong): `expo` vị trí/kích thước · `out` fade/press/tooltip · `back` **chỉ** switch + pop tim · `io` vẽ `stroke-dashoffset`.
- **Spring**: `springSoft` (layout, shared element) · `springSnappy` (press, pill) · `springBouncy` (toggle, tim).
- **Variants** có sẵn: `fadeUp`, `fadeUpAdmin`, `fade`, `stagger(step, delay)`, `pageTransition`, `drawerRight`, `drawerLeft`, `modalPanel`, `toastSlide`, `cartPop`, `press`, `pressIcon`, `cardHover`.
- **Stagger**: 40ms storefront (`staggerStep.storefront`), 50ms admin; **dừng cộng dồn sau 6 phần tử** (`staggerIndex(i)`); lưới sản phẩm dùng `i % 4`.
- **Reduced motion**: CSS đã xử lý trong `base.css`; phía JS bọc app một lần bằng `<MotionProvider>` (`MotionConfig reducedMotion="user"`). Logic phụ thuộc chuyển động đọc `useReducedMotion()`.

### Primitive React (`@/components/motion`)

| Component | Dùng khi |
|---|---|
| `<MotionProvider>` | bọc toàn app **đúng một lần** trong `main.tsx` |
| `<Reveal index={i} group? root?>` | lộ khi cuộn (CSS-driven, rẻ nhất) |
| `<FadeIn dense? onMount? delay?>` | fade + rise một khối (`delay` tính bằng giây) |
| `<Stagger>` + `<StaggerItem>` | danh sách lộ so le |
| `<PageTransition>` | chuyển route; **`key` đặt trên chính nó**: `<AnimatePresence mode="wait"><PageTransition key={location.pathname}>…` — `AnimatePresence` chỉ đọc `key` của con trực tiếp, đặt `key` bên trong thì không bao giờ chạy animation thoát |
| `<Pressable icon? lift?>` | phản hồi nhấn cho thứ không phải `<Button>` |
| `<Collapse open>` | accordion / nhóm bộ lọc |
| `<AnimatedNumber value>` | **chỉ** số KPI, không bao giờ dùng cho giá |

### Cái bẫy bắt buộc nhớ — nội dung render sau

Phần tử mang `[data-reveal]` (tức `opacity:0`) mà được chèn **sau** khi `IntersectionObserver` được tạo thì không bao giờ được quan sát → **trắng vĩnh viễn**. Trong React mọi node đều "chèn sau".
1. Dùng `<Reveal>` — nó tự `observe` trong `useEffect` của chính nó. **Không** quét `document.querySelectorAll` một lần khi mount.
2. Rail cuộn ngang: đánh dấu `<Reveal group>` → khi rail vào tầm nhìn thì lộ toàn bộ con (giữ stagger). Item nằm ngoài màn bên phải không bao giờ cắt viewport.
3. Admin cuộn ở `<main id="scroll">` → truyền `root`; `observeReveal` tự kiểm tra `root.contains(el)` và lộ ngay nếu không chứa.

Test bắt buộc trước khi merge trang có reveal: chụp màn 1440×900 và 390×844 sau khi cuộn hết trang, assert `document.querySelectorAll('[data-reveal]:not(.in)').length === 0`.

## 6. Bố cục (tóm tắt)

Breakpoint mặc định Tailwind. Gutter `px-4` → `sm:px-5` → `lg:px-6`.
Home `max-w-shell`, lưới gợi ý `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` · Listing `lg:grid-cols-[264px_1fr]` · PDP `lg:grid-cols-[1fr_400px]`, khối giá sticky `top-24` · Cart/Checkout `lg:grid-cols-[1fr_380px]` · Account `lg:grid-cols-[240px_1fr]` · Admin shell `grid-template-columns:264px minmax(0,1fr)`, **cuộn nằm ở `<main id="scroll">` chứ không ở `body`**, topbar 56px · Admin dashboard `max-w-admin`, KPI `grid-cols-2 xl:grid-cols-4` · Admin form `xl:grid-cols-[1fr_380px]`. Chi tiết: design-direction §6.

## 7. SEO shell (D11) — `frontend/index.html`

- `<!-- seo:head --> … <!-- /seo:head -->` bọc title/description/OG mặc định: ApiGateway thay cả khối này theo URL. Giữ nguyên marker, giữ default hợp lệ (edge rơi về file tĩnh khi shell chết).
- `<!-- seo:body -->` nằm trong `#root`: nơi shell chèn snapshot semantic. React xoá `#root` ở lần render đầu nên không bao giờ thấy cả hai.
- `.seo-shell-header` là placeholder cao **64px (mobile) / 108px (≥1024px)** = đúng chiều cao header thật (`h-16` / `h-9` + `h-[72px]`). **Đổi header ở wave 3 thì phải đổi 2 số này**, nếu không sẽ có CLS.
- CSS inline cho snapshot phải ≤ 1KB (hiện 915 B) và phải nằm inline — nó vẽ trước khi stylesheet tải xong.
- Ảnh OG mặc định: `frontend/public/brand/og-default.png` 1200×630 (PNG/JPG; Meta không tài liệu hoá SVG). Không tham chiếu `og-default.svg` trong thẻ OG nữa.

## 8. Chống mẫu (điều đã làm UI cũ trông rẻ tiền)

1. Ảnh sai sản phẩm / ảnh stock "phong cách sống" → ảnh chính hãng 1:1 nền trắng, không có ảnh thì không lên sản phẩm.
2. ~120 sắc đỏ tự chế (`red-600`, `#dc2626`, `#b00014`) → chỉ `brand` / `brand-text`.
3. Chữ gào thét (`font-black` ×89, `uppercase` ×464, `text-[9px]` ×172) → nặng nhất 700, in hoa chỉ cho nhãn ≤11px, không có chữ dưới 11px.
4. Bo góc/z-index hỗn loạn (`rounded-[32px]`, `z-9999`) → 6 bậc radius + thang z ở §4.
5. Dark mode kiểu vá (`dark-theme.css` 114 `!important`, 18 file `isDark ? …`) → chỉ token; dark mode đổi giá trị biến, component không đổi.
6. Lưới vỡ / `return null` khi tải → khung cố định (`min-h`, dòng giá phụ `h-5`, ảnh có tỉ lệ), skeleton đúng hình, hiện tối thiểu 420ms.
7. Icon emoji trong dữ liệu → `utils/icon-registry.getIcon(name)`, nét 1.75, `currentColor`. **Cấm** `import * from 'lucide-react'`.
8. Gradient lưu trong DB dưới dạng class Tailwind → bị purge. Tạm thời đã safelist `from|via|to-*` và `text|bg|border-*-{400,500,600}`; hướng đúng là lưu khoá preset hoặc cặp hex rồi render `linear-gradient` nội tuyến.
9. `focus:outline-none` ×222, modal không `role="dialog"`/focus trap/ESC → §4 + kit W1-12 là bắt buộc.
10. Số không `tabular-nums` nên cột tiền nhảy khi đổi trang → `.num` / `.price` / `.money`.

## 9. Back office — ngôn ngữ riêng (chốt 20/09/2026)

Back office KHÔNG dùng lại cảm giác của storefront. Storefront để bán hàng: thoáng, nhiều đỏ,
nhiều cảm xúc. Back office là công cụ nhân viên ngồi 8 tiếng/ngày: mật độ cao, ít màu, bảng là
công dân hạng nhất. Mọi quyết định dưới đây do chủ dự án chốt, không suy diễn.

### 9.1 Màu — trung tính, đỏ là điểm nhấn
- Nền trang `bg-bg`, khối nội dung `bg-surface`, viền `border-line`. Không `bg-white`, không `gray-*`.
- **Đỏ thương hiệu (`brand`) CHỈ dùng cho:** nút hành động chính của trang (mỗi màn tối đa MỘT),
  trạng thái nguy hiểm/cảnh báo, và chỉ báo mục đang chọn ở sidebar (thanh 2px bên trái + chữ
  `text-brand`, KHÔNG tô nền đỏ đặc).
- Nút điều hướng (ví dụ "Quay về trang chủ") là `variant="ghost"` hoặc `outline`, không bao giờ đỏ.
- Trạng thái nghiệp vụ dùng `success` / `warning` / `danger` / `info` qua `StatusBadge`, không tự chọn màu.
- **Cấm `isDark ? ... : ...`.** Token tự lật ở `tokens.css`. Thấy ternary này là lỗi cần sửa.
- Cấm mã hex trong file trang.

### 9.2 Mật độ — gọn
- Chữ nội dung `text-13` (13/20, đã có sẵn trong `tailwind.config.js`), meta `text-2xs`.
- Tiêu đề trang `text-xl font-bold` — KHÔNG dùng thang `text-4xl` của storefront.
- Hàng bảng cao 40px (`h-10`), padding ô `px-3 py-2`. Ô nhập `h-9`.
- Khoảng cách giữa các khối `gap-4`; trong một khối `gap-3`. Không `space-y-8` kiểu landing page.
- Khung nội dung dùng hết bề ngang màn hình (`max-w-none` + padding ngang), không kẹp `max-w-shell`.

### 9.3 Mỗi trang đúng một khuôn
1. `PageHeader` — tiêu đề, mô tả một dòng, vùng hành động bên phải. Bắt buộc mọi trang.
2. Dữ liệu dạng danh sách: **bắt buộc `components/ui/data-table`**. Không tự viết `<table>`.
   DataTable lo sẵn: sắp xếp, phân trang, trạng thái rỗng, trạng thái lỗi, khung xương khi tải.
3. Form: React Hook Form + Zod, nhãn trên ô, lỗi ngay dưới ô, không toast cho lỗi validate.
4. Modal/Drawer lấy từ `components/ui`, không tự dựng overlay.

### 9.4 Nút lưu phải có đủ 4 trạng thái
`rảnh` (bấm được, primary) · `đang lưu` (spinner, khoá) · `đã lưu` (KHÔNG phải nút — là dòng chữ
mờ kèm dấu tích, tự biến mất sau vài giây) · `lỗi` (nút trở lại trạng thái rảnh + thông báo lỗi).
Sai lầm cũ ở Menu Manager: "Đã lưu" vẫn là nút đỏ nhạt, người dùng không biết đã xong hay đang chờ bấm.

### 9.5 Tiếng Việt toàn bộ
Menu, breadcrumb, nhãn nút, thông báo đều tiếng Việt. Không trộn Việt–Anh trong cùng một cụm.
Ví dụ: "Homepage Builder" → "Trình dựng trang chủ"; "Menu Manager" → "Quản lý menu";
"Flash Sales" → "Giờ vàng". Giữ nguyên thuật ngữ đã là chuẩn ngành và không có từ Việt gọn hơn
(SKU, POS, CRM, RFQ, VAT).

### 9.6 Chống mẫu riêng của back office
- Widget của khách (chat, popup khuyến mãi) KHÔNG được xuất hiện trong back office.
- Không nhồi số liệu vào sidebar. Sidebar để điều hướng; số liệu thuộc về dashboard.
- Mọi con số tiền phải có đơn vị. "Doanh thu 0" là vô nghĩa — phải là "0 ₫" hoặc khung xương khi chưa tải.
- Ô nhập không được cắt cụt nội dung; đường dẫn/URL dùng ô rộng hết hàng hoặc có tooltip đầy đủ.
- Không bắt người dùng nhớ mã kỹ thuật (tên icon Lucide, mã màu): phải có bộ chọn.

## 10. Việc còn treo (chủ đích, không phải quên)

1. `frontend/src/dark-theme.css` giờ là **bridge tạm** (0 `!important`, map class legacy → token). Xoá khi wave 3 viết lại trang bằng token và bỏ import trong `main.tsx`.
2. `design-system/theme.ts` còn sống vì `components/atoms/index.tsx` import — W1-12 xoá cả hai.
3. `<MotionProvider>` chưa bọc `LazyMotion features={domAnimation} strict` (tiết kiệm ~25KB): 79 file còn dùng `motion.*`, bật `strict` sẽ ném lỗi, còn non-strict sẽ để component đứng ở `initial` = trang trắng. Bật sau khi wave 3 chuyển hết sang `m.*`.
4. Storefront có bật dark mode cho khách hay không: đang giả định **có** (token đã đủ cho cả hai).
5. Self-host font (subset `latin,vietnamese`) thay Google Fonts CDN: ảnh hưởng LCP + quyền riêng tư, chưa chốt.

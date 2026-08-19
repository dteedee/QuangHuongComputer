# HACOM.vn Design Reference (captured 2026-08-19 via Chrome)

Reference để apply layout/style vào Quang Hưởng Computer. KHÔNG copy logo/brand HACOM — chỉ lấy bố cục, tokens, patterns.

## Company info (masothue.com/0200807633) — dùng cho branding/footer/invoice
- Tên: **Công ty TNHH Máy Tính Quang Hưởng**
- Tên quốc tế: Quang Huong Computer Limited Company
- Tên viết tắt: Quang Huong Computer Co., Ltd.
- MST: **0200807633**
- Địa chỉ: Số 179 khu phố 3/2, Thị Trấn Vĩnh Bảo, Huyện Vĩnh Bảo, TP Hải Phòng, Việt Nam
- Địa chỉ thuế: Số 179 Khu phố 13/2 - TT Vĩnh Bảo, Xã Vĩnh Bảo, TP Hải Phòng
- Người đại diện: **Dương Thị Hạnh**
- Điện thoại: 031 3823769
- Ngày hoạt động: 2008-04-18 ("SINCE 2008" tagline)
- Loại hình: Công ty TNHH ngoài NN
- Quản lý bởi: Thuế cơ sở 8 TP Hải Phòng
- Tình trạng: Tạm ngừng KD có thời hạn (ghi nhận, không hiển thị public)

## Fonts
- Body: `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`
- Sizes: tiny .75rem / small .875rem / medium 1rem / large 1.125rem; product card ~13-14px

## Color palette (measured)
- **Brand red (primary)**: `#ED1B24` (rgb 237,27,36) — header topbar, price, CTA, sale badges
- Red hover/dark: `#CE0707`; tailwind red-500 `#EF4444` cũng dùng nhiều
- Text chính: `#1D1D20` (rgb 29,29,32)
- Navy accent: `#2F2F75`, `#243A76` (region pills, banners)
- Success green: `#2CC067` (Sẵn hàng ✓)
- Gray scale: border `#E5E7EB`, bg section `#F1F1F1`/`#F3F4F6`, text phụ `#6B7280`, `#4B5563`
- Light red bg: `#FEF2F2` (badge tiết kiệm)
- Yellow accent: `#FACC15`

## Design tokens (HSL, theo chuẩn HeroUI/NextUI mà hacom dùng)
```css
--primary: 212 100% 46.67%;      /* blue system color; brand đỏ dùng riêng */
--danger: 339.2 90.36% 51.18%;
--success: 145.96 79.46% 43.92%;
--warning: 37.03 91.27% 55.1%;
--radius-small: 8px; --radius-medium: 12px; --radius-large: 14px;
--shadow-small: 0 0 5px #00000005, 0 2px 10px #0000000f, 0 0 1px #0000004d;
--shadow-medium: 0 0 15px #00000008, 0 2px 30px #00000014, 0 0 1px #0000004d;
--shadow-large: 0 0 30px #0000000a, 0 30px 60px #0000001f, 0 0 1px #0000004d;
```
Stack: Tailwind CSS + HeroUI conventions + Swiper (carousel) + FontAwesome 6 icons.

## Layout — Homepage
1. **Top strip** (đỏ đậm, ~30px): tagline chuỗi dịch vụ + links ĐIỆN THOẠI/LAPTOP/PC/GAMING GEAR
2. **Utility bar** (trắng, 34px): hotline "Gọi mua hàng 1900.xxxx", pills khu vực (Miền Bắc/Trung/Nam, navy), Feedback, Tìm cửa hàng, Hỗ trợ, Trung tâm dịch vụ, Khuyến mãi, Tài khoản
3. **Main header** (trắng, 74px): logo | search bar bo tròn (border đỏ 2px, radius 20px trái, nút kính lúp đỏ) | social icons | "Xây dựng cấu hình PC" | "Tra cứu đơn hàng" | Giỏ hàng (badge số đỏ)
4. **Sticky header** khi scroll: gọn — nút "Danh mục" + logo + search + socials + giỏ hàng
5. **Body 3 cột**: sidebar category menu (trắng, ~240px, 22 mục, icon + label + chevron, hover đỏ) | hero carousel (swiper, arrows tròn trắng) + 2 banner phải | banner dọc ngoài cùng 2 bên (skyscraper)
6. **Banner grid**: 3-4 banner ngang dưới hero
7. **Product sections**: lặp lại theo category

## Product section pattern
- Header row: title UPPERCASE bold trái + brand filter pills (border, radius full, hover đỏ) + nút "Xem tất cả →" (đỏ, trắng text, radius)
- Grid 6 cột desktop (card trắng, radius 8px, border #E5E7EB, hover shadow-medium + translateY)

## Product card anatomy (top→bottom)
1. Ảnh sản phẩm (ratio vuông, padding), badge quà tặng góc phải trên
2. Row: ★★★★★ rating (xám nhạt) + "Mã: LTAC1001" (12px xám)
3. Tên SP: 13px, 3 dòng max, ellipsis, hover đỏ
4. Giá cũ gạch ngang xám 12px + "(Tiết kiệm 12%)" đỏ 12px
5. **Giá bán: 19.399.000₫** — đỏ #ED1B24, bold, 18px, ₫ superscript
6. Row: "✓ Sẵn hàng" xanh lá 13px + nút giỏ hàng đỏ tròn (36px) bên phải
7. Row promo icons nhỏ (voucher, quà tặng)

## Footer
1. Newsletter bar: "ĐĂNG KÝ NHẬN EMAIL..." + input + nút Gửi
2. Hệ thống showroom: số thứ tự tròn + tên + địa chỉ + tel + email + giờ mở cửa (→ thay bằng 1 cửa hàng Quang Hưởng: 179 khu phố 3/2, TT Vĩnh Bảo, Hải Phòng)
3. Cột links: Chính sách (bảo hành, giao hàng, đổi trả, trả góp...), Hướng dẫn (mua hàng, thanh toán), Tra cứu (đơn hàng, bảo hành, hóa đơn điện tử)
4. Bottom: thông tin pháp lý — tên công ty, MST, địa chỉ, người đại diện

## Key routes hacom (map sang hệ thống)
`/gio-hang`, `/buildpc` (xây dựng cấu hình), `/tra-don-hang`, `/tra-bao-hanh-tu-2025`, `/chinh-sach-*`, `/huong-dan-*`, `/khuyen-mai-*`, `/showroom`, `/login`, `/register`, `/san-pham-da-xem`

## Effects
- Card hover: shadow-medium + nhẹ translateY(-2px), transition 200ms
- Pills/buttons hover: opacity .8 hoặc đổi nền đỏ
- Carousel: swiper autoplay, nút arrow tròn trắng shadow
- Chat widgets nổi góc phải dưới (Facebook/Zalo) + bar "Chat mua hàng trực tuyến 8h-24h" đỏ
- Sticky compact header, category dropdown "Danh mục"

# Brand Assets

Nguồn màu chuẩn: `frontend/src/design-system/brand-tokens.ts`.

## Danh sách

| File | Kích thước | Dùng ở |
|------|-----------|--------|
| `logo.svg` | 200x48 | Header desktop, footer |
| `logo-mono.svg` | 200x48 | Hoá đơn in đen-trắng, tài liệu PDF |
| `logo-square.svg` | 64x64 | App icon, thumbnail, avatar |
| `og-default.svg` | 1200x630 | Open Graph mặc định (`SEO.tsx`) |
| `../favicon.svg` | 64x64 | Favicon (browser hiện đại đọc SVG) |
| `../apple-touch-icon.svg` | 180x180 | Home-screen icon iOS |

## TODO

- Sinh `favicon.ico` (16/32/48) từ `favicon.svg` bằng tool ngoài (ImageMagick / sharp).
  Lệnh gợi ý (chạy trên máy có `imagemagick`):
  ```
  magick favicon.svg -define icon:auto-resize=16,32,48 favicon.ico
  ```
- Sinh `apple-touch-icon.png` (180x180 PNG) nếu muốn tương thích tuyệt đối với iOS cũ.
- Nếu chủ shop có bản vẽ tay logo, thay `logo.svg` giữ nguyên viewBox 200x48.

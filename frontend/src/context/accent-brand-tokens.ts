/**
 * accent-brand-tokens — bộ giá trị `--brand*` cho 8 màu nhấn của back office.
 *
 * VÌ SAO CÓ FILE NÀY (sửa lỗi mất tính năng, design-guidelines §9.1):
 * Vỏ back office mới vẽ toàn bộ bằng token `--brand` cố định, nên bộ chọn "Màu chủ đạo"
 * trong `backoffice-theme-settings-panel.tsx` không còn ăn vào sidebar/topbar/nút nữa —
 * người dùng bấm mà không thấy gì đổi. Thay vì bắt từng component đọc `colors.primary`
 * của ThemeContext (đúng cái anti-pattern §9.1 cấm), màu nhấn GHI ĐÈ chính `--brand`
 * trên thẻ gốc `[data-shell="admin"]`. Đổi màu nhấn ⇒ mọi thứ dùng token đổi theo,
 * và storefront (không có `data-shell`) giữ nguyên đỏ thương hiệu.
 *
 * NGUỒN GIÁ TRỊ — không bịa:
 *  · `red` = chép NGUYÊN VĂN từ `styles/tokens.css` (`:root` cho sáng, `.dark` cho tối).
 *    Mặc định của hệ thống là `red`, nên vỏ mặc định KHÔNG đổi một pixel nào.
 *  · 7 màu còn lại = thang màu Tailwind CSS v3 chuẩn:
 *      brand/hover  = bậc 600→700 hoặc 700→800 (bậc nào đạt tương phản, xem bên dưới)
 *      subtle       = bậc 50 (sáng) / bậc 950 (tối)
 *      line         = bậc 200 (sáng) / bậc 900 (tối)
 *      text         = bậc 700 (sáng) / bậc 400 (tối)
 *
 * TƯƠNG PHẢN (WCAG 2.1 AA, đã đo bằng công thức tỉ lệ tương phản):
 *  · chữ trắng trên `--brand`  : thấp nhất 4.60 (pink) — đạt AA 4.5:1.
 *  · chữ trắng trên `--brand-hover`: thấp nhất 6.04 — hover luôn TỐI hơn brand
 *    (không sáng hơn) đúng để giữ AA ở cả hai chế độ.
 *  · `--brand-text` trên `--brand-subtle`: thấp nhất 4.84 (amber) — đạt AA.
 *  · `--brand-text` trên `--surface` tối: thấp nhất 6.61 — đạt AA.
 *  NGOẠI LỆ ĐÃ BIẾT: `red` chế độ tối có `--brand-hover` = 3.75:1 với chữ trắng.
 *  Đây là giá trị SẴN CÓ trong `tokens.css` (không thuộc quyền sửa của lô này), giữ
 *  nguyên để vỏ mặc định không đổi. Đã ghi vào báo cáo để chủ token xử lý.
 *
 * Định dạng: "R G B" (không `rgb()`) vì Tailwind dùng `rgb(var(--brand) / <alpha-value>)`.
 */
import type { AccentColor } from './ThemeContext';

export interface BrandTokenSet {
    brand: string;
    hover: string;
    subtle: string;
    line: string;
    text: string;
}

/** Chế độ sáng. */
export const ACCENT_BRAND_LIGHT: Record<AccentColor, BrandTokenSet> = {
    /* tokens.css :root — #D7202F / #B3141F / #FFF1F2 / #FFCDD2 / #C81828 */
    red: { brand: '215 32 47', hover: '179 20 31', subtle: '255 241 242', line: '255 205 210', text: '200 24 40' },
    /* Tailwind blue 600/700/50/200/700 */
    blue: { brand: '37 99 235', hover: '29 78 216', subtle: '239 246 255', line: '191 219 254', text: '29 78 216' },
    /* Tailwind emerald 700/800/50/200/700 — bậc 600 chỉ đạt 3.77:1 với chữ trắng nên bị loại */
    green: { brand: '4 120 87', hover: '6 95 70', subtle: '236 253 245', line: '167 243 208', text: '4 120 87' },
    /* Tailwind violet 600/700/50/200/700 */
    purple: { brand: '124 58 237', hover: '109 40 217', subtle: '245 243 255', line: '221 214 254', text: '109 40 217' },
    /* Tailwind orange 700/800/50/200/700 — bậc 600 chỉ đạt 3.56:1 nên bị loại */
    orange: { brand: '194 65 12', hover: '154 52 18', subtle: '255 247 237', line: '254 215 170', text: '194 65 12' },
    /* Tailwind pink 600/700/50/200/700 */
    pink: { brand: '219 39 119', hover: '190 24 93', subtle: '253 242 248', line: '251 207 232', text: '190 24 93' },
    /* Tailwind cyan 700/800/50/200/700 — bậc 600 chỉ đạt 3.68:1 nên bị loại */
    cyan: { brand: '14 116 144', hover: '21 94 117', subtle: '236 254 255', line: '165 243 252', text: '14 116 144' },
    /* Tailwind amber 700/800/50/200/700 — bậc 600 chỉ đạt 3.19:1 nên bị loại */
    amber: { brand: '180 83 9', hover: '146 64 14', subtle: '255 251 235', line: '253 230 138', text: '180 83 9' },
};

/** Chế độ tối. `brand`/`hover` giữ nguyên bậc của chế độ sáng vì đó là bậc duy nhất
 *  còn đạt AA với chữ trắng; chỉ `subtle`/`line`/`text` đổi sang bậc 950/900/400. */
export const ACCENT_BRAND_DARK: Record<AccentColor, BrandTokenSet> = {
    /* tokens.css .dark — #E02635 / #F0424F / #3A1014 / #6E1A22 / #FF6B75 */
    red: { brand: '224 38 53', hover: '240 66 79', subtle: '58 16 20', line: '110 26 34', text: '255 107 117' },
    blue: { brand: '37 99 235', hover: '29 78 216', subtle: '23 37 84', line: '30 58 138', text: '96 165 250' },
    green: { brand: '4 120 87', hover: '6 95 70', subtle: '2 44 34', line: '6 78 59', text: '52 211 153' },
    purple: { brand: '124 58 237', hover: '109 40 217', subtle: '46 16 101', line: '76 29 149', text: '167 139 250' },
    orange: { brand: '194 65 12', hover: '154 52 18', subtle: '67 20 7', line: '124 45 18', text: '251 146 60' },
    pink: { brand: '219 39 119', hover: '190 24 93', subtle: '80 7 36', line: '131 24 67', text: '244 114 182' },
    cyan: { brand: '14 116 144', hover: '21 94 117', subtle: '8 51 68', line: '22 78 99', text: '34 211 238' },
    amber: { brand: '180 83 9', hover: '146 64 14', subtle: '69 26 3', line: '120 53 15', text: '251 191 36' },
};

/** Ô xem trước trong bộ chọn — chấm màu, dùng đúng bậc `brand` của chế độ sáng. */
export const accentSwatchStyle = (accent: AccentColor): { backgroundColor: string } => ({
    backgroundColor: `rgb(${ACCENT_BRAND_LIGHT[accent].brand})`,
});

const block = (selector: string, t: BrandTokenSet) =>
    `${selector}{--brand:${t.brand};--brand-hover:${t.hover};--brand-subtle:${t.subtle};` +
    `--brand-line:${t.line};--brand-text:${t.text};}`;

/**
 * CSS ghi đè `--brand*` cho vỏ admin.
 *
 * Hai quy tắc, cùng độ đặc hiệu hoặc cao hơn quy tắc gốc trong `tokens.css`, và được
 * chèn SAU nó trong cascade nên thắng:
 *   `[data-shell='admin']`       (0,1,0) ≥ `:root` → đè bộ sáng
 *   `.dark [data-shell='admin']` (0,2,0) > `.dark` → đè bộ tối
 * Storefront không có `data-shell` ⇒ đỏ thương hiệu không bao giờ bị đổi.
 */
export const accentBrandCss = (accent: AccentColor): string =>
    block("[data-shell='admin']", ACCENT_BRAND_LIGHT[accent]) +
    block(".dark [data-shell='admin']", ACCENT_BRAND_DARK[accent]);

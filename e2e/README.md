# Bộ smoke E2E (Playwright) — track W4-4

Mục tiêu: **~20 kịch bản bắt đúng loại lỗi mà dự án đã thật sự phát hành**
(checkout tin số tiền client gửi lên, API thiếu kiểm quyền, role nhân viên vào
back-office thấy menu trống, sitemap sai định dạng, 404 ra màn hình trắng),
chứ không phải 200 test chạy qua cho có.

## Chạy ở máy dev

```bash
# 1) API TEST :5050 phải đang chạy (chỉ orchestrator được dựng)
scripts/qh-test-env.sh status

# 2) Frontend TEST :5175 — trỏ vào API TEST, KHÔNG phải :5174 của chủ cửa hàng
cd frontend && \
  VITE_API_URL=http://localhost:5050 \
  VITE_SIGNALR_HUB_URL=http://localhost:5050/hubs/chat \
  VITE_SOCKET_URL=http://localhost:5050 \
  VITE_GOOGLE_CLIENT_ID= \
  npx vite --port 5175 --strictPort --host 127.0.0.1

# 3) Chạy test (từ gốc repo)
npx playwright test                       # tất cả
npx playwright test --project=desktop     # 1440x900
npx playwright test --project=mobile      # 390x844
npx playwright test --grep-invert "@known-bug|@needs-test-api-rebuild"   # mốc XANH cho gate
```

`VITE_SIGNALR_HUB_URL`/`VITE_SOCKET_URL` **bắt buộc** phải ghi đè: mặc định trong
`.env` trỏ về `:5000`, tức là trang TEST sẽ mở WebSocket vào API thật của chủ cửa hàng.

## An toàn (D12) — đã cài vào code, không phải lời hứa

`e2e/fixtures/safety-guard.ts` **ném lỗi ngay khi nạp** nếu `E2E_API_URL` không
phải `:5050`. Bộ test này có ghi dữ liệu (đăng ký tài khoản, đặt đơn) nên không
được phép trỏ nhầm sang stack thật. Nó cũng không bao giờ gọi endpoint ghi nào
lên `users`/`roles` — một agent audit từng xoá role `Admin` bằng cách "thử xem có
bị chặn không".

Dữ liệu test: mỗi lần chạy tự đăng ký tài khoản `e2e-<mã>-<hậu tố>@example.com`,
tự đặt đơn rồi **tự huỷ** ở `afterAll` (huỷ cũng nhập lại tồn kho). Không sửa,
không xoá bất kỳ dòng dữ liệu nào có sẵn.

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `E2E_BASE_URL` | `http://localhost:5175` | Frontend TEST |
| `E2E_API_URL` | `http://localhost:5050` | API TEST (bắt buộc cổng 5050) |
| `E2E_BROWSER_CHANNEL` | `chrome` | Dùng Chrome hệ thống; đặt `chromium` khi CI đã `npx playwright install` |
| `E2E_AUTH_LIMIT` | `6` | Số lần gọi `/api/auth/*` cho phép trong 60s (hạn mức server là 10/IP) |
| `E2E_PW_<ROLE>` / `E2E_MAIL_<ROLE>` | tài khoản demo dev | Ghi đè thông tin đăng nhập; **không commit mật khẩu thật** |

## Tag

- `@known-bug` — test đúng, sản phẩm đang sai. Đang ĐỎ **cố ý**; xem
  `plans/260917-2100-full-system-overhaul/reports/w4-4-report.md` để biết IR tương ứng.
  Sửa xong lỗi thì gỡ tag.
- `@needs-test-api-rebuild` — không kiểm được cho tới khi API TEST được dựng lại
  từ mã nguồn hiện tại.

## Cài đặt Playwright (hiện chưa có trong repo)

Repo **không có `package.json` ở gốc** nên `@playwright/test` chưa phải dependency
được khai báo. Hiện bộ test chạy nhờ bản nằm sẵn trong cache của `npx`. Việc cần
làm ở gate (nằm ngoài quyền sở hữu tệp của track này):

```jsonc
// package.json ở gốc repo
{ "devDependencies": { "@playwright/test": "1.63.0" },
  "scripts": { "test:e2e": "playwright test" } }
```

rồi `npm install && npx playwright install chromium`. Khi đó bỏ được
`E2E_BROWSER_CHANNEL=chrome`.

## Chốt phạm vi (bổ sung sau rà soát đối kháng, 2026-09-19)

- `E2E_ALLOW_READONLY_WEB=1` **không còn** là lời hứa suông: `fixtures/safety-guard.ts`
  xuất `assertWebTargetAllowed()` và `fixtures/test-base.ts` gọi nó qua một fixture
  `auto` cho MỌI test. Khi `baseURL` không phải `:5175`, test nào không có tag
  `@readonly` trong tiêu đề sẽ **hỏng ngay trước khi mở trang**.
- Bộ lọc lỗi console chỉ bỏ qua 404 của **tệp ảnh/phông tĩnh** (khớp cả phần đuôi
  tệp trong URL). Một `404` của `/api/...` hay một chunk JS thiếu sẽ làm spec đỏ.

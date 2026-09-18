import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Cấm gọi fetch() trần trong src/pages và src/components — luôn đi qua client axios
    // dùng chung (api/client.ts, có interceptor gắn token + xử lý 401) thay vì tự viết
    // lại header/refresh-token ở từng nơi (đã có 2 bug thật kiểu này: AccountPage.tsx bỏ
    // qua salesApi.orders.cancel() có sẵn, kpi-dashboard-widgets.tsx nuốt lỗi mạng lặng lẽ).
    // Severity 'warn' (không 'error') — nhiều file khác đang có fetch() trần nằm ngoài
    // phạm vi track này (W0-7), 'error' sẽ chặn `fe-lint` của các track khác không liên quan.
    files: ['src/pages/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: "CallExpression[callee.name='fetch']",
          message: 'Dùng client axios dùng chung (api/*.ts, ví dụ api/client.ts) thay vì fetch() trần — trừ khi gọi API bên thứ ba khác origin, lúc đó thêm eslint-disable-next-line kèm lý do.',
        },
      ],
    },
  },
  {
    // W1-8 / D11: mọi URL phải đi qua ROUTES/paths (frontend/src/routes) thay vì chuỗi cứng —
    // trước đợt này có ~110 chỗ hard-code (/products, /login, /catalog, /policy/, ...) rải khắp
    // FE, khiến đổi 1 route phải sửa N file. `routes/**` (nơi ROUTES/paths ĐƯỢC khai báo) và
    // `standalone.routes.ts`-style literal path definitions tự loại trừ vì rule chỉ bật ngoài
    // `routes/**`. Severity 'warn' — hàng trăm chỗ hiện có (W3-* dọn dần), 'error' sẽ chặn
    // `fe-lint` của mọi track khác ngay lập tức.
    files: ['src/pages/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/layouts/**/*.{ts,tsx}'],
    ignores: ['src/routes/**'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          // esquery's attribute-regex parser mis-terminates on an escaped `/` inside the
          // pattern (`/^\//` throws "Invalid regular expression") — `\x2F` sidesteps it.
          selector: "CallExpression[callee.name='navigate'][arguments.0.type='Literal'][arguments.0.value=/^\\x2F/]",
          message: 'Dùng `paths.*`/`ROUTES` từ frontend/src/routes thay vì chuỗi route hard-code trong navigate(...).',
        },
        {
          selector: "JSXAttribute[name.name='to'] > Literal[value=/^\\x2F/]",
          message: 'Dùng `paths.*`/`ROUTES` từ frontend/src/routes thay vì chuỗi route hard-code trong to="...".',
        },
      ],
    },
  },
  {
    // D11: localStorage/sessionStorage trần có thể throw (Safari private mode, site data bị
    // chặn, quota đầy) — mọi nơi ngoài lib/** phải qua wrapper an toàn `lib/browser-storage.ts`
    // (W1-13, mọi read/write đã bọc try/catch). Severity 'warn' — nhiều file khác đang dùng
    // trực tiếp ngoài phạm vi track này.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/**'],
    rules: {
      'no-restricted-globals': [
        'warn',
        { name: 'localStorage', message: 'Dùng browserStorage từ lib/browser-storage.ts thay vì localStorage trực tiếp.' },
        { name: 'sessionStorage', message: 'Dùng sessionBrowserStorage từ lib/browser-storage.ts thay vì sessionStorage trực tiếp.' },
      ],
    },
  },
)

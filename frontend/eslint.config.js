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
)

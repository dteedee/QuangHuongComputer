import { useState } from 'react';

interface TwoFactorPromptProps {
  onVerify: (code: string) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
}

export default function TwoFactorPrompt({ onVerify, onCancel, loading, error }: TwoFactorPromptProps) {
  const [code, setCode] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6 && !loading) {
      onVerify(code);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-bold mb-2">Xác thực 2 bước</h2>
        <p className="text-sm text-gray-600 mb-4">
          Nhập mã 6 số từ ứng dụng Authenticator của bạn
        </p>
        {error && (
          <p className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={handleKeyDown}
          placeholder="000000"
          className="w-full border rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={() => onVerify(code)}
            disabled={code.length !== 6 || loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Đang xác thực...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';

interface TwoFactorPromptProps {
  /** Seconds left before `challengeToken` dies (docs/api-contracts/identity.md §1: default 300s). */
  expiresInSeconds?: number;
  onVerify: (payload: { code?: string; backupCode?: string }) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
}

/**
 * Step 2 of login (`POST /auth/login/2fa`). Mounted inline by `LoginPage` once the backend
 * answers `{ requiresTwoFactor: true }` — not a modal, so it fits the same form-kit card the
 * password step used and framer-motion can cross-fade between the two steps.
 */
export default function TwoFactorPrompt({ onVerify, onCancel, loading, error }: TwoFactorPromptProps) {
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);

  const canSubmit = useBackup ? backupCode.trim().length > 0 : code.length === 6;

  const submit = () => {
    if (!canSubmit || loading) return;
    onVerify(useBackup ? { backupCode: backupCode.trim() } : { code });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex flex-col items-center mb-6 text-center">
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-3">
          <ShieldCheck size={28} className="text-accent" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Xác thực hai lớp</h1>
        <p className="text-sm text-gray-500 mt-1">
          {useBackup
            ? 'Nhập một mã dự phòng chưa dùng. Mỗi mã chỉ dùng được một lần.'
            : 'Nhập mã 6 số từ ứng dụng xác thực (Google Authenticator, Authy...).'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {useBackup ? (
        <input
          type="text"
          value={backupCode}
          onChange={(e) => setBackupCode(e.target.value.trim())}
          onKeyDown={handleKeyDown}
          placeholder="Mã dự phòng"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-lg font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-accent"
          autoFocus
        />
      ) : (
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={handleKeyDown}
          placeholder="000000"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-accent"
          autoFocus
        />
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || loading}
          className="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Đang xác thực...' : 'Xác nhận'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setUseBackup((v) => !v);
          setCode('');
          setBackupCode('');
        }}
        className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-accent hover:underline cursor-pointer"
      >
        <KeyRound size={14} />
        {useBackup ? 'Dùng mã từ ứng dụng xác thực' : 'Không có ứng dụng xác thực? Dùng mã dự phòng'}
      </button>
    </motion.div>
  );
}

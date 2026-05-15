import { useState, useEffect } from 'react';
import { setup2FA, verify2FASetup, disable2FA, get2FAStatus } from '../../../api/auth';

type Step = 'status' | 'setup' | 'done';

export default function TwoFactorSetupPage() {
  const [status, setStatus] = useState<{ isEnabled: boolean; enabledDate?: string }>({ isEnabled: false });
  const [setupData, setSetupData] = useState<{ secret: string; qrUri: string } | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('status');
  const [error, setError] = useState('');

  useEffect(() => {
    get2FAStatus().then(setStatus).catch(() => {});
  }, []);

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await setup2FA();
      setSetupData(data);
      setStep('setup');
    } catch {
      setError('Lỗi khởi tạo 2FA. Vui lòng thử lại.');
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await verify2FASetup(code);
      setBackupCodes(data.backupCodes);
      setStep('done');
      setStatus({ isEnabled: true });
    } catch {
      setError('Mã xác thực không đúng. Vui lòng thử lại.');
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    if (!confirm('Bạn chắc chắn muốn tắt 2FA?')) return;
    try {
      await disable2FA();
      setStatus({ isEnabled: false });
      setStep('status');
    } catch {
      setError('Không thể tắt 2FA. Vui lòng thử lại.');
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Xác thực 2 bước (2FA)</h1>

      {step === 'status' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-3 h-3 rounded-full ${status.isEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-medium">{status.isEnabled ? 'Đã bật 2FA' : 'Chưa bật 2FA'}</span>
          </div>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          {status.isEnabled ? (
            <button onClick={handleDisable} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Tắt 2FA
            </button>
          ) : (
            <button onClick={handleSetup} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Đang khởi tạo...' : 'Bật 2FA'}
            </button>
          )}
        </div>
      )}

      {step === 'setup' && setupData && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-semibold">Quét mã QR bằng Google Authenticator</h2>
          <div className="bg-gray-100 p-4 rounded text-center">
            <p className="text-sm text-gray-600 mb-2">Mã bí mật (nhập thủ công):</p>
            <code className="text-lg font-mono bg-white px-3 py-1 rounded">{setupData.secret}</code>
          </div>
          <p className="text-sm text-gray-600">
            URI: <code className="text-xs break-all">{setupData.qrUri}</code>
          </p>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3">
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Nhập mã 6 số"
              className="border rounded-lg px-3 py-2 w-40 text-center text-lg"
            />
            <button
              onClick={handleVerify}
              disabled={code.length !== 6 || loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Đang xác nhận...' : 'Xác nhận'}
            </button>
            <button onClick={() => setStep('status')} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              Hủy
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <span className="text-2xl">✅</span>
            <h2 className="font-semibold">2FA đã được bật thành công!</h2>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Mã khôi phục (lưu lại ngay!)</h3>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((c, i) => (
                <code key={i} className="bg-white px-2 py-1 rounded text-center font-mono text-sm">{c}</code>
              ))}
            </div>
          </div>
          <button onClick={() => setStep('status')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Hoàn tất
          </button>
        </div>
      )}
    </div>
  );
}

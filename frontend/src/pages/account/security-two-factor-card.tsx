import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { get2FAStatus, setup2FA, verify2FASetup, disable2FA } from '../../api/auth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useConfirm } from '../../context/ConfirmContext';

/**
 * Bật/tắt 2FA (TOTP) — `POST /identity/2fa/setup|verify-setup|disable`, `GET /identity/2fa/status`
 * (đã có sẵn trong `api/auth.ts`).
 */
export const TwoFactorCard = () => {
    const confirm = useConfirm();
    const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [setupData, setSetupData] = useState<{ secret: string; qrUri: string } | null>(null);
    const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
    const [code, setCode] = useState('');
    const [isBusy, setIsBusy] = useState(false);

    const loadStatus = async () => {
        setIsLoading(true);
        try {
            const s = await get2FAStatus();
            setIsEnabled(s.isEnabled);
        } catch {
            toast.error('Không tải được trạng thái 2FA');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void loadStatus(); }, []);

    const handleStartSetup = async () => {
        setIsBusy(true);
        try {
            const data = await setup2FA();
            setSetupData(data);
        } catch {
            toast.error('Không khởi tạo được 2FA');
        } finally {
            setIsBusy(false);
        }
    };

    const handleVerify = async () => {
        if (!code.trim()) { toast.error('Vui lòng nhập mã xác thực'); return; }
        setIsBusy(true);
        try {
            const res = await verify2FASetup(code.trim());
            setBackupCodes(res.backupCodes);
            setSetupData(null);
            setCode('');
            toast.success('Đã bật xác thực 2 bước');
            await loadStatus();
        } catch (err) {
            const anyErr = err as { response?: { data?: { Error?: string } } };
            toast.error(anyErr.response?.data?.Error || 'Mã xác thực không đúng');
        } finally {
            setIsBusy(false);
        }
    };

    const handleDisable = async () => {
        const ok = await confirm({ message: 'Tắt xác thực 2 bước? Tài khoản sẽ kém an toàn hơn.', variant: 'warning' });
        if (!ok) return;
        setIsBusy(true);
        try {
            await disable2FA();
            toast.success('Đã tắt xác thực 2 bước');
            await loadStatus();
        } catch {
            toast.error('Không tắt được 2FA');
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-2"><Smartphone size={16} /> Xác thực 2 bước (2FA)</h2>
                {!isLoading && (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isEnabled ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
                        {isEnabled ? 'Đang bật' : 'Đang tắt'}
                    </span>
                )}
            </div>

            {isLoading ? (
                <div className="h-10 rounded-lg bg-gray-100 animate-pulse" />
            ) : backupCodes ? (
                <div className="space-y-3">
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        Lưu lại các mã dự phòng sau — mỗi mã chỉ dùng được một lần khi bạn mất thiết bị xác thực.
                    </p>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                        {backupCodes.map((c) => (
                            <div key={c} className="bg-gray-50 rounded-lg px-3 py-2 text-center">{c}</div>
                        ))}
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setBackupCodes(null)}>Đã lưu xong</Button>
                </div>
            ) : isEnabled ? (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Tài khoản của bạn đang được bảo vệ bằng xác thực 2 bước.</p>
                    <Button variant="ghost" size="sm" onClick={handleDisable} loading={isBusy}>Tắt 2FA</Button>
                </div>
            ) : setupData ? (
                <div className="space-y-3">
                    <p className="text-sm text-gray-600">Quét mã QR bằng ứng dụng xác thực (Google Authenticator, Authy...) rồi nhập mã 6 số.</p>
                    <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono break-all">{setupData.qrUri}</div>
                    <p className="text-xs text-gray-400">Mã bí mật: <span className="font-mono">{setupData.secret}</span></p>
                    <div className="flex gap-2 items-end">
                        <Input label="Mã xác thực" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} className="max-w-[160px]" />
                        <Button variant="primary" onClick={handleVerify} loading={isBusy}>Xác nhận</Button>
                        <Button variant="ghost" onClick={() => setSetupData(null)}>Hủy</Button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Bật xác thực 2 bước để tăng cường bảo mật tài khoản.</p>
                    <Button variant="primary" size="sm" onClick={handleStartSetup} loading={isBusy}>Bật 2FA</Button>
                </div>
            )}
        </div>
    );
};

export default TwoFactorCard;

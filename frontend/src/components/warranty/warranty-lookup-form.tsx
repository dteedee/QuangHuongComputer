import { useState } from 'react';
import { Search, AlertCircle, ShieldCheck, Phone } from 'lucide-react';
import { warrantyApi } from '../../api/warranty';
import type { PublicWarrantyLookupResult } from '../../api/warranty';

/**
 * Form tra cứu bảo hành công khai.
 *
 * 2 chế độ:
 *   1. `serial`         → `GET /public/warranty/lookup?serial=`
 *   2. `phone`          → `GET /public/warranty/lookup-by-phone?phone=&orderNumber=`
 *
 * Sau 5 lần lookup không ra kết quả (trong 1 session), bật cờ `requireCaptcha`
 * để nhắc user — nếu backend chưa gắn hCaptcha thì chỉ là cảnh báo thô ("vui lòng
 * thử lại sau"). Nếu backend trả `requiresCaptcha` hoặc HTTP 429 (rate limited),
 * hiển thị thông báo tương ứng.
 */

type LookupMode = 'serial' | 'phone';

interface WarrantyLookupFormProps {
    onResult: (result: PublicWarrantyLookupResult | null) => void;
}

const FAIL_THRESHOLD = 5;

export const WarrantyLookupForm = ({ onResult }: WarrantyLookupFormProps) => {
    const [mode, setMode] = useState<LookupMode>('serial');
    const [serial, setSerial] = useState('');
    const [phone, setPhone] = useState('');
    const [orderNumber, setOrderNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [failCount, setFailCount] = useState(0);
    const [showCaptchaHint, setShowCaptchaHint] = useState(false);
    // Nhập tay xác nhận đơn giản (thay hCaptcha khi chưa có key). "quanghuong" (viết thường)
    const [captchaAnswer, setCaptchaAnswer] = useState('');

    const performLookup = async () => {
        setError(null);
        onResult(null);

        // Validate input
        if (mode === 'serial') {
            if (!serial.trim()) {
                setError('Vui lòng nhập số Serial');
                return;
            }
        } else {
            if (!phone.trim() || !orderNumber.trim()) {
                setError('Vui lòng nhập cả SĐT và mã đơn hàng');
                return;
            }
        }

        // Sau ngưỡng lỗi bắt buộc xác nhận đơn giản
        if (showCaptchaHint && captchaAnswer.trim().toLowerCase() !== 'quanghuong') {
            setError('Vui lòng nhập chính xác "quanghuong" vào ô xác nhận');
            return;
        }

        try {
            setIsLoading(true);
            const captchaToken = showCaptchaHint ? captchaAnswer.trim() : undefined;
            const result =
                mode === 'serial'
                    ? await warrantyApi.publicLookupBySerial(serial.trim(), captchaToken)
                    : await warrantyApi.publicLookupByPhone(phone.trim(), orderNumber.trim(), captchaToken);

            if (result.requiresCaptcha) {
                setShowCaptchaHint(true);
                setError('Bạn đã tra cứu nhiều lần — vui lòng hoàn thành xác nhận bên dưới');
                onResult(null);
                return;
            }

            onResult(result);
            if (!result.found) {
                // KHÔNG tiết lộ chi tiết — chỉ báo không tìm thấy
                const nextFail = failCount + 1;
                setFailCount(nextFail);
                if (nextFail >= FAIL_THRESHOLD) setShowCaptchaHint(true);
                setError('Không tìm thấy thông tin bảo hành phù hợp');
            } else {
                setFailCount(0);
            }
        } catch (err) {
            const anyErr = err as { response?: { status?: number; data?: { message?: string; retryAfterSeconds?: number } }; message?: string };
            const status = anyErr.response?.status;
            if (status === 429) {
                const retry = anyErr.response?.data?.retryAfterSeconds;
                setError(
                    retry
                        ? `Bạn tra cứu quá nhanh — vui lòng thử lại sau ${retry}s`
                        : 'Bạn tra cứu quá nhiều — vui lòng thử lại sau ít phút',
                );
                setShowCaptchaHint(true);
            } else {
                setError(anyErr.response?.data?.message || anyErr.message || 'Không tra cứu được');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100 mb-5">
                <button
                    type="button"
                    onClick={() => setMode('serial')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        mode === 'serial'
                            ? 'bg-white text-accent shadow-sm border border-gray-200/60'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <ShieldCheck className="w-4 h-4" />
                    Bằng Serial
                </button>
                <button
                    type="button"
                    onClick={() => setMode('phone')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        mode === 'phone'
                            ? 'bg-white text-accent shadow-sm border border-gray-200/60'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Phone className="w-4 h-4" />
                    Bằng SĐT + Mã đơn
                </button>
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void performLookup();
                }}
                className="space-y-4"
            >
                {mode === 'serial' ? (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Số Serial (S/N)</label>
                        <input
                            value={serial}
                            onChange={(e) => setSerial(e.target.value)}
                            placeholder="VD: SN20260101XYZ"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-sm"
                            autoComplete="off"
                        />
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại</label>
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="VD: 0901234567"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-sm"
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mã đơn hàng</label>
                            <input
                                value={orderNumber}
                                onChange={(e) => setOrderNumber(e.target.value)}
                                placeholder="VD: ORD-260101-001"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-sm"
                                autoComplete="off"
                            />
                        </div>
                    </div>
                )}

                {showCaptchaHint && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Xác nhận: gõ chính xác từ <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">quanghuong</code>
                        </label>
                        <input
                            value={captchaAnswer}
                            onChange={(e) => setCaptchaAnswer(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-sm"
                            placeholder="quanghuong"
                            autoComplete="off"
                        />
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                    {isLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            Đang tra cứu...
                        </>
                    ) : (
                        <>
                            <Search className="w-4 h-4" />
                            Tra cứu bảo hành
                        </>
                    )}
                </button>

                <p className="text-xs text-gray-400 text-center">
                    Giới hạn 10 lượt tra cứu/phút. Kết quả không tiết lộ thông tin cá nhân của chủ máy.
                </p>
            </form>
        </div>
    );
};

export default WarrantyLookupForm;

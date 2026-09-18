import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Search, ShieldCheck, Loader2 } from 'lucide-react';
import { ROUTES } from '../../routes/route-paths';
import { warrantyPublicApi } from '../../api/warranty/public';
import type { WarrantyCoverage, ResolutionPreference } from '../../api/warranty/types';
import { validationMessages as msg } from '../../lib/validation/messages';
import SEO from '../../components/SEO';

type LookupMode = 'serial' | 'order';

/**
 * `/tai-khoan/bao-hanh/yeu-cau-moi` — tạo yêu cầu bảo hành từ MỘT serial (nhập trực tiếp) hoặc từ
 * MỘT mã đơn hàng (chọn 1 trong các sản phẩm/serial của đơn — spec: "create a claim from an order
 * item or serial"). Backend chỉ nhận `serialNumber`, nên bước "từ đơn hàng" chỉ là cách tìm ra
 * đúng serial trước khi gửi cùng endpoint `POST /warranty/claims`.
 */
export const WarrantyClaimPage = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<LookupMode>('serial');
    const [serialInput, setSerialInput] = useState('');
    const [orderInput, setOrderInput] = useState('');
    const [coverageOptions, setCoverageOptions] = useState<WarrantyCoverage[]>([]);
    const [selectedCoverage, setSelectedCoverage] = useState<WarrantyCoverage | null>(null);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [lookupLoading, setLookupLoading] = useState(false);

    const [issueDescription, setIssueDescription] = useState('');
    const [preferredResolution, setPreferredResolution] = useState<ResolutionPreference>('Repair');
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const runLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLookupError(null);
        setSelectedCoverage(null);
        setCoverageOptions([]);
        setLookupLoading(true);
        try {
            if (mode === 'serial') {
                const coverage = await warrantyPublicApi.lookupCoverage(serialInput.trim());
                setSelectedCoverage(coverage);
            } else {
                const list = await warrantyPublicApi.lookupByInvoice(orderInput.trim());
                if (list.length === 0) setLookupError('Không tìm thấy sản phẩm nào có bảo hành trong đơn này.');
                setCoverageOptions(list);
            }
        } catch (err) {
            setLookupError((err as Error).message || 'Không tra cứu được. Vui lòng kiểm tra lại thông tin.');
        } finally {
            setLookupLoading(false);
        }
    };

    const submitClaim = useMutation({
        mutationFn: () => warrantyPublicApi.createClaim({
            serialNumber: selectedCoverage!.serialNumber,
            issueDescription,
            preferredResolution,
        }),
        onSuccess: () => navigate(ROUTES.MY_WARRANTIES, { state: { claimCreated: true } }),
    });

    const handleSubmitClaim = (e: React.FormEvent) => {
        e.preventDefault();
        const errs: Record<string, string> = {};
        if (!selectedCoverage) errs.serial = 'Vui lòng chọn sản phẩm cần bảo hành ở trên.';
        if (!issueDescription.trim()) errs.issueDescription = msg.requireInput('mô tả lỗi');
        setFormErrors(errs);
        if (Object.keys(errs).length > 0) return;
        submitClaim.mutate();
    };

    return (
        <div className="bg-gray-50 min-h-screen py-8">
            <SEO title="Tạo yêu cầu bảo hành" noindex />
            <div className="max-w-2xl mx-auto px-4">
                <Link to={ROUTES.MY_WARRANTIES} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent mb-4">
                    <ArrowLeft size={14} /> Bảo hành của tôi
                </Link>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
                    <h1 className="text-xl font-bold text-gray-900 mb-1">Tạo yêu cầu bảo hành</h1>
                    <p className="text-sm text-gray-500 mb-6">Tìm sản phẩm bằng số serial hoặc mã đơn hàng, sau đó mô tả tình trạng lỗi.</p>

                    <div className="flex gap-2 mb-4">
                        <button
                            type="button"
                            onClick={() => setMode('serial')}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${mode === 'serial' ? 'border-accent bg-red-50 text-accent' : 'border-gray-200 text-gray-500'}`}
                        >
                            Theo số Serial
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('order')}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${mode === 'order' ? 'border-accent bg-red-50 text-accent' : 'border-gray-200 text-gray-500'}`}
                        >
                            Theo mã đơn hàng
                        </button>
                    </div>

                    <form onSubmit={runLookup} className="flex gap-2 mb-4">
                        <input
                            value={mode === 'serial' ? serialInput : orderInput}
                            onChange={(e) => (mode === 'serial' ? setSerialInput(e.target.value) : setOrderInput(e.target.value))}
                            placeholder={mode === 'serial' ? 'Nhập số Serial (S/N)' : 'Nhập mã đơn hàng'}
                            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm"
                        />
                        <button
                            type="submit"
                            disabled={lookupLoading || !(mode === 'serial' ? serialInput.trim() : orderInput.trim())}
                            className="px-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-40 inline-flex items-center gap-1.5"
                        >
                            {lookupLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Tìm
                        </button>
                    </form>

                    {lookupError && <p className="text-sm text-red-600 mb-4">{lookupError}</p>}

                    {mode === 'order' && coverageOptions.length > 0 && (
                        <div className="space-y-2 mb-4">
                            {coverageOptions.map((c) => (
                                <button
                                    type="button"
                                    key={c.serialNumber}
                                    onClick={() => setSelectedCoverage(c)}
                                    className={`w-full text-left p-4 rounded-xl border flex items-center justify-between gap-3 ${selectedCoverage?.serialNumber === c.serialNumber ? 'border-accent bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">{c.productName || c.serialNumber}</p>
                                        <p className="text-xs text-gray-500">S/N: {c.serialNumber}</p>
                                    </div>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                        {c.isValid ? 'Còn bảo hành' : 'Hết bảo hành'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedCoverage && (
                        <>
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-5 flex items-start gap-3">
                                <ShieldCheck className={selectedCoverage.isValid ? 'text-emerald-600' : 'text-red-500'} size={20} />
                                <div className="text-sm">
                                    <p className="font-semibold text-gray-900">{selectedCoverage.productName || selectedCoverage.serialNumber}</p>
                                    <p className="text-gray-500">
                                        {selectedCoverage.isValid
                                            ? `Còn bảo hành đến ${new Date(selectedCoverage.expirationDate).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
                                            : 'Sản phẩm này đã hết hạn bảo hành — yêu cầu sẽ do nhân viên xem xét thủ công.'}
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmitClaim} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Mô tả tình trạng lỗi</label>
                                    <textarea
                                        value={issueDescription}
                                        onChange={(e) => setIssueDescription(e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm min-h-[100px] ${formErrors.issueDescription ? 'border-red-400 bg-red-50/50' : 'border-gray-200'}`}
                                        placeholder="Sản phẩm đang gặp vấn đề gì?"
                                    />
                                    {formErrors.issueDescription && <p className="text-red-500 text-xs mt-1">{formErrors.issueDescription}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Mong muốn xử lý</label>
                                    <select
                                        value={preferredResolution}
                                        onChange={(e) => setPreferredResolution(e.target.value as ResolutionPreference)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm"
                                    >
                                        <option value="Repair">Sửa chữa</option>
                                        <option value="Replace">Đổi sản phẩm mới</option>
                                    </select>
                                </div>
                                {submitClaim.isError && (
                                    <p className="text-sm text-red-600">
                                        {(submitClaim.error as { response?: { data?: { error?: string } } })?.response?.data?.error
                                            || 'Không gửi được yêu cầu. Vui lòng thử lại.'}
                                    </p>
                                )}
                                <button
                                    type="submit"
                                    disabled={submitClaim.isPending}
                                    className="w-full py-3 bg-accent text-white font-semibold rounded-xl text-sm disabled:opacity-50"
                                >
                                    {submitClaim.isPending ? 'Đang gửi...' : 'Gửi yêu cầu bảo hành'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WarrantyClaimPage;

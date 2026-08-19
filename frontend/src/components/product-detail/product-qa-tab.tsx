import { useState } from 'react';
import { MessageCircle, Send, HelpCircle, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { contentApi } from '../../api/content';
import { useCompanyInfo } from '../../hooks/use-company-info';

/**
 * Tab hỏi đáp sản phẩm.
 * Backend chưa có module Q&A công khai (list câu hỏi + trả lời theo sản phẩm),
 * nên tab này hiển thị empty-state trung thực và cho phép gửi câu hỏi qua
 * kênh "Liên hệ" thật (POST /api/content/contact) — nhân viên tư vấn sẽ phản hồi
 * trực tiếp qua điện thoại/email thay vì hiển thị câu trả lời công khai giả.
 */
export default function ProductQaTab({ productId, productName }: { productId: string; productName?: string }) {
    const { companyInfo } = useCompanyInfo();
    const [question, setQuestion] = useState('');
    const [askerName, setAskerName] = useState('');
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (question.trim().length < 10) {
            toast.error('Câu hỏi cần tối thiểu 10 ký tự.');
            return;
        }
        if (!phone.trim()) {
            toast.error('Vui lòng nhập số điện thoại để nhân viên liên hệ lại.');
            return;
        }

        setSubmitting(true);
        try {
            await contentApi.submitContact({
                fullName: askerName.trim() || 'Khách hàng ẩn danh',
                phone: phone.trim(),
                subject: `Hỏi đáp sản phẩm${productName ? `: ${productName}` : ''} (${productId})`,
                message: question.trim(),
            });
            toast.success('Câu hỏi đã được gửi! Nhân viên sẽ liên hệ lại sớm nhất.');
            setQuestion('');
            setAskerName('');
            setPhone('');
            setSubmitted(true);
        } catch {
            toast.error(`Gửi câu hỏi thất bại. Vui lòng gọi hotline ${companyInfo.hotline} để được hỗ trợ ngay.`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Hỏi đáp về sản phẩm</h3>
            </div>

            {/* Form gửi câu hỏi */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[var(--accent-primary)]" />
                    Đặt câu hỏi cho nhân viên tư vấn
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                        type="text"
                        value={askerName}
                        onChange={(e) => setAskerName(e.target.value)}
                        placeholder="Tên của bạn (không bắt buộc)"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:bg-white transition-colors"
                        maxLength={80}
                    />
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Số điện thoại liên hệ *"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:bg-white transition-colors"
                        maxLength={20}
                        required
                    />
                </div>
                <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={4}
                    placeholder="Ví dụ: Sản phẩm này có nâng cấp RAM lên 32GB được không?"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:bg-white transition-colors resize-y"
                    maxLength={500}
                />
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{question.length}/500</span>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer"
                    >
                        <Send className="w-4 h-4" />
                        {submitting ? 'Đang gửi...' : 'Gửi câu hỏi'}
                    </button>
                </div>
            </form>

            {/* Empty state trung thực — chưa có hệ thống Q&A công khai theo sản phẩm */}
            {!submitted && (
                <div className="bg-white rounded-xl border border-gray-100 p-8 flex flex-col items-center text-center gap-2">
                    <HelpCircle className="w-8 h-8 text-gray-300" />
                    <p className="text-sm font-semibold text-gray-700">Chưa có câu hỏi nào được công khai</p>
                    <p className="text-xs text-gray-500 max-w-sm">
                        Hãy là người đầu tiên đặt câu hỏi về sản phẩm này, hoặc gọi hotline{' '}
                        <a href={`tel:${companyInfo.hotline.replace(/\D/g, '')}`} className="font-semibold text-[var(--accent-primary)] inline-flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {companyInfo.hotline}
                        </a>{' '}
                        để được tư vấn ngay.
                    </p>
                </div>
            )}
            {submitted && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-5 text-center text-sm text-green-700">
                    Câu hỏi của bạn đã được ghi nhận. Nhân viên tư vấn sẽ liên hệ lại qua số điện thoại bạn cung cấp.
                </div>
            )}
        </div>
    );
}

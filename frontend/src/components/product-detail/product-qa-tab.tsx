import { useState } from 'react';
import { MessageCircle, Send, User2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface QAItem {
    id: string;
    askerName: string;
    askedAt: string;
    question: string;
    answer?: {
        answererName: string;
        isStaff: boolean;
        answeredAt: string;
        content: string;
    };
}

const MOCK_QA: QAItem[] = [
    {
        id: 'mock-1',
        askerName: 'Anh Minh',
        askedAt: '2 ngày trước',
        question: 'Sản phẩm này có sẵn hàng ở chi nhánh Hải Phòng không ạ?',
        answer: {
            answererName: 'Quang Hưởng Support',
            isStaff: true,
            answeredAt: '1 ngày trước',
            content: 'Chào bạn! Sản phẩm còn hàng tại showroom chính. Bạn có thể xem tồn kho chi tiết ở bên phải trang hoặc gọi 0904.235.090 để đặt giữ hàng ạ.',
        },
    },
    {
        id: 'mock-2',
        askerName: 'Chị Lan',
        askedAt: '5 ngày trước',
        question: 'Có hỗ trợ trả góp 0% qua thẻ tín dụng không?',
        answer: {
            answererName: 'Quang Hưởng Support',
            isStaff: true,
            answeredAt: '4 ngày trước',
            content: 'Dạ có ạ. Với đơn từ 5.000.000đ, bạn có thể chọn trả góp 6/9/12 tháng qua các ngân hàng: VPBank, Sacombank, Shinhan, HSBC, Standard Chartered.',
        },
    },
];

/**
 * Tab hỏi đáp — giai đoạn 1 dùng list mock + form submit toast.
 * Backend Q&A sẽ nối ở phase sau.
 */
export default function ProductQaTab({ productId }: { productId: string }) {
    const [question, setQuestion] = useState('');
    const [askerName, setAskerName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (question.trim().length < 10) {
            toast.error('Câu hỏi cần tối thiểu 10 ký tự.');
            return;
        }
        setSubmitting(true);
        // Placeholder: chưa có API, giả lập
        void productId;
        await new Promise((r) => setTimeout(r, 400));
        toast.success('Câu hỏi đã được gửi! Nhân viên sẽ phản hồi trong 24h.');
        setQuestion('');
        setAskerName('');
        setSubmitting(false);
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Hỏi đáp về sản phẩm</h3>
                <span className="text-xs text-gray-500">{MOCK_QA.length} câu hỏi</span>
            </div>

            {/* Form gửi câu hỏi */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[var(--accent-primary)]" />
                    Đặt câu hỏi cho nhân viên tư vấn
                </label>
                <input
                    type="text"
                    value={askerName}
                    onChange={(e) => setAskerName(e.target.value)}
                    placeholder="Tên của bạn (không bắt buộc)"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:bg-white transition-colors"
                    maxLength={80}
                />
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

            {/* List câu hỏi */}
            <div className="space-y-3">
                {MOCK_QA.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <User2 className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-sm font-semibold text-gray-900">{item.askerName}</span>
                                    <span className="text-xs text-gray-400">{item.askedAt}</span>
                                </div>
                                <p className="text-sm text-gray-700 mt-1">{item.question}</p>
                            </div>
                        </div>

                        {item.answer && (
                            <div className="mt-3 ml-12 pl-3 border-l-2 border-red-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary)]">
                                        {item.answer.isStaff && <ShieldCheck className="w-3.5 h-3.5" />}
                                        {item.answer.answererName}
                                    </span>
                                    <span className="text-xs text-gray-400">· {item.answer.answeredAt}</span>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">{item.answer.content}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <p className="text-center text-xs text-gray-400 italic">
                Đây là dữ liệu tạm thời — hệ thống hỏi đáp đầy đủ sẽ ra mắt trong bản cập nhật tiếp theo.
            </p>
        </div>
    );
}

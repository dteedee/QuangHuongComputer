import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, CreditCard, ChevronRight } from 'lucide-react';

const policies: Record<string, { title: string; content: React.ReactNode; icon: any }> = {
    'warranty': {
        title: 'Chính sách bảo hành',
        icon: ShieldCheck,
        content: (
            <div className="space-y-4 text-gray-700">
                <p>Chúng tôi cam kết bảo hành các sản phẩm theo đúng quy định của nhà sản xuất. Thời gian bảo hành được ghi rõ trên phiếu bảo hành và tem bảo hành.</p>
                <h3 className="font-bold text-gray-900">1. Điều kiện bảo hành</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Sản phẩm còn trong thời hạn bảo hành.</li>
                    <li>Tem bảo hành còn nguyên vẹn, không bị rách, vá, tẩy xóa.</li>
                    <li>Sản phẩm không bị hư hỏng do tác động vật lý (rơi, vỡ, va đập) hoặc do người sử dụng.</li>
                </ul>
                <h3 className="font-bold text-gray-900">2. Phương thức bảo hành</h3>
                <p>Khách hàng có thể mang sản phẩm đến trực tiếp các trung tâm bảo hành của chúng tôi hoặc gửi qua đường bưu điện.</p>
            </div>
        )
    },
    'shipping': {
        title: 'Chính sách vận chuyển',
        icon: Truck,
        content: (
            <div className="space-y-4 text-gray-700">
                <p>Chúng tôi hỗ trợ giao hàng toàn quốc. Miễn phí vận chuyển cho đơn hàng trên 5.000.000đ.</p>
                <h3 className="font-bold text-gray-900">Thời gian giao hàng:</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Nội thành: 1-2 ngày.</li>
                    <li>Ngoại thành và tỉnh lẻ: 3-5 ngày.</li>
                </ul>
            </div>
        )
    },
    'return': {
        title: 'Chính sách đổi trả',
        icon: RotateCcw,
        content: (
            <div className="space-y-4 text-gray-700">
                <p>Đổi mới sản phẩm trong vòng 7 ngày nếu có lỗi từ nhà sản xuất.</p>
            </div>
        )
    },
    'payment': {
        title: 'Hướng dẫn thanh toán',
        icon: CreditCard,
        content: (
            <div className="space-y-4 text-gray-700">
                <p>Chấp nhận thanh toán qua:</p>
                <ul className="list-disc pl-5">
                    <li>Chuyển khoản ngân hàng.</li>
                    <li>VNPAY-QR.</li>
                    <li>Tiền mặt khi nhận hàng (COD).</li>
                </ul>
            </div>
        )
    }
};

export const PolicyPage = () => {
    const { type } = useParams<{ type: string }>();
    const policy = policies[type || 'warranty'];

    if (!policy) return <div className="p-10 text-center">Chính sách không tồn tại.</div>;

    const Icon = policy.icon;

    return (
        <div className="bg-gray-50 min-h-screen pb-10">
            {/* Breadcrumb */}
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="container mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-[#D70018]">Trang chủ</Link>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">Chính sách</span>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-8 flex flex-col lg:flex-row gap-8">
                {/* Sidebar */}
                <div className="w-full lg:w-1/4">
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-[#D70018] text-white p-4 font-bold uppercase text-sm">Danh mục chính sách</div>
                        <div className="flex flex-col">
                            {Object.entries(policies).map(([key, item]) => (
                                <Link
                                    key={key}
                                    to={`/policy/${key}`}
                                    className={`p-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 hover:text-[#D70018] transition ${key === type ? 'text-[#D70018] font-bold bg-red-50' : 'text-gray-700'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={18} />
                                        <span>{item.title}</span>
                                    </div>
                                    <ChevronRight size={16} />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-white p-8 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                        <div className="p-3 bg-red-50 text-[#D70018] rounded-full">
                            <Icon size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 uppercase">{policy.title}</h1>
                    </div>
                    <div className="prose max-w-none">
                        {policy.content}
                    </div>
                </div>
            </div>
        </div>
    );
};

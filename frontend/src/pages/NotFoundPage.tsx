import { Link, useLocation } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';

/**
 * 404 — route không tồn tại. Dùng làm `path="*"` bên trong RootLayout (storefront)
 * VÀ BackofficeLayout, nên nó CHỦ ĐỘNG không giả định layout nào bọc ngoài
 * (không header/footer của riêng nó) — chỉ render nội dung, layout cha lo phần khung.
 */
export const NotFoundPage = () => {
    const location = useLocation();
    const isBackoffice = location.pathname.startsWith('/backoffice');

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-16 font-sans">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-red-50 text-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Compass size={36} />
                </div>
                <h1 className="text-6xl font-black text-gray-900 mb-2">404</h1>
                <p className="text-lg font-bold text-gray-800 mb-2">Không tìm thấy trang</p>
                <p className="text-sm text-gray-500 mb-8">
                    Đường dẫn <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 break-all">{location.pathname}</span> không tồn tại hoặc đã bị di chuyển.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        to={isBackoffice ? '/backoffice' : '/'}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:brightness-95 transition-all"
                    >
                        <Home size={18} />
                        {isBackoffice ? 'Về trang quản trị' : 'Về trang chủ'}
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                    >
                        <ArrowLeft size={18} />
                        Quay lại
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;

import { Link } from 'react-router-dom';
import { ShieldAlert, Home, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * 403 — người dùng đã đăng nhập nhưng không có role phù hợp cho route đang truy cập.
 * `RequireAuth` điều hướng tới đây thay vì âm thầm redirect về "/" (silent redirect
 * cũ khiến người dùng không hiểu vì sao bị đá ra, tưởng nhầm route lỗi).
 */
export const ForbiddenPage = () => {
    const { user } = useAuth();

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-16 font-sans">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert size={36} />
                </div>
                <h1 className="text-6xl font-black text-gray-900 mb-2">403</h1>
                <p className="text-lg font-bold text-gray-800 mb-2">Không đủ quyền truy cập</p>
                <p className="text-sm text-gray-500 mb-8">
                    Tài khoản {user?.email ? <span className="font-semibold text-gray-700">{user.email}</span> : 'hiện tại'} không có quyền xem trang này.
                    Liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:brightness-95 transition-all"
                    >
                        <Home size={18} />
                        Về trang chủ
                    </Link>
                    {!user && (
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                        >
                            <LogIn size={18} />
                            Đăng nhập
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForbiddenPage;

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RequireAuthProps {
    allowedRoles?: string[];
}

export const RequireAuth = ({ allowedRoles }: RequireAuthProps) => {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && user) {
        const hasRole = user.roles.some(role => allowedRoles.includes(role));
        if (!hasRole) {
            // Trước đây redirect âm thầm về "/" — người dùng không hiểu vì sao bị đá ra.
            // Giờ đưa tới trang 403 rõ ràng (client-side guard, KHÔNG thay cho backend authorization).
            return <Navigate to="/403" replace />;
        }
    }

    return <Outlet />;
};


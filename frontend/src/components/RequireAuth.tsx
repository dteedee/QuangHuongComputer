import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RequireAuthProps {
    allowedRoles?: string[];
}

export const RequireAuth = ({ allowedRoles: _allowedRoles }: RequireAuthProps) => {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // For now, we don't have role information in the user object
    // This would need to be added to the AuthContext and JWT claims
    // if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    //   return <Navigate to="/" replace />;
    // }

    return <Outlet />;
};

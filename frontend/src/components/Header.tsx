import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface HeaderProps {
    onCartClick: () => void;
}

export const Header = ({ onCartClick }: HeaderProps) => {
    const { isAuthenticated, user, logout } = useAuth();
    const { itemCount } = useCart();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent hover:opacity-80 transition">
                        Quang Huong Computer
                    </Link>
                    <nav className="hidden md:flex items-center gap-6">
                        <Link to="/" className="text-sm font-medium text-gray-300 hover:text-white transition">Catalog</Link>
                        <Link to="/repairs" className="text-sm font-medium text-gray-300 hover:text-white transition">Repairs</Link>
                        <Link to="/warranty" className="text-sm font-medium text-gray-300 hover:text-white transition">Warranty</Link>
                        <Link to="/support" className="text-sm font-medium text-gray-300 hover:text-white transition">Support</Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={onCartClick}
                        className="relative p-2 text-gray-300 hover:text-white transition"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {itemCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {itemCount}
                            </span>
                        )}
                    </button>

                    {isAuthenticated ? (
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <Link to="/profile" className="text-sm font-medium text-white leading-none hover:text-blue-400 transition">{user?.fullName}</Link>
                                <p className="text-xs text-gray-400 mt-0.5">Customer</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20 transition backdrop-blur-sm border border-white/5"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <Link
                            to="/login"
                            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition shadow-lg shadow-blue-500/20"
                        >
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
};

import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

export const PaymentResultPage = () => {
    const [searchParams] = useSearchParams();

    const success = window.location.pathname.includes('success');
    const orderId = searchParams.get('orderId');
    const errorCode = searchParams.get('error');

    useEffect(() => {
        if (success) {
            toast.success('Payment completed successfully!');
        } else {
            toast.error(`Payment failed. Error code: ${errorCode || 'Unknown'}`);
        }
    }, [success, errorCode]);

    return (
        <div className="container mx-auto px-4 py-24 flex items-center justify-center animate-fade-in">
            <div className="glass p-12 max-w-lg w-full rounded-[40px] premium-shadow border-white/5 text-center">
                {success ? (
                    <>
                        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-400">
                            <CheckCircle size={48} className="animate-bounce" />
                        </div>
                        <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Payment Successful!</h2>
                        <p className="text-slate-400 text-lg mb-10">
                            Your order <span className="text-white font-mono">#{orderId?.substring(0, 8)}</span> has been paid and is being processed.
                        </p>
                    </>
                ) : (
                    <>
                        <div className="w-24 h-24 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-8 text-rose-400">
                            <XCircle size={48} />
                        </div>
                        <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Payment Failed</h2>
                        <p className="text-slate-400 text-lg mb-10">
                            We couldn't process your payment. Please try again or use a different method.
                        </p>
                    </>
                )}

                <div className="flex flex-col gap-4">
                    {success ? (
                        <Link
                            to="/profile"
                            className="flex items-center justify-center px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/25 active:scale-95"
                        >
                            View Order Details
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Link>
                    ) : (
                        <Link
                            to={orderId ? `/payment/${orderId}` : '/cart'}
                            className="flex items-center justify-center px-10 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all border border-white/5 active:scale-95"
                        >
                            Retry Payment
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Link>
                    )}

                    <Link
                        to="/"
                        className="flex items-center justify-center gap-2 text-slate-500 hover:text-white font-bold transition-colors py-2"
                    >
                        <ShoppingBag size={18} />
                        Back to Shop
                    </Link>
                </div>
            </div>
        </div>
    );
};

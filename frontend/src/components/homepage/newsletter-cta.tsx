import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight } from 'lucide-react';

/**
 * Simple newsletter email signup bar for the homepage footer area.
 */
export const NewsletterCta = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        // In production, this would call an API
        setSubmitted(true);
        setEmail('');
    };

    return (
        <div className="max-w-[1400px] mx-auto px-4 mt-14">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-10"
            >
                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                        Nhận ưu đãi độc quyền
                    </h3>
                    <p className="text-sm text-gray-400">
                        Đăng ký nhận thông báo khuyến mãi, sản phẩm mới và deal hấp dẫn mỗi ngày.
                    </p>
                </div>

                {submitted ? (
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                        <Mail size={18} />
                        Cảm ơn bạn đã đăng ký!
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit}
                        className="flex w-full md:w-auto gap-2"
                    >
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email của bạn..."
                            required
                            className="flex-1 md:w-72 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                        />
                        <button
                            type="submit"
                            className="px-5 py-3 bg-accent text-white rounded-xl font-semibold text-sm hover:bg-accent-hover transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap"
                        >
                            Đăng ký
                            <ArrowRight size={16} />
                        </button>
                    </form>
                )}
            </motion.div>
        </div>
    );
};

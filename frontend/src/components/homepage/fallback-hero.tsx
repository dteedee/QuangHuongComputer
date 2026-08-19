import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Star, Cpu } from 'lucide-react';

/**
 * Fallback hero banner displayed when the CMS returns no homepage sections.
 * Full-width gradient (brand red to dark) with headline, tagline, and CTA buttons.
 */
export const FallbackHero = () => (
    <div className="w-full">
        <div className="relative bg-gradient-to-br from-slate-900 via-red-900 to-black rounded-2xl overflow-hidden shadow-2xl h-[380px] md:h-[480px]">
            {/* Animated background blobs */}
            <div className="absolute inset-0 overflow-hidden opacity-40">
                <motion.div
                    className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-red-600/30 blur-[100px] rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-blue-500/20 blur-[80px] rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                />
            </div>

            <div className="relative h-full flex items-center p-8 md:p-16 z-10">
                <div className="max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg mb-6"
                    >
                        <Star size={14} className="text-yellow-400 fill-yellow-400" />
                        Dai ly uy quyen chinh hang
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] drop-shadow-2xl"
                    >
                        Quang Huong
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-yellow-400">
                            Computer
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-base md:text-lg mt-5 text-gray-300 font-medium max-w-lg leading-relaxed"
                    >
                        Linh kien may tinh chinh hang gia tot. Chuyen cung cap Laptop, PC Gaming va linh kien cao cap voi dich vu hau mai tot nhat tai Hai Phong.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="mt-8 flex flex-wrap gap-3"
                    >
                        <Link
                            to="/products"
                            className="inline-flex items-center gap-2.5 bg-gradient-to-r from-accent to-[#b91c1c] text-white px-7 py-3.5 rounded-xl font-bold text-base hover:shadow-lg hover:shadow-red-500/30 transition-all duration-200 hover:-translate-y-0.5"
                        >
                            <ShoppingBag size={20} />
                            Xem san pham
                        </Link>
                        <Link
                            to="/build-pc"
                            className="inline-flex items-center gap-2 bg-white/10 text-white px-7 py-3.5 rounded-xl font-bold text-base hover:bg-white/20 transition-all duration-200 backdrop-blur-md border border-white/20 hover:-translate-y-0.5"
                        >
                            <Cpu size={20} />
                            Build PC
                        </Link>
                    </motion.div>
                </div>
            </div>
        </div>
    </div>
);

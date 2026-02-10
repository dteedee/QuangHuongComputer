import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { catalogApi, type Product } from '../api/catalog';
import { useCart } from '../context/CartContext';
import {
    ArrowLeft, ShoppingBag, Phone, Check, Star, Eye, ShieldCheck, Tag,
    Truck, Award, Cpu, Layers, MessageSquare, Share2, Heart,
    ChevronRight, ChevronDown, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../utils/format';

export const ProductDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToCart } = useCart();

    const [product, setProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'reviews'>('desc');
    const [quantity, setQuantity] = useState(1);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    const productImages = useMemo(() => {
        if (!product) return [];
        const images: string[] = [];
        if (product.imageUrl) images.push(product.imageUrl);
        if (product.galleryImages) {
            try {
                const gallery = JSON.parse(product.galleryImages);
                if (Array.isArray(gallery)) {
                    images.push(...gallery);
                }
            } catch (e) {
                console.error("Error parsing gallery images:", e);
            }
        }
        return images;
    }, [product]);

    const parsedSpecs = useMemo(() => {
        if (!product?.specifications) return [];
        try {
            const parsed = JSON.parse(product.specifications);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (e) {
            console.error("Error parsing specs:", e);
        }
        return [];
    }, [product]);

    useEffect(() => {
        if (!id) return;
        const fetchProduct = async () => {
            try {
                setIsLoading(true);
                const data = await catalogApi.getProduct(id);
                setProduct(data);
            } catch (err) {
                console.error(err);
                setError('Không thể tải thông tin sản phẩm.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    if (isLoading) return (
        <div className="flex justify-center items-center min-h-[50vh] bg-white">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D70018]"></div>
        </div>
    );

    if (error || !product) return (
        <div className="text-center py-20 bg-white">
            <h2 className="text-2xl text-red-500 mb-4">{error || 'Không tìm thấy sản phẩm'}</h2>
            <button onClick={() => navigate('/')} className="text-blue-500 hover:underline">
                Trở về trang chủ
            </button>
        </div>
    );

    // Price calculations
    const oldPrice = product.oldPrice || product.price * 1.15;
    const discount = Math.round(((oldPrice - product.price) / oldPrice) * 100);
    const saveAmount = oldPrice - product.price;

    // Product status display
    const getStatusBadge = (status: string, stock: number) => {
        if (status === 'OutOfStock') return <span className="text-red-600 font-bold">Hết hàng</span>;
        if (status === 'LowStock') return <span className="text-orange-600 font-bold">Sắp hết hàng ({stock} sản phẩm)</span>;
        if (status === 'PreOrder') return <span className="text-blue-600 font-bold">Đặt trước</span>;
        return <span className="text-green-600 font-bold">Còn hàng ({stock} sản phẩm)</span>;
    };

    return (
        <div className="bg-gray-50 min-h-screen font-sans text-gray-800 pb-20">
            {/* Breadcrumbs */}
            <div className="bg-white py-3 border-b border-gray-100 sticky top-[72px] z-30 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-4 text-xs text-gray-500 flex items-center gap-2 uppercase font-bold tracking-wide">
                    <Link to="/" className="hover:text-[#D70018] transition-colors">Trang chủ</Link>
                    <ChevronRight size={12} />
                    <Link to="/products" className="hover:text-[#D70018] transition-colors">Sản phẩm</Link>
                    <ChevronRight size={12} />
                    <span className="text-gray-900 truncate max-w-[300px]">{product.name}</span>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Images (Span 5) */}
                    <div className="lg:col-span-5 space-y-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm overflow-hidden group relative"
                        >
                            <div className="aspect-[4/3] flex items-center justify-center bg-gray-50 rounded-xl relative overflow-hidden">
                                {productImages.length > 0 ? (
                                    <img
                                        src={productImages[selectedImageIndex]}
                                        alt={product.name}
                                        className="w-full h-full object-contain mix-blend-multiply"
                                    />
                                ) : (
                                    <div className="text-gray-200 font-black text-9xl select-none opacity-20">
                                        {product.name.charAt(0).toUpperCase()}
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="absolute top-4 left-4 bg-[#D70018] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-red-500/30 animate-pulse">
                                    GIẢM {discount}%
                                </div>
                            </div>
                        </motion.div>

                        {productImages.length > 1 && (
                            <div className="grid grid-cols-4 gap-3">
                                {productImages.map((img, i) => (
                                    <motion.div
                                        key={i}
                                        whileHover={{ y: -2 }}
                                        onClick={() => setSelectedImageIndex(i)}
                                        className={`bg-white border rounded-xl p-2 cursor-pointer transition-all aspect-square flex items-center justify-center hover:shadow-md ${selectedImageIndex === i ? 'border-[#D70018] ring-1 ring-[#D70018]' : 'border-gray-200 hover:border-[#D70018]'}`}
                                    >
                                        <div className="w-full h-full rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                                            <img src={img} alt={`Thumbnail ${i}`} className="w-full h-full object-contain mix-blend-multiply" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* USPs */}
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            {[
                                { icon: ShieldCheck, text: product.warrantyInfo || "Bảo hành 24 tháng", link: "/policy/warranty" },
                                { icon: Truck, text: "Miễn phí vận chuyển" },
                                { icon: RotateCcw, text: "Đổi trả 30 ngày" },
                                { icon: Award, text: "Cam kết chính hãng" }
                            ].map((item, idx) => (
                                item.link ? (
                                    <Link key={idx} to={item.link} className="flex items-center gap-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:border-[#D70018] transition-colors">
                                        <item.icon size={18} className="text-[#D70018]" />
                                        <span className="text-[10px] font-bold text-gray-700 uppercase">{item.text}</span>
                                    </Link>
                                ) : (
                                    <div key={idx} className="flex items-center gap-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                        <item.icon size={18} className="text-[#D70018]" />
                                        <span className="text-[10px] font-bold text-gray-700 uppercase">{item.text}</span>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>

                    {/* Center Column: Info (Span 4) */}
                    <div className="lg:col-span-4 flex flex-col pt-2">
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                    Thương hiệu: QH Tech
                                </span>
                                <div className="flex text-amber-400 gap-0.5">
                                    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={10} fill="currentColor" />)}
                                </div>
                                <span className="text-[10px] text-blue-500 underline cursor-pointer">Xem 24 đánh giá</span>
                            </div>

                            <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-3">
                                {product.name}
                            </h1>

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>Mã SP: <span className="text-gray-900 font-bold">{product.sku}</span></span>
                                <span>Trạng thái: {getStatusBadge(product.status, product.stockQuantity)}</span>
                            </div>
                        </div>

                        {/* Price Box */}
                        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-lg shadow-red-500/5 mb-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 bg-[#D70018]/10 rounded-bl-2xl">
                                <Tag className="text-[#D70018]" size={16} />
                            </div>

                            <div className="flex flex-col mb-2">
                                <span className="text-sm text-gray-400 font-medium">Giá niêm yết: <span className="line-through">{formatCurrency(oldPrice)}</span></span>
                                <div className="flex items-end gap-3">
                                    <span className="text-4xl font-black text-[#D70018] tracking-tight">{formatCurrency(product.price)}</span>
                                    <span className="mb-1.5 text-xs font-bold text-[#D70018] bg-red-50 px-2 py-1 rounded-lg">-{discount}%</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 italic">Giá đã bao gồm VAT. Hỗ trợ trả góp 0%</p>
                        </div>

                        {/* Short Specs (Mock) */}
                        <div className="mb-6">
                            <h3 className="font-bold text-sm uppercase text-gray-900 mb-3 flex items-center gap-2">
                                <Cpu size={16} /> Thông số nổi bật
                            </h3>
                            <ul className="space-y-2">
                                {parsedSpecs.length > 0 ? (
                                    parsedSpecs.slice(0, 6).map((spec: any, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600 bg-white p-2 rounded border border-dashed border-gray-200">
                                            <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                                            <span><span className="font-semibold">{spec.label}:</span> {spec.value}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li className="flex items-start gap-2 text-sm text-gray-500 bg-white p-2 rounded border border-dashed border-gray-200 italic">
                                        <span>Đang cập nhật thông số...</span>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* Right Column: Buying Actions (Span 3) */}
                    <div className="lg:col-span-3">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 sticky top-[130px]">
                            <h3 className="font-black text-gray-900 mb-4 uppercase text-sm">Mua hàng ngay</h3>

                            {/* Quantity */}
                            <div className="flex items-center justify-between mb-4 bg-gray-50 p-2 rounded-xl">
                                <span className="text-xs font-bold text-gray-500 ml-2">Số lượng:</span>
                                <div className="flex items-center gap-1 bg-white rounded-lg shadow-sm border border-gray-100">
                                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition text-gray-600 font-bold">-</button>
                                    <span className="w-8 text-center text-sm font-bold">{quantity}</span>
                                    <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition text-gray-600 font-bold">+</button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button className="w-full bg-[#D70018] hover:bg-[#b50014] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all active:scale-95 flex flex-col items-center justify-center">
                                    <span className="uppercase text-sm">Mua ngay</span>
                                    <span className="text-[10px] font-normal opacity-90">Giao hàng tận nơi hoặc nhận tại cửa hàng</span>
                                </button>

                                <button
                                    onClick={() => addToCart(product, quantity)}
                                    className="w-full bg-white border-2 border-[#D70018] text-[#D70018] hover:bg-red-50 py-3.5 rounded-xl font-bold shadow-lg shadow-red-500/10 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                                >
                                    <ShoppingBag size={18} className="group-hover:scale-110 transition-transform" />
                                    <span className="uppercase text-sm">Thêm vào giỏ</span>
                                </button>

                                <button className="w-full bg-white border border-gray-200 hover:border-gray-300 text-gray-700 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2">
                                    <Phone size={14} />
                                    Tư vấn: 1800.6321
                                </button>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <h4 className="font-bold text-xs text-gray-900 mb-2">Chính sách:</h4>
                                <ul className="text-[11px] text-gray-600 space-y-1.5">
                                    <li className="flex items-start gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-[#D70018] mt-1.5" />
                                        <Link to="/policy/warranty" className="hover:text-[#D70018] hover:underline">
                                            {product.warrantyInfo || "Bảo hành 24 tháng"}
                                        </Link>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-[#D70018] mt-1.5" />
                                        <Link to="/policy/return" className="hover:text-[#D70018] hover:underline">
                                            Chính sách đổi trả trong 30 ngày
                                        </Link>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-[#D70018] mt-1.5" />
                                        <Link to="/policy/shipping" className="hover:text-[#D70018] hover:underline">
                                            Chính sách giao hàng
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs Section */}
                <div className="mt-12 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                    <div className="flex border-b border-gray-100">
                        {[
                            { id: 'desc', label: 'Mô tả sản phẩm', icon: Layers },
                            { id: 'specs', label: 'Thông số kỹ thuật', icon: Cpu },
                            { id: 'reviews', label: 'Đánh giá & Nhận xét', icon: MessageSquare }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider transition-all relative
                                    ${activeTab === tab.id ? 'text-[#D70018] bg-red-50/50' : 'text-gray-500 hover:bg-gray-50'}
                                `}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                                {activeTab === tab.id && (
                                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D70018]" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="p-8">
                        <AnimatePresence mode="wait">
                            {activeTab === 'desc' && (
                                <motion.div
                                    key="desc"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="prose max-w-none text-gray-600"
                                >
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">Đặc điểm nổi bật của {product.name}</h3>
                                    <p className="mb-4">
                                        Sản phẩm <strong>{product.name}</strong> mang đến trải nghiệm tuyệt vời với hiệu năng mạnh mẽ và thiết kế đẳng cấp.
                                        Phù hợp cho cả công việc văn phòng, đồ họa chuyên nghiệp và giải trí đỉnh cao.
                                    </p>
                                    <p className="mb-4">
                                        {product.description || 'Đang cập nhật nội dung chi tiết cho sản phẩm này...'}
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
                                        {productImages.length > 0 ? (
                                            productImages.map((img, idx) => (
                                                <div key={idx} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                                    <img
                                                        src={img}
                                                        alt={`${product.name} - ${idx + 1}`}
                                                        className="w-full h-64 object-contain bg-gray-50 group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                </div>
                                            ))
                                        ) : null}
                                    </div>
                                    <p>
                                        Được trang bị những công nghệ tiên tiến nhất, {product.name} đảm bảo sự ổn định và tốc độ xử lý vượt trội.
                                    </p>
                                </motion.div>
                            )}

                            {activeTab === 'specs' && (
                                <motion.div
                                    key="specs"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="max-w-3xl mx-auto"
                                >
                                    <h3 className="text-lg font-bold text-gray-900 mb-6 text-center uppercase">Cấu hình chi tiết</h3>
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        {parsedSpecs.length > 0 ? (
                                            parsedSpecs.map((row: any, i: number) => (
                                                <div key={i} className={`flex p-4 border-b last:border-0 border-gray-100 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                                    <div className="w-1/3 text-gray-500 font-semibold text-sm">{row.label}</div>
                                                    <div className="w-2/3 text-gray-900 font-bold text-sm">{row.value}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-gray-400 italic">
                                                Chưa có thông số kỹ thuật chi tiết.
                                            </div>
                                        )}
                                    </div>

                                </motion.div>
                            )}

                            {activeTab === 'reviews' && (
                                <motion.div
                                    key="reviews"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center justify-center py-12 text-center"
                                >
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                                        <MessageSquare size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Chưa có đánh giá nào</h3>
                                    <p className="text-gray-500 text-sm mb-6">Hãy là người đầu tiên đánh giá sản phẩm này!</p>
                                    <button className="bg-[#D70018] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#b50014] transition shadow-lg shadow-red-500/20">
                                        Viết đánh giá ngay
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Related Products Title */}
                <div className="mt-12 mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900 uppercase italic">Sản phẩm liên quan</h2>
                    <Link to="/products" className="text-sm font-bold text-[#D70018] hover:underline flex items-center gap-1">
                        Xem tất cả <ChevronRight size={16} />
                    </Link>
                </div>
                {/* (Related products styling placeholder) */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center h-48 text-gray-300 italic">
                            Product {i}
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
};

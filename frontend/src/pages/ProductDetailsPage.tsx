
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { catalogApi, type Product } from '../api/catalog';
import { useCart } from '../context/CartContext';
import { ArrowLeft, ShoppingBag, Phone, Check, Star, Eye, ShieldCheck, Tag } from 'lucide-react';

export const ProductDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToCart } = useCart();

    const [product, setProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

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

    // Mock calculations
    const oldPrice = product.price * 1.15;
    const discount = Math.round(((oldPrice - product.price) / oldPrice) * 100);
    const saveAmount = oldPrice - product.price;

    return (
        <div className="bg-white min-h-screen pb-10 font-sans text-gray-800">
            {/* Breadcrumbs */}
            <div className="bg-gray-100 py-2 border-b border-gray-200">
                <div className="container mx-auto px-4 text-xs text-gray-500 flex items-center gap-1 uppercase font-medium">
                    <Link to="/" className="hover:text-[#D70018]">Trang chủ</Link>
                    <span>&gt;</span>
                    <Link to="#" className="hover:text-[#D70018]">Sản phẩm</Link>
                    <span>&gt;</span>
                    <span className="text-gray-700 truncate max-w-[200px]">{product.name}</span>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Image Gallery (Span 5) */}
                    <div className="lg:col-span-5">
                        <div className="border border-gray-200 rounded p-2 mb-4 bg-white">
                            <div className="aspect-[4/3] flex items-center justify-center overflow-hidden relative group cursor-pointer">
                                {/* Main Image Placeholder */}
                                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300 font-bold text-6xl select-none">
                                    {product.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="absolute top-2 left-2 bg-[#D70018] text-white text-xs font-bold px-2 py-1 rounded">
                                    TIẾT KIỆM {discount}%
                                </div>
                            </div>
                        </div>
                        {/* Thumbnails */}
                        <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="border border-gray-200 rounded p-1 cursor-pointer hover:border-[#D70018] transition aspect-square flex items-center justify-center bg-white">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Product Info (Span 7) */}
                    <div className="lg:col-span-7 flex flex-col">
                        {/* Title */}
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug mb-2">
                            {product.name}
                        </h1>

                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4 border-b border-gray-100 pb-4">
                            <span>Mã SP: <span className="font-bold text-[#D70018]">SP{product.id.substring(0, 6).toUpperCase()}</span></span>
                            <span className="text-gray-300">|</span>
                            <span>Bảo hành: <span className="font-bold text-gray-700">24 Tháng</span></span>
                            <span className="text-gray-300">|</span>
                            <span>Tình trạng: <span className="font-bold text-[#D70018]">Còn hàng</span></span>
                            <span className="text-gray-300">|</span>
                            <div className="flex items-center gap-1">
                                <span className="flex text-yellow-400 text-xs">
                                    <Star size={12} fill="currentColor" />
                                    <Star size={12} fill="currentColor" />
                                    <Star size={12} fill="currentColor" />
                                    <Star size={12} fill="currentColor" />
                                    <Star size={12} fill="currentColor" />
                                </span>
                                <span className="text-gray-400 text-xs">(0 đánh giá)</span>
                            </div>
                        </div>

                        {/* Price Section */}
                        <div className="bg-gray-50 p-4 rounded border border-gray-100 mb-4">
                            <div className="flex items-end gap-3 mb-1">
                                <span className="text-gray-500 line-through text-sm">Giá cũ: {oldPrice.toLocaleString()} đ</span>
                                <span className="text-sm text-[#D70018] italic">(Tiết kiệm: {saveAmount.toLocaleString()} đ)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-3xl font-extrabold text-[#D70018]">{product.price.toLocaleString()} đ</span>
                                <span className="text-xs bg-[#D70018] text-white px-2 py-0.5 rounded font-bold">GIÁ SỐC</span>
                            </div>
                        </div>

                        {/* Description & Specs */}
                        <div className="mb-6">
                            <h3 className="font-bold text-gray-800 mb-2 uppercase text-sm">Mô tả tóm tắt sản phẩm:</h3>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 pl-1">
                                <li>Sản phẩm chính hãng, chất lượng cao</li>
                                <li>Thiết kế hiện đại, tinh tế</li>
                                <li>Hiệu năng vượt trội trong tầm giá</li>
                                <li>Hỗ trợ kỹ thuật 24/7</li>
                                {product.description && <li>{product.description.substring(0, 100)}...</li>}
                            </ul>
                            <a href="#" className="text-[#D70018] text-sm italic hover:underline mt-1 block">Xem thêm thông số kỹ thuật &gt;</a>
                        </div>

                        {/* Order Form / Buy Buttons */}
                        <div className="bg-white rounded border border-dashed border-[#D70018] p-4">
                            <h3 className="text-[#D70018] font-bold uppercase mb-3 text-sm border-l-4 border-[#D70018] pl-2">
                                Yêu cầu đặt hàng
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <input type="text" placeholder="Họ và tên (Bắt buộc)" className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#D70018]" />
                                <input type="text" placeholder="Số điện thoại (Bắt buộc)" className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#D70018]" />
                                <input type="email" placeholder="Email nhận tin" className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#D70018] md:col-span-2" />
                                <textarea placeholder="Nội dung cần tư vấn..." className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#D70018] md:col-span-2 h-20"></textarea>
                            </div>

                            <div className="flex gap-2">
                                <button className="flex-1 bg-[#D70018] hover:bg-red-700 text-white font-bold py-3 rounded uppercase transition flex items-center justify-center gap-2">
                                    Gửi yêu cầu
                                </button>
                                <button
                                    onClick={() => addToCart(product)}
                                    className="px-4 border border-[#D70018] text-[#D70018] hover:bg-[#D70018] hover:text-white font-bold rounded flex items-center justify-center transition"
                                    title="Thêm vào giỏ hàng"
                                >
                                    <ShoppingBag size={20} />
                                </button>
                            </div>
                            <div className="mt-3 text-center">
                                <span className="text-xs text-gray-500 italic">Hoặc gọi ngay hotline để được tư vấn: </span>
                                <a href="tel:18006321" className="text-[#D70018] font-bold text-sm hover:underline">1800.6321</a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Info / Policies */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                    <div className="border border-gray-200 p-4 rounded bg-white flex items-center gap-3">
                        <div className="text-[#D70018]"><ShieldCheck size={32} /></div>
                        <div>
                            <div className="font-bold text-sm">Bảo hành uy tín</div>
                            <div className="text-xs text-gray-500">Đổi trả trong 7 ngày</div>
                        </div>
                    </div>
                    <div className="border border-gray-200 p-4 rounded bg-white flex items-center gap-3">
                        <div className="text-[#D70018]"><Tag size={32} /></div>
                        <div>
                            <div className="font-bold text-sm">Giá cả cạnh tranh</div>
                            <div className="text-xs text-gray-500">Luôn có ưu đãi tốt</div>
                        </div>
                    </div>
                    <div className="border border-gray-200 p-4 rounded bg-white flex items-center gap-3">
                        <div className="text-[#D70018]"><Phone size={32} /></div>
                        <div>
                            <div className="font-bold text-sm">Hỗ trợ tận tình</div>
                            <div className="text-xs text-gray-500">Tư vấn miễn phí 24/7</div>
                        </div>
                    </div>
                    <div className="border border-gray-200 p-4 rounded bg-white flex items-center gap-3">
                        <div className="text-[#D70018]"><Check size={32} /></div>
                        <div>
                            <div className="font-bold text-sm">Sản phẩm chính hãng</div>
                            <div className="text-xs text-gray-500">Cam kết 100%</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


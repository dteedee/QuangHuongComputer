import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, ArrowRight, Package } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export function WishlistPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { items, loading, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const handleAddToCart = (item: typeof items[0]) => {
    if (item.product.stockQuantity > 0) {
      addToCart({
        id: item.productId,
        name: item.product.name,
        price: item.product.price,
        imageUrl: item.product.imageUrl,
        stockQuantity: item.product.stockQuantity,
      } as any, 1);
      toast.success('Đã thêm vào giỏ hàng!');
    }
  };

  const handleRemove = async (productId: string) => {
    await removeFromWishlist(productId);
  };

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-[#D70018]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Đăng nhập để xem yêu thích</h2>
          <p className="text-gray-500 mb-6">
            Vui lòng đăng nhập để xem và quản lý danh sách sản phẩm yêu thích của bạn.
          </p>
          <button
            onClick={() => navigate('/login', { state: { from: '/account/wishlist' } })}
            className="w-full py-3 bg-[#D70018] hover:bg-[#b50014] text-white font-bold rounded-xl transition-colors"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-red-100 rounded-2xl text-[#D70018]">
            <Heart className="w-7 h-7" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sản phẩm yêu thích</h1>
            <p className="text-gray-500 text-sm">{items.length} sản phẩm</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="animate-spin w-10 h-10 border-3 border-red-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-500 mt-4">Đang tải...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-12 h-12 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Chưa có sản phẩm yêu thích</h2>
            <p className="text-gray-500 mb-6">
              Hãy khám phá và thêm những sản phẩm bạn yêu thích!
            </p>
            <button
              onClick={() => navigate('/products')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#D70018] hover:bg-[#b50014] text-white font-bold rounded-xl transition-colors"
            >
              Khám phá sản phẩm
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden group hover:shadow-lg transition-all duration-300"
              >
                {/* Image */}
                <div
                  onClick={() => navigate(`/products/${item.productId}`)}
                  className="aspect-square bg-gray-50 p-4 relative cursor-pointer overflow-hidden"
                >
                  <img
                    src={item.product.imageUrl || `https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=300&h=300&fit=crop`}
                    alt={item.product.name}
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-300"
                  />
                  {item.product.oldPrice && item.product.oldPrice > item.product.price && (
                    <div className="absolute top-3 left-3 bg-[#D70018] text-white text-xs font-bold px-2 py-1 rounded-full">
                      -{Math.round(((item.product.oldPrice - item.product.price) / item.product.oldPrice) * 100)}%
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(item.productId);
                    }}
                    className="absolute top-3 right-3 p-2 bg-white shadow-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3
                    onClick={() => navigate(`/products/${item.productId}`)}
                    className="font-bold text-gray-900 text-sm line-clamp-2 h-10 cursor-pointer hover:text-[#D70018] transition-colors"
                  >
                    {item.product.name}
                  </h3>

                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <span className="text-lg font-black text-[#D70018]">
                        {formatPrice(item.product.price)}
                      </span>
                      {item.product.oldPrice && item.product.oldPrice > item.product.price && (
                        <span className="text-xs text-gray-400 line-through ml-2">
                          {formatPrice(item.product.oldPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock status */}
                  <div className="mt-2">
                    {item.product.stockQuantity > 0 ? (
                      <span className="text-xs text-green-600 font-medium">
                        Còn hàng ({item.product.stockQuantity})
                      </span>
                    ) : (
                      <span className="text-xs text-red-500 font-medium">Hết hàng</span>
                    )}
                  </div>

                  {/* Add to cart button */}
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={item.product.stockQuantity === 0}
                    className="w-full mt-4 py-2.5 bg-[#D70018] hover:bg-[#b50014] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {item.product.stockQuantity > 0 ? 'Thêm vào giỏ' : 'Hết hàng'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default WishlistPage;

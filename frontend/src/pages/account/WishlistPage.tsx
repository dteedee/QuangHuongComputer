import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, ArrowRight } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export function WishlistPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { items, loading, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <Heart className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Đăng nhập để xem yêu thích</h2>
          <p className="text-gray-500 text-sm mb-6">
            Vui lòng đăng nhập để xem và quản lý danh sách sản phẩm yêu thích của bạn.
          </p>
          <button
            onClick={() => navigate('/login', { state: { from: '/account/wishlist' } })}
            className="w-full bg-accent hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all cursor-pointer"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-red-50 rounded-xl text-accent">
            <Heart className="w-6 h-6" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sản phẩm yêu thích</h1>
            <p className="text-gray-500 text-sm">{items.length} sản phẩm</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-500 mt-3 text-sm">Đang tải...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-14 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Heart className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Chưa có sản phẩm yêu thích</h2>
            <p className="text-gray-500 text-sm mb-6">
              Hãy khám phá và thêm những sản phẩm bạn yêu thích!
            </p>
            <button
              onClick={() => navigate('/products')}
              className="inline-flex items-center gap-2 bg-accent hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all cursor-pointer"
            >
              Khám phá sản phẩm
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300"
              >
                {/* Image */}
                <div
                  onClick={() => navigate(`/products/${item.productId}`)}
                  className="aspect-square bg-gray-50 p-4 relative cursor-pointer overflow-hidden"
                >
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl font-bold uppercase">
                      {item?.product?.name?.charAt(0) || '?'}
                    </div>
                  )}

                  {/* Discount badge */}
                  {item.product.oldPrice && item.product.oldPrice > item.product.price && (
                    <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent text-white">
                      -{Math.round(((item.product.oldPrice - item.product.price) / item.product.oldPrice) * 100)}%
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(item.productId); }}
                    className="absolute top-2 right-2 p-1.5 bg-white shadow-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 text-gray-400 hover:text-accent cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3
                    onClick={() => navigate(`/products/${item.productId}`)}
                    className="font-semibold text-gray-900 text-sm line-clamp-2 h-10 cursor-pointer hover:text-accent transition-colors"
                  >
                    {item.product.name}
                  </h3>

                  <div className="mt-3">
                    <span className="text-base font-bold text-accent">
                      {formatPrice(item.product.price)}
                    </span>
                    {item.product.oldPrice && item.product.oldPrice > item.product.price && (
                      <span className="text-xs text-gray-400 line-through ml-2">
                        {formatPrice(item.product.oldPrice)}
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5">
                    <span className={`text-xs font-medium ${item.product.stockQuantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {item.product.stockQuantity > 0 ? `Còn hàng (${item.product.stockQuantity})` : 'Hết hàng'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={item.product.stockQuantity === 0}
                    className="w-full mt-3 bg-accent hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:cursor-not-allowed cursor-pointer text-sm"
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

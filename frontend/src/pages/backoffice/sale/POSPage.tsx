import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogApi, type Product } from '../../../api/catalog';
import { useCart } from '../../../context/CartContext';
import {
  Search,
  ShoppingCart,
  User,
  Package,
  X,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  DollarSign,
  Printer,
  Tag,
  Scan
} from 'lucide-react';
import { formatCurrency } from '../../../utils/format';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export default function POSPage() {
  const navigate = useNavigate();
  const { items, addToCart, removeFromCart, updateQuantity, clearCart, subtotal, tax, total } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [notes, setNotes] = useState('');

  const [processingOrder, setProcessingOrder] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const data = await catalogApi.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await catalogApi.getProducts({
        search: searchQuery || undefined,
        categoryId: selectedCategory || undefined,
        pageSize: 50,
      });
      setProducts(data.products);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    await loadProducts();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAddToCart = (product: Product) => {
    if (product.stockQuantity > 0) {
      addToCart(product);
    }
  };

  const handleProcessOrder = async (paymentMethod: 'cash' | 'card' | 'transfer') => {
    setProcessingOrder(true);
    try {
      const discountAmount = discountType === 'percentage' ? (total * discount) / 100 : discount;

      // Use a fixed GUID for walk-in if not selected, OR don't pass CustomerId to let backend use current user
      // But we want to support "Khách lẻ" explicitly if selected
      const customerId = selectedCustomer?.id === 'walk-in' ? '00000000-0000-0000-0000-000000000000' : selectedCustomer?.id;

      const orderData = {
        customerId: customerId, // Can be null
        items: items.map((item) => ({
          productId: item.id,
          productName: item.name,
          unitPrice: item.price,
          quantity: item.quantity,
        })),
        shippingAddress: 'Tại quầy', // POS default
        notes: notes ? `${notes} - Thanh toán: ${paymentMethod}` : `Thanh toán: ${paymentMethod}`,
        manualDiscount: discountAmount > 0 ? discountAmount : null
      };

      // Using /checkout endpoint instead of /orders
      const client = (await import('../../../api/client')).default;
      const response = await client.post('/sales/checkout', orderData);

      if (response.data) {
        const result = response.data;
        clearCart();
        setSelectedCustomer(null);
        setDiscount(0);
        setNotes('');
        // Show success and print receipt
        alert(`Đơn hàng đã được tạo thành công! Mã đơn: ${result.orderNumber}`);
      }
    } catch (error) {
      console.error('Failed to process order:', error);
      alert('Có lỗi xảy ra khi tạo đơn hàng');
    } finally {
      setProcessingOrder(false);
    }
  };



  const calculateFinalTotal = () => {
    const discountAmount = discountType === 'percentage' ? (total * discount) / 100 : discount;
    return total - discountAmount;
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Điểm Bán Hàng (POS)</h1>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              Online
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search and Filter Bar */}
          <div className="bg-white p-4 border-b border-gray-200">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tìm kiếm sản phẩm... (Enter để tìm)"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D70018] focus:border-transparent outline-none"
                />
                <button
                  onClick={() => {
                    setSearchQuery('');
                    loadProducts();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D70018] focus:border-transparent outline-none"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                    <div className="bg-gray-200 h-32 rounded mb-3"></div>
                    <div className="bg-gray-200 h-4 rounded mb-2"></div>
                    <div className="bg-gray-200 h-4 w-2/3 rounded"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Không tìm thấy sản phẩm nào</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stockQuantity === 0}
                    className={`bg-white rounded-lg p-3 text-left transition-all hover:shadow-lg ${product.stockQuantity === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#D70018]'
                      } border border-gray-200 group flex flex-col h-full`}
                  >
                    <div className="aspect-square bg-white rounded-lg mb-3 overflow-hidden flex items-center justify-center p-2 border border-gray-100">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-gray-300 font-bold text-3xl">{product.name.charAt(0)}</div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2 min-h-[40px]">{product.name}</h3>
                      <div className="mt-auto flex items-baseline justify-between">
                        <span className="text-lg font-bold text-[#D70018]">{formatCurrency(product.price)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${product.stockQuantity > 10 ? 'bg-green-100 text-green-700' :
                          product.stockQuantity > 0 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                          {product.stockQuantity > 0 ? `SL: ${product.stockQuantity}` : 'Hết hàng'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          {/* Customer Info */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => setShowCustomerModal(true)}
              className={`w-full p-3 rounded-lg border-2 border-dashed transition-colors flex items-center justify-center gap-2 ${selectedCustomer
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 text-gray-500 hover:border-gray-400'
                }`}
            >
              <User className="w-5 h-5" />
              {selectedCustomer ? (
                <span className="font-medium">{selectedCustomer.name}</span>
              ) : (
                <span>Chọn khách hàng</span>
              )}
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có sản phẩm nào</p>
                <p className="text-sm">Nhấn vào sản phẩm để thêm vào giỏ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 rounded-lg p-3 flex items-center gap-3 group"
                  >
                    <div className="w-16 h-16 bg-white rounded overflow-hidden flex-shrink-0">
                      <img
                        src={item.imageUrl || `https://ui-avatars.com/api/?name=${item.name}`}
                        alt={item.name}
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate" title={item.name}>{item.name}</h4>
                      <p className="text-[#D70018] font-semibold">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1 bg-white rounded border border-gray-200">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded disabled:opacity-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discount and Notes */}
          <div className="p-4 border-t border-gray-200 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  placeholder="Giảm giá"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="percentage">%</option>
                <option value="fixed">VND</option>
              </select>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D70018] resize-none outline-none"
            />
          </div>

          {/* Total and Payment */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tạm tính</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Thuế VAT (10%)</span>
                <span className="font-medium">{formatCurrency(tax)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Giảm giá</span>
                  <span className="font-medium">
                    {formatCurrency(discountType === 'percentage' ? (total * discount) / 100 : discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Tổng cộng</span>
                <span className="text-xl font-bold text-[#D70018]">{formatCurrency(calculateFinalTotal())}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleProcessOrder('cash')}
                disabled={items.length === 0 || processingOrder}
                className="flex flex-col items-center gap-1 p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <DollarSign className="w-5 h-5" />
                <span className="text-xs font-medium">Tiền mặt</span>
              </button>
              <button
                onClick={() => handleProcessOrder('card')}
                disabled={items.length === 0 || processingOrder}
                className="flex flex-col items-center gap-1 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs font-medium">Thẻ</span>
              </button>
              <button
                onClick={() => handleProcessOrder('transfer')}
                disabled={items.length === 0 || processingOrder}
                className="flex flex-col items-center gap-1 p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Scan className="w-5 h-5" />
                <span className="text-xs font-medium">Chuyển khoản</span>
              </button>
            </div>

            <button
              onClick={() => {
                clearCart();
                setSelectedCustomer(null);
                setDiscount(0);
                setNotes('');
              }}
              className="w-full mt-2 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            >
              Hủy đơn hàng
            </button>
          </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Chọn khách hàng</h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Tìm kiếm khách hàng..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedCustomer({
                      id: 'walk-in',
                      name: 'Khách lẻ',
                      phone: '',
                      email: '',
                    });
                    setShowCustomerModal(false);
                  }}
                  className="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <p className="font-medium">Khách lẻ</p>
                  <p className="text-sm text-gray-500">Khách hàng vãng lai</p>
                </button>
                {/* Add more customers from API */}
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer({
                    id: 'walk-in',
                    name: 'Khách lẻ',
                    phone: '',
                    email: '',
                  });
                  setShowCustomerModal(false);
                }}
                className="w-full mt-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Chọn khách lẻ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

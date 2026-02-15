import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogApi, type Product } from '../../../api/catalog';
import { adminApi } from '../../../api/admin';
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
  QrCode,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  Pause,
  Play,
  History,
  Users,
  ArrowLeft,
  Receipt
} from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import toast from 'react-hot-toast';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface HeldOrder {
  id: string;
  items: typeof items;
  customer: Customer | null;
  discount: number;
  discountType: 'percentage' | 'fixed';
  notes: string;
  heldAt: Date;
}

// Receipt Modal Component
const ReceiptModal = ({
  order,
  onClose,
  onPrint
}: {
  order: { orderNumber: string; items: any[]; subtotal: number; tax: number; discount: number; total: number; customer: Customer | null; paymentMethod: string };
  onClose: () => void;
  onPrint: () => void;
}) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        {/* Success Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-8 text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Thanh toán thành công!</h2>
          <p className="text-emerald-100 mt-2 font-mono text-lg">{order.orderNumber}</p>
        </div>

        {/* Receipt Content */}
        <div className="p-6 space-y-4">
          {/* Customer Info */}
          {order.customer && order.customer.id !== 'walk-in' && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Khách hàng</p>
              <p className="font-bold text-gray-900">{order.customer.name}</p>
              {order.customer.phone && <p className="text-sm text-gray-600">{order.customer.phone}</p>}
            </div>
          )}

          {/* Items */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.name} x{item.quantity}</span>
                <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tạm tính</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT (10%)</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Giảm giá</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black pt-2 border-t border-gray-200">
              <span>Tổng cộng</span>
              <span className="text-[#D70018]">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-sm text-blue-600 font-bold">
              Thanh toán: {order.paymentMethod === 'cash' ? 'Tiền mặt' : order.paymentMethod === 'card' ? 'Thẻ' : 'Chuyển khoản'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-gray-50 flex gap-3">
          <button
            onClick={onPrint}
            className="flex-1 py-3 bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-5 h-5" />
            In hóa đơn
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-[#D70018] text-white rounded-xl font-bold hover:bg-[#b50014] transition-colors"
          >
            Đơn mới
          </button>
        </div>
      </div>
    </div>
  );
};

// Customer Search Modal
const CustomerSearchModal = ({
  onSelect,
  onClose
}: {
  onSelect: (customer: Customer) => void;
  onClose: () => void;
}) => {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async () => {
    if (!search.trim()) {
      setCustomers([]);
      return;
    }

    setLoading(true);
    try {
      const result = await adminApi.users.getList({
        search: search.trim(),
        pageSize: 10,
        role: 'Customer'
      });
      setCustomers(result.items.map(u => ({
        id: u.id,
        name: u.fullName || u.email,
        phone: '',
        email: u.email
      })));
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim()) handleSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D70018]" />
            Chọn khách hàng
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email, SĐT..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#D70018] focus:outline-none"
            />
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {/* Walk-in customer option */}
            <button
              onClick={() => {
                onSelect({ id: 'walk-in', name: 'Khách lẻ', phone: '', email: '' });
              }}
              className="w-full p-4 text-left hover:bg-amber-50 rounded-xl border-2 border-dashed border-amber-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-amber-700">Khách lẻ (Vãng lai)</p>
                  <p className="text-sm text-amber-600">Không cần thông tin khách hàng</p>
                </div>
              </div>
            </button>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-[#D70018] border-t-transparent rounded-full mx-auto" />
              </div>
            ) : customers.length === 0 && search.trim() ? (
              <div className="text-center py-8 text-gray-500">
                Không tìm thấy khách hàng
              </div>
            ) : (
              customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => onSelect(customer)}
                  className="w-full p-4 text-left hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{customer.name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {customer.email}
                        </span>
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Held Orders Modal
const HeldOrdersModal = ({
  heldOrders,
  onResume,
  onDelete,
  onClose
}: {
  heldOrders: HeldOrder[];
  onResume: (order: HeldOrder) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Đơn hàng đang giữ ({heldOrders.length})
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {heldOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Pause className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Không có đơn hàng nào đang giữ</p>
            </div>
          ) : (
            heldOrders.map((order) => (
              <div key={order.id} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900">
                      {order.customer?.name || 'Khách lẻ'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.heldAt).toLocaleTimeString('vi-VN')} - {order.items.length} sản phẩm
                    </p>
                  </div>
                  <p className="font-bold text-[#D70018]">
                    {formatCurrency(order.items.reduce((sum, item) => sum + item.price * item.quantity, 0))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onResume(order)}
                    className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 flex items-center justify-center gap-1"
                  >
                    <Play className="w-4 h-4" /> Tiếp tục
                  </button>
                  <button
                    onClick={() => onDelete(order.id)}
                    className="py-2 px-4 bg-red-100 text-red-600 rounded-lg text-sm font-bold hover:bg-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default function POSPage() {
  const navigate = useNavigate();
  const { items, addToCart, removeFromCart, updateQuantity, clearCart, subtotal, tax, total } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [notes, setNotes] = useState('');

  const [processingOrder, setProcessingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  // Hold orders
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [showHeldOrders, setShowHeldOrders] = useState(false);

  // Barcode input
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [barcodeMode, setBarcodeMode] = useState(false);

  useEffect(() => {
    loadCategories();
    // Load held orders from localStorage
    const saved = localStorage.getItem('pos_held_orders');
    if (saved) {
      setHeldOrders(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  // Save held orders to localStorage
  useEffect(() => {
    localStorage.setItem('pos_held_orders', JSON.stringify(heldOrders));
  }, [heldOrders]);

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

  const handleBarcodeSearch = async (barcode: string) => {
    if (!barcode.trim()) return;

    try {
      // Search by SKU/barcode
      const data = await catalogApi.getProducts({
        search: barcode.trim(),
        pageSize: 1,
      });

      if (data.products.length > 0) {
        const product = data.products[0];
        if (product.stockQuantity > 0) {
          addToCart(product);
          toast.success(`Đã thêm: ${product.name}`);
        } else {
          toast.error('Sản phẩm hết hàng');
        }
      } else {
        toast.error('Không tìm thấy sản phẩm');
      }
    } catch (error) {
      toast.error('Lỗi tìm kiếm');
    }

    // Clear barcode input
    if (barcodeInputRef.current) {
      barcodeInputRef.current.value = '';
    }
  };

  const handleAddToCart = (product: Product) => {
    if (product.stockQuantity > 0) {
      addToCart(product);
      toast.success(`Đã thêm: ${product.name}`, { duration: 1500 });
    }
  };

  const handleHoldOrder = () => {
    if (items.length === 0) {
      toast.error('Giỏ hàng trống');
      return;
    }

    const heldOrder: HeldOrder = {
      id: Date.now().toString(),
      items: [...items],
      customer: selectedCustomer,
      discount,
      discountType,
      notes,
      heldAt: new Date()
    };

    setHeldOrders([...heldOrders, heldOrder]);
    clearCart();
    setSelectedCustomer(null);
    setDiscount(0);
    setNotes('');
    toast.success('Đã giữ đơn hàng');
  };

  const handleResumeOrder = (order: HeldOrder) => {
    // Clear current cart first
    clearCart();

    // Add items from held order
    order.items.forEach(item => {
      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        stockQuantity: 999, // We already reserved
        imageUrl: item.imageUrl
      } as Product);
      // Update quantity if more than 1
      if (item.quantity > 1) {
        updateQuantity(item.id, item.quantity);
      }
    });

    setSelectedCustomer(order.customer);
    setDiscount(order.discount);
    setDiscountType(order.discountType);
    setNotes(order.notes);

    // Remove from held
    setHeldOrders(heldOrders.filter(o => o.id !== order.id));
    setShowHeldOrders(false);
    toast.success('Đã khôi phục đơn hàng');
  };

  const handleDeleteHeldOrder = (id: string) => {
    setHeldOrders(heldOrders.filter(o => o.id !== id));
    toast.success('Đã xóa đơn hàng');
  };

  const handleProcessOrder = async (paymentMethod: 'cash' | 'card' | 'transfer') => {
    if (items.length === 0) {
      toast.error('Giỏ hàng trống');
      return;
    }

    setProcessingOrder(true);
    try {
      const discountAmount = discountType === 'percentage' ? (total * discount) / 100 : discount;
      const customerId = selectedCustomer?.id === 'walk-in' ? undefined : selectedCustomer?.id;

      const orderData = {
        customerId: customerId,
        items: items.map((item) => ({
          productId: item.id,
          productName: item.name,
          unitPrice: item.price,
          quantity: item.quantity,
        })),
        shippingAddress: 'Tại quầy POS',
        notes: notes ? `${notes} | Thanh toán: ${paymentMethod}` : `Thanh toán: ${paymentMethod}`,
        manualDiscount: discountAmount > 0 ? discountAmount : null,
        paymentMethod: paymentMethod.toUpperCase(),
        isPickup: true,
        pickupStoreName: 'Cửa hàng chính'
      };

      const client = (await import('../../../api/client')).default;
      const response = await client.post('/sales/checkout', orderData);

      if (response.data) {
        const result = response.data;

        // Show receipt
        setCompletedOrder({
          orderNumber: result.orderNumber || result.OrderNumber,
          items: [...items],
          subtotal,
          tax,
          discount: discountAmount,
          total: calculateFinalTotal(),
          customer: selectedCustomer,
          paymentMethod
        });

        // Clear cart
        clearCart();
        setSelectedCustomer(null);
        setDiscount(0);
        setNotes('');
      }
    } catch (error: any) {
      console.error('Failed to process order:', error);
      toast.error(error?.response?.data?.Error || 'Có lỗi xảy ra khi tạo đơn hàng');
    } finally {
      setProcessingOrder(false);
    }
  };

  const handlePrintReceipt = () => {
    // Create print window
    const printContent = `
      <html>
        <head>
          <title>Hóa đơn - ${completedOrder?.orderNumber}</title>
          <style>
            body { font-family: monospace; font-size: 12px; width: 300px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { font-size: 18px; margin: 0; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; font-size: 14px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>QUANG HUONG COMPUTER</h1>
            <p>Hóa đơn bán hàng</p>
            <p>${completedOrder?.orderNumber}</p>
            <p>${new Date().toLocaleString('vi-VN')}</p>
          </div>
          <div class="divider"></div>
          ${completedOrder?.customer?.name ? `<p>Khách hàng: ${completedOrder.customer.name}</p>` : ''}
          <div class="divider"></div>
          ${completedOrder?.items?.map((item: any) => `
            <div class="item">
              <span>${item.name}</span>
            </div>
            <div class="item">
              <span>${item.quantity} x ${formatCurrency(item.price)}</span>
              <span>${formatCurrency(item.price * item.quantity)}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="item">
            <span>Tạm tính:</span>
            <span>${formatCurrency(completedOrder?.subtotal || 0)}</span>
          </div>
          <div class="item">
            <span>VAT (10%):</span>
            <span>${formatCurrency(completedOrder?.tax || 0)}</span>
          </div>
          ${completedOrder?.discount > 0 ? `
            <div class="item">
              <span>Giảm giá:</span>
              <span>-${formatCurrency(completedOrder.discount)}</span>
            </div>
          ` : ''}
          <div class="divider"></div>
          <div class="item total">
            <span>TỔNG CỘNG:</span>
            <span>${formatCurrency(completedOrder?.total || 0)}</span>
          </div>
          <div class="divider"></div>
          <p>Thanh toán: ${completedOrder?.paymentMethod === 'cash' ? 'Tiền mặt' : completedOrder?.paymentMethod === 'card' ? 'Thẻ' : 'Chuyển khoản'}</p>
          <div class="footer">
            <p>Cảm ơn quý khách!</p>
            <p>Hotline: 1900-xxxx</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const calculateFinalTotal = () => {
    const discountAmount = discountType === 'percentage' ? (total * discount) / 100 : discount;
    return Math.max(0, total - discountAmount);
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/backoffice/sale')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">POS Bán hàng</h1>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
              Online
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Barcode toggle */}
            <button
              onClick={() => {
                setBarcodeMode(!barcodeMode);
                if (!barcodeMode) {
                  setTimeout(() => barcodeInputRef.current?.focus(), 100);
                }
              }}
              className={`p-2 rounded-lg transition-colors ${barcodeMode ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Quét mã vạch"
            >
              <QrCode className="w-5 h-5" />
            </button>

            {/* Held orders */}
            <button
              onClick={() => setShowHeldOrders(true)}
              className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              title="Đơn đang giữ"
            >
              <Clock className="w-5 h-5" />
              {heldOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {heldOrders.length}
                </span>
              )}
            </button>

            {/* History */}
            <button
              onClick={() => navigate('/backoffice/orders')}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              title="Lịch sử đơn hàng"
            >
              <History className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barcode input (hidden but focusable) */}
        {barcodeMode && (
          <div className="mt-3 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-500" />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Quét mã vạch hoặc nhập SKU..."
              className="flex-1 px-4 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 outline-none font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleBarcodeSearch((e.target as HTMLInputElement).value);
                }
              }}
            />
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search and Filter Bar */}
          <div className="bg-white p-3 border-b border-gray-200">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tìm sản phẩm... (Enter)"
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#D70018] focus:border-transparent outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      loadProducts();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#D70018] focus:border-transparent outline-none min-w-[150px]"
              >
                <option value="">Tất cả</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 animate-pulse">
                    <div className="bg-gray-200 aspect-square rounded-lg mb-2"></div>
                    <div className="bg-gray-200 h-4 rounded mb-1"></div>
                    <div className="bg-gray-200 h-4 w-2/3 rounded"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">Không tìm thấy sản phẩm</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stockQuantity === 0}
                    className={`bg-white rounded-xl p-2 text-left transition-all hover:shadow-lg active:scale-95 ${
                      product.stockQuantity === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#D70018]'
                    } border border-gray-200 group flex flex-col`}
                  >
                    <div className="aspect-square bg-gray-50 rounded-lg mb-2 overflow-hidden flex items-center justify-center p-1">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-gray-300" />
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 text-xs line-clamp-2 mb-1 min-h-[32px]">{product.name}</h3>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-sm font-bold text-[#D70018]">{formatCurrency(product.price)}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        product.stockQuantity > 10 ? 'bg-emerald-100 text-emerald-700' :
                        product.stockQuantity > 0 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {product.stockQuantity > 0 ? product.stockQuantity : 'Hết'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-[380px] bg-white border-l border-gray-200 flex flex-col">
          {/* Customer Info */}
          <div className="p-3 border-b border-gray-200">
            <button
              onClick={() => setShowCustomerModal(true)}
              className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                selectedCustomer
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-dashed border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedCustomer ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-200 text-gray-500'
              }`}>
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                {selectedCustomer ? (
                  <>
                    <p className="font-bold text-gray-900">{selectedCustomer.name}</p>
                    <p className="text-xs text-gray-500">{selectedCustomer.email || 'Khách vãng lai'}</p>
                  </>
                ) : (
                  <p className="text-gray-500 font-medium">Chọn khách hàng</p>
                )}
              </div>
              {selectedCustomer && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomer(null);
                  }}
                  className="p-1 hover:bg-red-100 rounded-full text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-3">
            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart className="w-16 h-16 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Giỏ hàng trống</p>
                <p className="text-sm">Click vào sản phẩm để thêm</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 group"
                  >
                    <div className="w-14 h-14 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                      <img
                        src={item.imageUrl || `https://ui-avatars.com/api/?name=${item.name}&background=f3f4f6&color=9ca3af`}
                        alt={item.name}
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">{item.name}</h4>
                      <p className="text-[#D70018] font-bold text-sm">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200">
                        <button
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-l-lg"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-bold w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-r-lg"
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
          <div className="p-3 border-t border-gray-200 space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  placeholder="Giảm giá"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D70018] outline-none"
                />
              </div>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D70018] outline-none"
              >
                <option value="percentage">%</option>
                <option value="fixed">VND</option>
              </select>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú đơn hàng..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D70018] outline-none resize-none"
            />
          </div>

          {/* Total and Payment */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tạm tính ({items.reduce((s, i) => s + i.quantity, 0)} SP)</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT (10%)</span>
                <span className="font-medium">{formatCurrency(tax)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Giảm giá</span>
                  <span className="font-medium">
                    -{formatCurrency(discountType === 'percentage' ? (total * discount) / 100 : discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-bold text-gray-900">Tổng cộng</span>
                <span className="text-xl font-black text-[#D70018]">{formatCurrency(calculateFinalTotal())}</span>
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              <button
                onClick={() => handleProcessOrder('cash')}
                disabled={items.length === 0 || processingOrder}
                className="flex flex-col items-center gap-1 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <DollarSign className="w-5 h-5" />
                <span className="text-xs font-bold">Tiền mặt</span>
              </button>
              <button
                onClick={() => handleProcessOrder('card')}
                disabled={items.length === 0 || processingOrder}
                className="flex flex-col items-center gap-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs font-bold">Thẻ</span>
              </button>
              <button
                onClick={() => handleProcessOrder('transfer')}
                disabled={items.length === 0 || processingOrder}
                className="flex flex-col items-center gap-1 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Receipt className="w-5 h-5" />
                <span className="text-xs font-bold">Chuyển khoản</span>
              </button>
            </div>

            {/* Secondary Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleHoldOrder}
                disabled={items.length === 0}
                className="flex-1 py-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Pause className="w-4 h-4" /> Giữ đơn
              </button>
              <button
                onClick={() => {
                  clearCart();
                  setSelectedCustomer(null);
                  setDiscount(0);
                  setNotes('');
                }}
                disabled={items.length === 0}
                className="flex-1 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                Hủy đơn
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCustomerModal && (
        <CustomerSearchModal
          onSelect={(customer) => {
            setSelectedCustomer(customer);
            setShowCustomerModal(false);
          }}
          onClose={() => setShowCustomerModal(false)}
        />
      )}

      {showHeldOrders && (
        <HeldOrdersModal
          heldOrders={heldOrders}
          onResume={handleResumeOrder}
          onDelete={handleDeleteHeldOrder}
          onClose={() => setShowHeldOrders(false)}
        />
      )}

      {completedOrder && (
        <ReceiptModal
          order={completedOrder}
          onClose={() => setCompletedOrder(null)}
          onPrint={handlePrintReceipt}
        />
      )}

      {/* Loading overlay */}
      {processingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-[#D70018] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="font-bold text-gray-900">Đang xử lý thanh toán...</p>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ArrowLeft, ArrowRight, CreditCard, Truck, User, MapPin, Phone, Mail, Lock, Check } from 'lucide-react';

interface CheckoutForm {
  // Customer Info
  fullName: string;
  email: string;
  phone: string;
  
  // Shipping Address
  address: string;
  ward: string;
  district: string;
  province: string;
  postalCode: string;
  
  // Payment
  paymentMethod: 'cod' | 'bank_transfer' | 'credit_card';
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  
  // Notes
  notes?: string;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, tax, total, discountAmount, couponCode } = useCart();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CheckoutForm>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    ward: '',
    district: '',
    province: '',
    postalCode: '',
    paymentMethod: 'cod',
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});

  if (items.length === 0 && step !== 3) {
    navigate('/cart');
    return null;
  }

  const validateForm = () => {
    const newErrors: Partial<Record<keyof CheckoutForm, string>> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ tên';
    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }
    if (!formData.address.trim()) newErrors.address = 'Vui lòng nhập địa chỉ';
    if (!formData.ward.trim()) newErrors.ward = 'Vui lòng chọn phường/xã';
    if (!formData.district.trim()) newErrors.district = 'Vui lòng chọn quận/huyện';
    if (!formData.province.trim()) newErrors.province = 'Vui lòng chọn tỉnh/thành';

    if (formData.paymentMethod === 'credit_card') {
      if (!formData.cardNumber?.trim()) newErrors.cardNumber = 'Vui lòng nhập số thẻ';
      if (!formData.cardExpiry?.trim()) newErrors.cardExpiry = 'Vui lòng nhập ngày hết hạn';
      if (!formData.cardCvv?.trim()) newErrors.cardCvv = 'Vui lòng nhập CVV';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CheckoutForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
      await processOrder();
    }
  };

  const processOrder = async () => {
    setLoading(true);
    try {
      // Call API to create order
      const response = await fetch('/api/sales/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerInfo: {
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
          },
          shippingAddress: {
            address: formData.address,
            ward: formData.ward,
            district: formData.district,
            province: formData.province,
            postalCode: formData.postalCode,
          },
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price,
          })),
          paymentMethod: formData.paymentMethod,
          couponCode: couponCode,
          notes: formData.notes,
          subtotal,
          tax,
          discountAmount,
          total,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOrderId(data.orderId);
      }
    } catch (error) {
      console.error('Failed to process order:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const provinces = [
    'Hà Nội',
    'TP. Hồ Chí Minh',
    'Đà Nẵng',
    'Hải Phòng',
    'Cần Thơ',
    // Add more provinces
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => step > 1 ? setStep((s) => (s - 1) as 1 | 2) : navigate('/cart')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            {step > 1 ? 'Quay lại' : 'Quay lại giỏ hàng'}
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Thanh toán</h1>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              } font-semibold`}>
                {step > 1 ? <Check className="w-6 h-6" /> : '1'}
              </div>
              <span className={`ml-2 font-medium ${step >= 1 ? 'text-blue-600' : 'text-gray-600'}`}>
                Thông tin giao hàng
              </span>
            </div>
            <div className={`w-24 h-1 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              } font-semibold`}>
                {step > 2 ? <Check className="w-6 h-6" /> : '2'}
              </div>
              <span className={`ml-2 font-medium ${step >= 2 ? 'text-blue-600' : 'text-gray-600'}`}>
                Phương thức thanh toán
              </span>
            </div>
            <div className={`w-24 h-1 mx-4 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              } font-semibold`}>
                {step > 3 ? <Check className="w-6 h-6" /> : '3'}
              </div>
              <span className={`ml-2 font-medium ${step >= 3 ? 'text-blue-600' : 'text-gray-600'}`}>
                Xác nhận
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {step === 1 && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Customer Information */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <User className="w-6 h-6 text-blue-600" />
                      Thông tin khách hàng
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Họ và tên <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.fullName ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Nguyễn Văn A"
                        />
                        {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.email ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="email@example.com"
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Số điện thoại <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.phone ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="0912345678"
                        />
                        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <MapPin className="w-6 h-6 text-blue-600" />
                      Địa chỉ giao hàng
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tỉnh/Thành phố <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.province}
                          onChange={(e) => handleInputChange('province', e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.province ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Chọn tỉnh/thành phố</option>
                          {provinces.map((province) => (
                            <option key={province} value={province}>
                              {province}
                            </option>
                          ))}
                        </select>
                        {errors.province && <p className="text-red-500 text-sm mt-1">{errors.province}</p>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quận/Huyện <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.district}
                            onChange={(e) => handleInputChange('district', e.target.value)}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.district ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Quận 1"
                          />
                          {errors.district && <p className="text-red-500 text-sm mt-1">{errors.district}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phường/Xã <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.ward}
                            onChange={(e) => handleInputChange('ward', e.target.value)}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.ward ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Phường Bến Nghé"
                          />
                          {errors.ward && <p className="text-red-500 text-sm mt-1">{errors.ward}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Địa chỉ chi tiết <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.address ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Số 123 Đường ABC"
                        />
                        {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    Tiếp tục
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-blue-600" />
                    Chọn phương thức thanh toán
                  </h2>

                  <div className="space-y-4">
                    <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.paymentMethod === 'cod' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="payment"
                        checked={formData.paymentMethod === 'cod'}
                        onChange={() => handleInputChange('paymentMethod', 'cod')}
                        className="w-5 h-5 text-blue-600"
                      />
                      <Truck className="w-8 h-8 ml-3 text-gray-600" />
                      <div className="ml-3 flex-1">
                        <p className="font-medium">Thanh toán khi nhận hàng (COD)</p>
                        <p className="text-sm text-gray-500">Thanh toán bằng tiền mặt khi nhận hàng</p>
                      </div>
                    </label>

                    <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.paymentMethod === 'bank_transfer' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="payment"
                        checked={formData.paymentMethod === 'bank_transfer'}
                        onChange={() => handleInputChange('paymentMethod', 'bank_transfer')}
                        className="w-5 h-5 text-blue-600"
                      />
                      <CreditCard className="w-8 h-8 ml-3 text-gray-600" />
                      <div className="ml-3 flex-1">
                        <p className="font-medium">Chuyển khoản ngân hàng</p>
                        <p className="text-sm text-gray-500">Chuyển khoản qua Internet Banking</p>
                      </div>
                    </label>

                    <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.paymentMethod === 'credit_card' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="payment"
                        checked={formData.paymentMethod === 'credit_card'}
                        onChange={() => handleInputChange('paymentMethod', 'credit_card')}
                        className="w-5 h-5 text-blue-600"
                      />
                      <Lock className="w-8 h-8 ml-3 text-gray-600" />
                      <div className="ml-3 flex-1">
                        <p className="font-medium">Thẻ tín dụng/Ghi nợ</p>
                        <p className="text-sm text-gray-500">Visa, MasterCard, JCB, Napas</p>
                      </div>
                    </label>
                  </div>

                  {formData.paymentMethod === 'credit_card' && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số thẻ</label>
                        <input
                          type="text"
                          value={formData.cardNumber || ''}
                          onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                          placeholder="1234 5678 9012 3456"
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.cardNumber ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.cardNumber && <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Ngày hết hạn</label>
                          <input
                            type="text"
                            value={formData.cardExpiry || ''}
                            onChange={(e) => handleInputChange('cardExpiry', e.target.value)}
                            placeholder="MM/YY"
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.cardExpiry ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {errors.cardExpiry && <p className="text-red-500 text-sm mt-1">{errors.cardExpiry}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                          <input
                            type="text"
                            value={formData.cardCvv || ''}
                            onChange={(e) => handleInputChange('cardCvv', e.target.value)}
                            placeholder="123"
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.cardCvv ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {errors.cardCvv && <p className="text-red-500 text-sm mt-1">{errors.cardCvv}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Quay lại
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      Đặt hàng
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              )}

              {step === 3 && (
                <div className="text-center py-8">
                  {loading ? (
                    <div>
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Đang xử lý đơn hàng...</p>
                    </div>
                  ) : (
                    <div>
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-10 h-10 text-green-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Đặt hàng thành công!</h2>
                      <p className="text-gray-600 mb-4">Mã đơn hàng: <span className="font-semibold">{orderId}</span></p>
                      <p className="text-gray-600 mb-6">
                        Chúng tôi sẽ gửi email xác nhận và thông báo khi đơn hàng được giao.
                      </p>
                      <button
                        onClick={() => navigate('/orders')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Xem đơn hàng của tôi
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h3 className="text-lg font-semibold mb-4">Đơn hàng ({items.length} sản phẩm)</h3>

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={`https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=100&h=100&fit=crop`}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">{item.name}</h4>
                      <p className="text-sm text-gray-500">SL: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tạm tính</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Giảm giá</span>
                    <span className="font-medium">-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Phí vận chuyển</span>
                  <span className="font-medium text-green-600">Miễn phí</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Thuế VAT (10%)</span>
                  <span className="font-medium">{formatPrice(tax)}</span>
                </div>

                <div className="border-t pt-2 mt-2">
                  <div className="flex justi�fy-between">
                    <span className="font-semibold text-gray-900">Tổng cộng</span>
                    <span className="font-bold text-xl text-blue-600">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

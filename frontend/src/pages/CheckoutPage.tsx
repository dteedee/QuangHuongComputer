import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  ArrowLeft, ArrowRight, CreditCard, Truck, User,
  MapPin, Phone, Mail, Lock, Check, ChevronRight,
  ShieldCheck, Package, ShoppingBag, CreditCard as CardIcon,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { salesApi } from '../api/sales';
import { paymentApi } from '../api/payment';

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

  // Delivery Method
  deliveryMethod: 'delivery' | 'pickup';
  pickupStoreId: string;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { items, subtotal, tax, total, discountAmount, couponCode, clearCart } = useCart();
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
    deliveryMethod: 'delivery',
    pickupStoreId: 'headquarters',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});

  // Effect for success celebration
  useEffect(() => {
    if (step === 3 && orderId) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D70018', '#000000', '#ffffff']
      });
    }
  }, [step, orderId]);

  if (items.length === 0 && step !== 3) {
    navigate('/cart');
    return null;
  }

  const validateForm = () => {
    const newErrors: Partial<Record<keyof CheckoutForm, string>> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ tên';

    // Chỉ validate email khi giao hàng tận nơi
    if (formData.deliveryMethod === 'delivery') {
      if (!formData.email.trim()) {
        newErrors.email = 'Vui lòng nhập email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email không hợp lệ';
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    // Chỉ validate địa chỉ khi giao hàng tận nơi
    if (step === 1 && formData.deliveryMethod === 'delivery') {
      if (!formData.address.trim()) newErrors.address = 'Vui lòng nhập địa chỉ';
      if (!formData.ward.trim()) newErrors.ward = 'Vui lòng chọn phường/xã';
      if (!formData.district.trim()) newErrors.district = 'Vui lòng chọn quận/huyện';
      if (!formData.province.trim()) newErrors.province = 'Vui lòng chọn tỉnh/thành';
    }

    if (step === 2 && formData.paymentMethod === 'credit_card') {
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

  const nextStep = () => {
    if (validateForm()) {
      setStep((s) => (s + 1) as 1 | 2 | 3);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setStep((s) => (s - 1) as 1 | 2 | 3);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    await processOrder();
  };



  const processOrder = async () => {
    setLoading(true);
    try {
      const shippingAddress = formData.deliveryMethod === 'pickup'
        ? 'Nhận tại cửa hàng'
        : `${formData.address}, ${formData.ward}, ${formData.district}, ${formData.province}`;

      let response;

      if (isAuthenticated && user) {
        // Authenticated user checkout
        const checkoutData = {
          items: items.map(item => ({
            productId: item.id,
            productName: item.name,
            unitPrice: item.price,
            quantity: item.quantity
          })),
          shippingAddress,
          notes: formData.notes,
          couponCode: couponCode || undefined,
          paymentMethod: formData.paymentMethod,
          isPickup: formData.deliveryMethod === 'pickup',
          pickupStoreId: formData.deliveryMethod === 'pickup' ? formData.pickupStoreId : undefined,
          pickupStoreName: formData.deliveryMethod === 'pickup' ? 'Quang Hưởng Computer - Trụ sở chính' : undefined,
          customerId: user.id
        };
        response = await salesApi.orders.create(checkoutData);
      } else {
        // Guest checkout
        const guestCheckoutData = {
          customerName: formData.fullName,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          shippingAddress,
          items: items.map(item => ({
            productId: item.id,
            productName: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          couponCode: couponCode || undefined,
          notes: formData.notes,
          paymentMethod: formData.paymentMethod,
        };
        response = await salesApi.orders.guestCheckout(guestCheckoutData);
      }

      if (response && response.orderId) {
        setOrderId(response.orderId);

        // Step 2: Handle payment based on payment method
        if (formData.paymentMethod === 'cod') {
          // COD - No payment processing needed
          setStep(3);
          clearCart();
          toast.success('Đặt hàng thành công!');
          triggerConfetti();
        } else if (formData.paymentMethod === 'credit_card') {
          // Credit card - Initiate VNPay payment
          try {
            const paymentResponse = await paymentApi.initiate({
              orderId: response.orderId,
              amount: response.totalAmount,
              provider: 0 // VNPay
            });

            if (paymentResponse.paymentUrl) {
              // Save order info before redirect
              clearCart();
              toast.success('Đang chuyển đến trang thanh toán...');
              // Redirect to VNPay
              window.location.href = paymentResponse.paymentUrl;
            } else {
              // Fallback to payment page
              clearCart();
              navigate(`/payment/${response.orderId}`);
            }
          } catch (paymentError) {
            console.error('Payment initiation failed:', paymentError);
            // Order is created, redirect to payment page
            clearCart();
            navigate(`/payment/${response.orderId}`, {
              state: { error: 'Không thể kết nối cổng thanh toán. Vui lòng thanh toán thủ công.' }
            });
          }
        } else if (formData.paymentMethod === 'bank_transfer') {
          // SePay (Bank Transfer)
          try {
            const paymentResponse = await paymentApi.initiate({
              orderId: response.orderId,
              amount: response.totalAmount,
              provider: 4 // SePay
            });

            if (paymentResponse.paymentUrl) {
              // Store payment info for success page
              localStorage.setItem('lastPaymentUrl', paymentResponse.paymentUrl);
              localStorage.setItem('lastOrderId', response.orderId);
              localStorage.setItem('lastOrderAmount', response.totalAmount.toString());

              setStep(3);
              clearCart();
              toast.success('Đặt hàng thành công! Vui lòng quét mã QR để thanh toán.');
              triggerConfetti();
            } else {
              toast.error('Không thể tạo mã QR. Vui lòng thử lại.');
            }
          } catch (e) {
            console.error('SePay initiation failed', e);
            toast.error('Lỗi khởi tạo thanh toán SePay');
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to process order:', error);
      // Try to get error message from various sources
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.Error ||
        error?.response?.data?.message ||
        error?.message ||
        'Có lỗi xảy ra khi xử lý đơn hàng. Vui lòng thử lại.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const provinces = [
    'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
    'Bình Dương', 'Đồng Nai', 'Khánh Hòa', 'Hải Dương', 'Long An',
    'Quảng Ninh', 'Bắc Ninh', 'Thái Nguyên', 'Nam Định', 'Thái Bình'
  ];

  const steps = [
    { title: 'Thông tin', icon: User },
    { title: 'Thanh toán', icon: CreditCard },
    { title: 'Hoàn tất', icon: Check },
  ];

  return (
    <div className="min-h-screen bg-[#f8fbff] py-12 font-sans selection:bg-red-100 selection:text-[#D70018]">
      <div className="max-w-[1200px] mx-auto px-4">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <button
              onClick={() => step > 1 ? prevStep() : navigate('/cart')}
              className="group flex items-center gap-2 text-slate-500 hover:text-[#D70018] transition-all mb-2"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">{step > 1 ? 'Quay lại bước trước' : 'Quay lại giỏ hàng'}</span>
            </button>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
              CHECKOUT <span className="text-[#D70018]">EXPERIENCE</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            {steps.map((s, idx) => (
              <div key={idx} className="flex items-center">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${step === idx + 1
                  ? 'bg-[#D70018] text-white shadow-lg shadow-red-500/30'
                  : step > idx + 1
                    ? 'text-green-600 bg-green-50'
                    : 'text-slate-400'
                  }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step === idx + 1 ? 'border-white/30' : 'border-current'
                    }`}>
                    {step > idx + 1 ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className="text-sm font-bold truncate hidden sm:block">{s.title}</span>
                </div>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 mx-1 text-slate-300" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-[#D70018]">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">Thông tin vận chuyển</h2>
                      <p className="text-slate-500 text-sm">Vui lòng nhập chính xác thông tin để chúng tôi phục vụ bạn tốt nhất</p>
                    </div>
                  </div>

                  {/* Guest Checkout Notice */}
                  {!isAuthenticated && (
                    <div className="mb-8 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 rounded-xl">
                          <User className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-amber-800 text-sm">Mua hàng không cần tài khoản</p>
                          <p className="text-amber-700 text-xs mt-1">
                            Bạn đang thanh toán với tư cách khách.{' '}
                            <button
                              onClick={() => navigate('/login', { state: { from: '/checkout' } })}
                              className="font-bold underline hover:text-amber-900"
                            >
                              Đăng nhập
                            </button>
                            {' '}để theo dõi đơn hàng và tích điểm.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delivery Method Toggle */}
                  <div className="flex p-1 bg-slate-100 rounded-2xl mb-8 gap-1">
                    <button
                      type="button"
                      onClick={() => handleInputChange('deliveryMethod', 'delivery')}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${formData.deliveryMethod === 'delivery'
                        ? 'bg-white text-[#D70018] shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      <Truck className="w-4 h-4" />
                      Giao hàng tận nơi
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('deliveryMethod', 'pickup')}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${formData.deliveryMethod === 'pickup'
                        ? 'bg-white text-[#D70018] shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      <MapPin className="w-4 h-4" />
                      Nhận tại cửa hàng
                    </button>
                  </div>

                  <form className="space-y-8">
                    {formData.deliveryMethod === 'pickup' ? (
                      <div className="space-y-6">
                        <div className="bg-red-50/50 border-2 border-red-100 rounded-2xl p-6">
                          <h4 className="font-black text-slate-900 mb-2 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-[#D70018]" />
                            TRỤ SỞ CHÍNH - QUANG HƯỞNG COMPUTER
                          </h4>
                          <p className="text-sm text-slate-600 font-medium">Số 123, Đường ABC, Quận XYZ, TP. Hà Nội</p>
                          <div className="mt-4 flex items-center gap-4">
                            <div className="text-xs bg-white px-3 py-1 rounded-full font-bold text-slate-500 border border-slate-100">
                              Mở cửa: 08:00 - 21:00
                            </div>
                            {(() => {
                              const now = new Date();
                              const currentHour = now.getHours();
                              const isOpen = currentHour >= 8 && currentHour < 21;
                              return isOpen ? (
                                <div className="text-xs bg-green-100 px-3 py-1 rounded-full font-bold text-green-700">
                                  Đang mở cửa
                                </div>
                              ) : (
                                <div className="text-xs bg-red-100 px-3 py-1 rounded-full font-bold text-red-700">
                                  Đã đóng cửa
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                              Họ và tên <span className="text-[#D70018]">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.fullName}
                              onChange={(e) => handleInputChange('fullName', e.target.value)}
                              className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-2xl transition-all outline-none font-bold ${errors.fullName ? 'border-red-500' : 'border-transparent focus:border-[#D70018]'}`}
                              placeholder="Nguyễn Văn A"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                              Số điện thoại <span className="text-[#D70018]">*</span>
                            </label>
                            <input
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => handleInputChange('phone', e.target.value)}
                              className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-2xl transition-all outline-none font-bold ${errors.phone ? 'border-red-500' : 'border-transparent focus:border-[#D70018]'}`}
                              placeholder="09xx xxx xxx"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                              Họ và tên <span className="text-[#D70018]">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                required
                                value={formData.fullName}
                                onChange={(e) => handleInputChange('fullName', e.target.value)}
                                className={`w-full pl-4 pr-4 py-4 bg-slate-50 border-2 rounded-2xl transition-all focus:bg-white outline-none text-slate-900 font-bold ${errors.fullName ? 'border-red-500 focus:ring-red-100' : 'border-transparent focus:border-[#D70018] focus:ring-red-50'
                                  }`}
                                placeholder="Nguyễn Văn A"
                              />
                              {errors.fullName && <p className="text-red-500 text-[10px] font-bold mt-1 ml-4 underline underline-offset-4 decoration-red-200">{errors.fullName}</p>}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                              Số điện thoại <span className="text-[#D70018]">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-2xl transition-all focus:bg-white outline-none text-slate-900 font-bold ${errors.phone ? 'border-red-500 focus:ring-red-100' : 'border-transparent focus:border-[#D70018] focus:ring-red-50'
                                  }`}
                                placeholder="09xx xxx xxx"
                              />
                              {errors.phone && <p className="text-red-500 text-[10px] font-bold mt-1 ml-4 underline underline-offset-4 decoration-red-200">{errors.phone}</p>}
                            </div>
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                              Email <span className="text-[#D70018]">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-2xl transition-all focus:bg-white outline-none text-slate-900 font-bold ${errors.email ? 'border-red-500 focus:ring-red-100' : 'border-transparent focus:border-[#D70018] focus:ring-red-50'
                                  }`}
                                placeholder="email@example.com"
                              />
                              {errors.email && <p className="text-red-500 text-[10px] font-bold mt-1 ml-4 underline underline-offset-4 decoration-red-200">{errors.email}</p>}
                            </div>
                          </div>
                        </div>

                        <div className="h-px bg-slate-100 w-full" />

                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                                Tỉnh / Thành <span className="text-[#D70018]">*</span>
                              </label>
                              <select
                                required
                                value={formData.province}
                                onChange={(e) => handleInputChange('province', e.target.value)}
                                className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-2xl transition-all appearance-none outline-none text-slate-900 font-bold ${errors.province ? 'border-red-500' : 'border-transparent focus:border-[#D70018] focus:bg-white'
                                  }`}
                              >
                                <option value="">Chọn tỉnh/thành</option>
                                {provinces.map((p) => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                                Quận / Huyện <span className="text-[#D70018]">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={formData.district}
                                onChange={(e) => handleInputChange('district', e.target.value)}
                                className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-2xl transition-all focus:bg-white outline-none text-slate-900 font-bold ${errors.district ? 'border-red-500' : 'border-transparent focus:border-[#D70018]'
                                  }`}
                                placeholder="Nhập quận/huyện"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                                Phường / Xã <span className="text-[#D70018]">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={formData.ward}
                                onChange={(e) => handleInputChange('ward', e.target.value)}
                                className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-2xl transition-all focus:bg-white outline-none text-slate-900 font-bold ${errors.ward ? 'border-red-500' : 'border-transparent focus:border-[#D70018]'
                                  }`}
                                placeholder="Nhập phường/xã"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                              Địa chỉ chi tiết <span className="text-[#D70018]">*</span>
                            </label>
                            <textarea
                              required
                              value={formData.address}
                              onChange={(e) => handleInputChange('address', e.target.value)}
                              rows={2}
                              className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-2xl transition-all focus:bg-white outline-none resize-none text-slate-900 font-bold ${errors.address ? 'border-red-500' : 'border-transparent focus:border-[#D70018]'
                                }`}
                              placeholder="Số nhà, tên đường..."
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={nextStep}
                      className="w-full py-5 bg-[#D70018] text-white rounded-2xl font-black text-lg shadow-xl shadow-red-500/30 hover:shadow-red-500/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      TIẾP TỤC THANH TOÁN
                      <ArrowRight className="w-6 h-6" />
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10"
                >
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-[#D70018]">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">Phương thức thanh toán</h2>
                      <p className="text-slate-500 text-sm">Lựa chọn cách thức thanh toán tiện lợi nhất cho bạn</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-8">
                    {[
                      { id: 'cod', title: 'Thanh toán khi nhận hàng', desc: 'Sử dụng tiền mặt khi shipper giao tới', icon: Truck },
                      { id: 'bank_transfer', title: 'Chuyển khoản (VietQR)', desc: 'Thanh toán tự động 24/7 với SePay', icon: CardIcon },
                      { id: 'credit_card', title: 'Thẻ tín dụng / Ghi nợ', desc: 'Hỗ trợ Visa, Master, JCB, Napas', icon: Lock },
                    ].map((method) => (
                      <label
                        key={method.id}
                        className={`group relative flex items-center p-6 border-2 rounded-2xl cursor-pointer transition-all ${formData.paymentMethod === method.id
                          ? 'border-[#D70018] bg-red-50/50'
                          : 'border-slate-100 hover:border-slate-200 bg-white'
                          }`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          checked={formData.paymentMethod === method.id}
                          onChange={() => handleInputChange('paymentMethod', method.id as any)}
                          className="hidden"
                        />
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${formData.paymentMethod === method.id ? 'bg-[#D70018] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                          }`}>
                          <method.icon className="w-6 h-6" />
                        </div>
                        <div className="ml-5 flex-1">
                          <p className={`font-black text-lg ${formData.paymentMethod === method.id ? 'text-slate-900' : 'text-slate-600'}`}>{method.title}</p>
                          <p className="text-sm text-slate-400 font-medium">{method.desc}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${formData.paymentMethod === method.id ? 'border-[#D70018]' : 'border-slate-200'
                          }`}>
                          {formData.paymentMethod === method.id && <div className="w-3 h-3 bg-[#D70018] rounded-full" />}
                        </div>
                      </label>
                    ))}
                  </div>

                  {formData.paymentMethod === 'credit_card' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-slate-50 rounded-2xl p-6 mb-8 space-y-4 border border-slate-100 overflow-hidden"
                    >
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                          Số thẻ <span className="text-[#D70018]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.cardNumber}
                          onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                          className="w-full px-4 py-4 bg-white border-2 border-transparent focus:border-[#D70018] rounded-2xl outline-none text-slate-900 font-bold"
                          placeholder="0000 0000 0000 0000"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                            Hạn dùng <span className="text-[#D70018]">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="MM/YY"
                            value={formData.cardExpiry}
                            onChange={(e) => handleInputChange('cardExpiry', e.target.value)}
                            className="w-full px-4 py-4 bg-white border-2 border-transparent focus:border-[#D70018] rounded-2xl outline-none text-slate-900 font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                            CVV <span className="text-[#D70018]">*</span>
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="***"
                            value={formData.cardCvv}
                            onChange={(e) => handleInputChange('cardCvv', e.target.value)}
                            className="w-full px-4 py-4 bg-white border-2 border-transparent focus:border-[#D70018] rounded-2xl outline-none text-slate-900 font-bold"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 mt-10">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="flex-1 py-5 border-2 border-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-50 transition-all"
                    >
                      QUAY LẠI
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading}
                      className={`flex-[2] py-5 bg-[#D70018] text-white rounded-2xl font-black text-lg shadow-xl shadow-red-500/30 hover:shadow-red-500/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {loading ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          XÁC NHẬN ĐẶT HÀNG
                          <ShieldCheck className="w-6 h-6" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-12 text-center"
                >
                  <div className="relative w-32 h-32 bg-green-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring' }}
                      className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/40"
                    >
                      <Check className="w-12 h-12" strokeWidth={3} />
                    </motion.div>
                    <div className="absolute -inset-4 border border-green-100 rounded-[3rem] animate-pulse" />
                  </div>

                  <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">ĐẶT HÀNG THÀNH CÔNG!</h2>
                  <p className="text-slate-500 font-medium mb-8">
                    Cảm ơn bạn đã tin tưởng Quang Hưởng Computer. <br />
                    Mã đơn hàng của bạn là: <span className="text-[#D70018] font-black tracking-widest bg-red-50 px-3 py-1 rounded-lg ml-1">#{orderId}</span>
                  </p>

                  <div className="bg-slate-50 rounded-2xl p-6 text-left max-w-md mx-auto mb-10 space-y-4">
                    {formData.email && (
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Email xác nhận</p>
                          <p className="text-sm font-bold text-slate-700">Đã được gửi tới {formData.email}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Liên hệ hỗ trợ</p>
                        <p className="text-sm font-bold text-slate-700">Bộ phận chăm sóc sẽ gọi xác nhận trong 15-30 phút</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#D70018]">
                        <CardIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Hình thức thanh toán</p>
                        <p className="text-sm font-bold text-slate-700">
                          {formData.paymentMethod === 'cod' && 'Thanh toán tiền mặt khi nhận hàng (COD)'}
                          {formData.paymentMethod === 'bank_transfer' && 'Chuyển khoản ngân hàng (Chờ xác nhận)'}
                          {formData.paymentMethod === 'credit_card' && 'Thanh toán qua thẻ Online'}
                        </p>
                        {formData.paymentMethod === 'cod' && (
                          <p className="text-[10px] text-slate-400 mt-1 italic">Vui lòng chuẩn bị số tiền {formatPrice(total)} khi shipper giao sản phẩm</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SePay QR Code Display */}
                  {formData.paymentMethod === 'bank_transfer' && (
                    <div className="bg-white border-2 border-green-200 rounded-2xl p-6 mb-6 shadow-sm">
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-black text-green-700 mb-2">QUÉT MÃ VIETQR ĐỂ THANH TOÁN</h3>
                        <p className="text-sm text-slate-500">Đơn hàng sẽ được xác nhận tự động sau vài giây</p>
                      </div>

                      {localStorage.getItem('lastPaymentUrl') && (
                        <div className="flex justify-center mb-6">
                          <img
                            src={localStorage.getItem('lastPaymentUrl') || ''}
                            alt="SePay QR Code"
                            className="w-64 h-64 object-contain border-4 border-slate-100 rounded-xl"
                          />
                        </div>
                      )}

                      <div className="bg-slate-50 p-4 rounded-xl text-sm space-y-2 border border-slate-100">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Số tiền:</span>
                          <span className="font-bold text-[#D70018] text-lg">{formatPrice(Number(localStorage.getItem('lastOrderAmount') || 0))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Nội dung:</span>
                          <span className="font-bold text-slate-900 bg-yellow-100 px-2 rounded">Thanh toan {orderId?.substring(0, 8).toUpperCase()}</span>
                        </div>
                      </div>

                      <div className="mt-6 text-center">
                        <div className="inline-flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-full text-sm animate-pulse">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Đang chờ thanh toán...
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.paymentMethod !== 'cod' && (
                    <div className="mt-4 p-3 bg-amber-100 rounded-xl">
                      <p className="text-xs text-amber-800 font-medium text-center">
                        Đơn hàng sẽ được xác nhận trong <span className="font-black">30 phút</span> sau khi chúng tôi nhận được tiền
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                    <button
                      onClick={() => navigate('/')}
                      className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      TIẾP TỤC MUA SẮM
                    </button>
                    <button
                      onClick={() => navigate('/profile?tab=orders')}
                      className="px-8 py-4 border-2 border-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Package className="w-5 h-5" />
                      XEM ĐƠN HÀNG
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar / Summary */}
          <div className="lg:col-span-4 lg:row-start-1 lg:col-start-9">
            <div className="sticky top-28 space-y-6">
              {/* Order Summary Card */}
              <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 p-6 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-black tracking-tighter uppercase">GIỎ HÀNG CỦA BẠN</h3>
                      <p className="text-white/50 text-[10px] font-bold tracking-widest">{items.length} SẢN PHẨM</p>
                    </div>
                    <ShoppingBag className="w-6 h-6 text-[#D70018]" />
                  </div>
                </div>

                <div className="p-6">
                  <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar mb-6 space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="group flex gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all">
                        <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100">
                          <img
                            src={item.imageUrl || `https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=200&h=200&fit=crop`}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs truncate leading-tight mb-1">{item.name}</h4>
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">SL: {item.quantity}</span>
                            <span className="font-black text-xs text-slate-900">{formatPrice(item.price)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-6 border-t-2 border-dashed border-slate-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest transition-all">Tạm tính</span>
                      <span className="font-bold text-slate-700">{formatPrice(subtotal)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#D70018] font-bold uppercase text-[10px] tracking-widest">Khuyến mãi</span>
                        <span className="font-bold text-[#D70018]">-{formatPrice(discountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Vận chuyển</span>
                      <span className="font-bold text-green-500 uppercase text-[10px]">Miễn phí</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Thuế (VAT)</span>
                      <span className="font-bold text-slate-700">{formatPrice(tax)}</span>
                    </div>

                    <div className="pt-4 border-t-2 border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-slate-900 tracking-tighter text-xl transition-all">TỔNG</span>
                        <div className="text-right">
                          <span className="block font-black text-2xl text-[#D70018] tracking-tighter leading-none">{formatPrice(total)}</span>
                          <span className="text-[9px] font-bold text-slate-400 italic">Đã bao gồm đầy đủ chi phí</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Badge Card */}
              <div className="bg-red-50/50 rounded-2xl p-6 border-2 border-red-100 flex items-center gap-4 group">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#D70018] group-hover:rotate-12 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm tracking-tight">Thanh toán an toàn</h4>
                  <p className="text-[10px] text-slate-500 leading-tight">Dữ liệu cá nhân của bạn được bảo mật tuyệt đối theo tiêu chuẩn SSL</p>
                </div>
              </div>
            </div>
          </div>
        </div >
      </div >

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div >
  );
}

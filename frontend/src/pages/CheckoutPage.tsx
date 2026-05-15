import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  ArrowLeft, ArrowRight, CreditCard, Truck, User, MapPin,
  Phone, Mail, Lock, Check, ChevronRight, ShieldCheck,
  Package, ShoppingBag, CreditCard as CardIcon, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';
import { salesApi } from '../api/sales';
import { paymentApi, initiateMoMoPayment } from '../api/payment';
import ShippingFeeCalculator from '../components/shipping-fee-calculator';
import AddressBookSelector from '../components/address-book-selector';
import CheckoutOrderSummary from '../components/checkout/checkout-order-summary';

interface CheckoutForm {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  ward: string;
  district: string;
  province: string;
  postalCode: string;
  paymentMethod: 'cod' | 'bank_transfer' | 'credit_card' | 'momo';
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  notes?: string;
  deliveryMethod: 'delivery' | 'pickup';
  pickupStoreId: string;
}

const inputClass = (error?: string) =>
  `w-full px-4 py-3 border ${error ? 'border-red-400 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all font-medium text-gray-900`;

const labelClass = 'block text-sm font-semibold text-gray-600 mb-1';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { items, subtotal, tax, total, discountAmount, shippingAmount, couponCode, clearCart } = useCart();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CheckoutForm>({
    fullName: '', email: '', phone: '',
    address: '', ward: '', district: '', province: '', postalCode: '',
    paymentMethod: 'cod', notes: '',
    deliveryMethod: 'delivery', pickupStoreId: 'headquarters',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});

  const [dbProvinces, setDbProvinces] = useState<any[]>([]);
  const [dbDistricts, setDbDistricts] = useState<any[]>([]);
  const [dbWards, setDbWards] = useState<any[]>([]);
  const [ghnDistrictId, setGhnDistrictId] = useState<number>(0);
  const [ghnWardCode, setGhnWardCode] = useState<string>('');
  const [calculatedShippingFee, setCalculatedShippingFee] = useState<number>(0);

  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/?depth=3')
      .then(res => res.json())
      .then(data => setDbProvinces(data))
      .catch(err => console.error('Failed to load provinces:', err));
  }, []);

  useEffect(() => {
    if (step === 3 && orderId) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  }, [step, orderId]);

  if (items.length === 0 && step !== 3) {
    navigate('/cart');
    return null;
  }

  const handleInputChange = (field: keyof CheckoutForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleProvinceChange = (provinceName: string) => {
    handleInputChange('province', provinceName);
    handleInputChange('district', '');
    handleInputChange('ward', '');
    const prov = dbProvinces.find(p => p.name === provinceName);
    setDbDistricts(prov ? prov.districts : []);
    setDbWards([]);
  };

  const handleDistrictChange = (districtName: string) => {
    handleInputChange('district', districtName);
    handleInputChange('ward', '');
    setGhnWardCode('');
    const dist = dbDistricts.find(d => d.name === districtName);
    setDbWards(dist ? dist.wards : []);
    setGhnDistrictId(dist?.code ? Number(dist.code) : 0);
  };

  const handleWardChange = (wardName: string) => {
    handleInputChange('ward', wardName);
    const ward = dbWards.find(w => w.name === wardName);
    setGhnWardCode(ward?.code ? String(ward.code) : '');
  };

  const validateForm = () => {
    const schema = z.object({
      fullName: z.string().min(1, msg.requireInput('Họ và tên')),
      phone: z.string().min(1, msg.requireInput('Số điện thoại')).regex(/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ'),
      email: formData.deliveryMethod === 'delivery'
        ? z.string().min(1, msg.requireInput('Email')).email('Email không hợp lệ')
        : z.string().optional(),
      address: step === 1 && formData.deliveryMethod === 'delivery' ? z.string().min(1, msg.requireInput('Địa chỉ chi tiết')) : z.string().optional(),
      ward: step === 1 && formData.deliveryMethod === 'delivery' ? z.string().min(1, 'Vui lòng chọn phường/xã') : z.string().optional(),
      district: step === 1 && formData.deliveryMethod === 'delivery' ? z.string().min(1, 'Vui lòng chọn quận/huyện') : z.string().optional(),
      province: step === 1 && formData.deliveryMethod === 'delivery' ? z.string().min(1, 'Vui lòng chọn tỉnh/thành') : z.string().optional(),
      cardNumber: step === 2 && formData.paymentMethod === 'credit_card' ? z.string().min(1, msg.requireInput('Số thẻ')) : z.string().optional(),
      cardExpiry: step === 2 && formData.paymentMethod === 'credit_card' ? z.string().min(1, msg.requireInput('Ngày hết hạn')) : z.string().optional(),
      cardCvv: step === 2 && formData.paymentMethod === 'credit_card' ? z.string().min(1, msg.requireInput('CVV')) : z.string().optional(),
    });
    const result = schema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CheckoutForm, string>> = {};
      result.error.issues.forEach(issue => {
        const path = issue.path[0] as keyof CheckoutForm;
        if (path) fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const nextStep = () => {
    if (validateForm()) { setStep(s => (s + 1) as 1 | 2 | 3); window.scrollTo(0, 0); }
  };
  const prevStep = () => { setStep(s => (s - 1) as 1 | 2 | 3); window.scrollTo(0, 0); };
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!validateForm()) return; await processOrder(); };

  const processOrder = async () => {
    setLoading(true);
    try {
      const shippingAddress = formData.deliveryMethod === 'pickup'
        ? 'Nhận tại cửa hàng'
        : `${formData.address}, ${formData.ward}, ${formData.district}, ${formData.province}`;

      let response;
      if (isAuthenticated && user) {
        response = await salesApi.orders.create({
          items: items.map(item => ({ productId: item.id, productName: item.name, unitPrice: item.price, quantity: item.quantity })),
          shippingAddress, notes: formData.notes, couponCode: couponCode || undefined,
          paymentMethod: formData.paymentMethod,
          isPickup: formData.deliveryMethod === 'pickup',
          pickupStoreId: formData.deliveryMethod === 'pickup' ? formData.pickupStoreId : undefined,
          pickupStoreName: formData.deliveryMethod === 'pickup' ? 'Quang Hưởng Computer - Trụ sở chính' : undefined,
          customerId: user.id,
          shippingFee: calculatedShippingFee > 0 ? calculatedShippingFee : 0,
        });
      } else {
        response = await salesApi.orders.guestCheckout({
          customerName: formData.fullName, customerEmail: formData.email, customerPhone: formData.phone,
          shippingAddress,
          items: items.map(item => ({ productId: item.id, productName: item.name, price: item.price, quantity: item.quantity })),
          couponCode: couponCode || undefined, notes: formData.notes, paymentMethod: formData.paymentMethod,
        });
      }

      if (response?.orderId) {
        setOrderId(response.orderId);
        if (formData.paymentMethod === 'cod') {
          setStep(3); clearCart(); toast.success('Đặt hàng thành công!');
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } else if (formData.paymentMethod === 'credit_card') {
          try {
            const paymentResponse = await paymentApi.initiate({ orderId: response.orderId, amount: response.totalAmount, provider: 0 });
            clearCart();
            if (paymentResponse.paymentUrl) { toast.success('Đang chuyển đến trang thanh toán...'); window.location.href = paymentResponse.paymentUrl; }
            else navigate(`/payment/${response.orderId}`);
          } catch { clearCart(); navigate(`/payment/${response.orderId}`, { state: { error: 'Không thể kết nối cổng thanh toán.' } }); }
        } else if (formData.paymentMethod === 'momo') {
          try {
            const momoResponse = await initiateMoMoPayment(response.orderId, response.totalAmount);
            clearCart();
            if (momoResponse.paymentUrl) { toast.success('Đang chuyển đến ví MoMo...'); window.location.href = momoResponse.paymentUrl; }
            else navigate(`/payment/${response.orderId}`, { state: { error: 'Không thể kết nối MoMo.' } });
          } catch { clearCart(); navigate(`/payment/${response.orderId}`, { state: { error: 'Lỗi khởi tạo thanh toán MoMo.' } }); }
        } else if (formData.paymentMethod === 'bank_transfer') {
          try {
            const paymentResponse = await paymentApi.initiate({ orderId: response.orderId, amount: response.totalAmount, provider: 4 });
            if (paymentResponse.paymentUrl) {
              localStorage.setItem('lastPaymentUrl', paymentResponse.paymentUrl);
              localStorage.setItem('lastOrderId', response.orderId);
              localStorage.setItem('lastOrderAmount', response.totalAmount.toString());
              setStep(3); clearCart(); toast.success('Đặt hàng thành công! Vui lòng quét mã QR để thanh toán.');
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            } else toast.error('Không thể tạo mã QR. Vui lòng thử lại.');
          } catch { toast.error('Lỗi khởi tạo thanh toán SePay'); }
        }
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.response?.data?.Error || error?.response?.data?.message || error?.message || 'Có lỗi xảy ra khi xử lý đơn hàng.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const steps = [
    { title: 'Thông tin', icon: User },
    { title: 'Thanh toán', icon: CreditCard },
    { title: 'Hoàn tất', icon: Check },
  ];

  const paymentMethods = [
    { id: 'cod', title: 'Thanh toán khi nhận hàng (COD)', desc: 'Sử dụng tiền mặt khi shipper giao tới', icon: Truck },
    { id: 'bank_transfer', title: 'Chuyển khoản ngân hàng (QR)', desc: 'Thanh toán tự động 24/7 với SePay', icon: CardIcon },
    { id: 'credit_card', title: 'VNPay (ATM/Visa/Master)', desc: 'Hỗ trợ Visa, Master, JCB, Napas', icon: Lock },
    { id: 'momo', title: 'Ví MoMo', desc: 'Thanh toán qua ứng dụng MoMo', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <button
              onClick={() => step > 1 ? prevStep() : navigate('/cart')}
              className="flex items-center gap-2 text-gray-500 hover:text-accent transition-colors mb-1 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              {step > 1 ? 'Quay lại bước trước' : 'Quay lại giỏ hàng'}
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Thanh toán <span className="text-accent">đơn hàng</span></h1>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-1 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
            {steps.map((s, idx) => (
              <div key={idx} className="flex items-center">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  step === idx + 1 ? 'bg-accent text-white' : step > idx + 1 ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border-2 ${step === idx + 1 ? 'border-white/40' : 'border-current'}`}>
                    {step > idx + 1 ? <Check className="w-3 h-3" /> : idx + 1}
                  </div>
                  <span className="hidden sm:block">{s.title}</span>
                </div>
                {idx < steps.length - 1 && <ChevronRight className="w-4 h-4 mx-0.5 text-gray-300" />}
              </div>
            ))}
          </div>
        </div>

        {/* 2-column layout: 60% form / 40% summary */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">

              {/* Step 1: Customer & Delivery Info */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 md:p-8"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-accent">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Thông tin vận chuyển</h2>
                      <p className="text-gray-500 text-xs">Vui lòng nhập chính xác để chúng tôi phục vụ tốt nhất</p>
                    </div>
                  </div>

                  {/* Guest notice */}
                  {!isAuthenticated && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                      <User className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-amber-700 text-sm">
                        Bạn đang thanh toán với tư cách khách.{' '}
                        <button onClick={() => navigate('/login', { state: { from: '/checkout' } })} className="font-bold underline hover:text-amber-900">
                          Đăng nhập
                        </button>{' '}để theo dõi đơn hàng và tích điểm.
                      </p>
                    </div>
                  )}

                  {/* Delivery Method Toggle */}
                  <div className="flex p-1 bg-gray-100 rounded-xl mb-6 gap-1">
                    {[
                      { value: 'delivery', label: 'Giao hàng tận nơi', icon: Truck },
                      { value: 'pickup', label: 'Nhận tại cửa hàng', icon: MapPin },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleInputChange('deliveryMethod', value)}
                        className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                          formData.deliveryMethod === value ? 'bg-white text-accent shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />{label}
                      </button>
                    ))}
                  </div>

                  <form className="space-y-5">
                    {formData.deliveryMethod === 'pickup' ? (
                      <>
                        <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                          <h4 className="font-bold text-gray-900 mb-1 flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-accent" />
                            Quang Hưởng Computer - Trụ sở chính
                          </h4>
                          <p className="text-sm text-gray-600">Số 179, Thôn 3/2, xã Vĩnh Bảo, Hải Phòng</p>
                          <div className="mt-3 flex items-center gap-3">
                            <span className="text-xs bg-white px-3 py-1 rounded-full font-semibold text-gray-500 border border-gray-100">Mở cửa: 07:00 - 17:15</span>
                            {(() => {
                              const h = new Date().getHours();
                              return h >= 8 && h < 21
                                ? <span className="text-xs bg-green-100 px-3 py-1 rounded-full font-semibold text-green-700">Đang mở cửa</span>
                                : <span className="text-xs bg-red-100 px-3 py-1 rounded-full font-semibold text-red-700">Đã đóng cửa</span>;
                            })()}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Họ và tên <span className="text-accent">*</span></label>
                            <input type="text" value={formData.fullName} onChange={e => handleInputChange('fullName', e.target.value)} placeholder="Nguyễn Văn A" className={inputClass(errors.fullName)} />
                            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                          </div>
                          <div>
                            <label className={labelClass}>Số điện thoại <span className="text-accent">*</span></label>
                            <input type="tel" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} placeholder="09xx xxx xxx" className={inputClass(errors.phone)} />
                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {isAuthenticated && (
                          <AddressBookSelector
                            onSelect={(addr) => {
                              if (addr.fullName) handleInputChange('fullName', addr.fullName);
                              if (addr.phone) handleInputChange('phone', addr.phone);
                              if (addr.streetAddress) handleInputChange('address', addr.streetAddress);
                              if (addr.ward) handleInputChange('ward', addr.ward);
                              if (addr.district) handleInputChange('district', addr.district);
                              if (addr.province) handleInputChange('province', addr.province);
                            }}
                          />
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Họ và tên <span className="text-accent">*</span></label>
                            <input type="text" value={formData.fullName} onChange={e => handleInputChange('fullName', e.target.value)} placeholder="Nguyễn Văn A" className={inputClass(errors.fullName)} />
                            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                          </div>
                          <div>
                            <label className={labelClass}>Số điện thoại <span className="text-accent">*</span></label>
                            <input type="tel" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} placeholder="09xx xxx xxx" className={inputClass(errors.phone)} />
                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                          </div>
                          <div className="col-span-2">
                            <label className={labelClass}>Email <span className="text-accent">*</span></label>
                            <input type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} placeholder="email@example.com" className={inputClass(errors.email)} />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                          </div>
                        </div>

                        <div className="border-t border-gray-100 pt-5">
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <label className={labelClass}>Tỉnh / Thành <span className="text-accent">*</span></label>
                              <SearchableSelect value={formData.province} onChange={handleProvinceChange} options={dbProvinces.map(p => ({ value: p.name, label: p.name }))} placeholder="Chọn tỉnh/thành" error={!!errors.province} searchPlaceholder="Tìm tỉnh/thành..." />
                            </div>
                            <div>
                              <label className={labelClass}>Quận / Huyện <span className="text-accent">*</span></label>
                              <SearchableSelect value={formData.district} onChange={handleDistrictChange} disabled={!formData.province || dbDistricts.length === 0} options={dbDistricts.map(d => ({ value: d.name, label: d.name }))} placeholder="Chọn quận/huyện" error={!!errors.district} searchPlaceholder="Tìm quận/huyện..." />
                            </div>
                            <div>
                              <label className={labelClass}>Phường / Xã <span className="text-accent">*</span></label>
                              <SearchableSelect value={formData.ward} onChange={handleWardChange} disabled={!formData.district || dbWards.length === 0} options={dbWards.map(w => ({ value: w.name, label: w.name }))} placeholder="Chọn phường/xã" error={!!errors.ward} searchPlaceholder="Tìm phường/xã..." />
                            </div>
                          </div>
                          <div>
                            <label className={labelClass}>Địa chỉ chi tiết <span className="text-accent">*</span></label>
                            <textarea value={formData.address} onChange={e => handleInputChange('address', e.target.value)} rows={2} placeholder="Số nhà, tên đường..."
                              className={`w-full px-4 py-3 border ${errors.address ? 'border-red-400 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none text-gray-900 font-medium transition-all`}
                            />
                            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                          </div>
                          {ghnDistrictId > 0 && ghnWardCode && (
                            <ShippingFeeCalculator districtId={ghnDistrictId} wardCode={ghnWardCode} onFeeCalculated={fee => setCalculatedShippingFee(fee)} />
                          )}
                        </div>
                      </>
                    )}

                    <button type="button" onClick={nextStep}
                      className="w-full py-3.5 bg-accent hover:bg-red-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                      Tiếp tục thanh toán <ArrowRight className="w-5 h-5" />
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Step 2: Payment Method */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 md:p-8"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-accent">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Phương thức thanh toán</h2>
                      <p className="text-gray-500 text-xs">Lựa chọn cách thanh toán tiện lợi nhất</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {paymentMethods.map(method => (
                      <label key={method.id}
                        className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          formData.paymentMethod === method.id ? 'border-accent bg-red-50/50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input type="radio" name="payment" checked={formData.paymentMethod === method.id} onChange={() => handleInputChange('paymentMethod', method.id as any)} className="hidden" />
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all mr-4 ${formData.paymentMethod === method.id ? 'bg-accent text-white' : 'bg-gray-100 text-gray-400'}`}>
                          <method.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${formData.paymentMethod === method.id ? 'text-gray-900' : 'text-gray-700'}`}>{method.title}</p>
                          <p className="text-xs text-gray-400">{method.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.paymentMethod === method.id ? 'border-accent' : 'border-gray-200'}`}>
                          {formData.paymentMethod === method.id && <div className="w-2.5 h-2.5 bg-accent rounded-full" />}
                        </div>
                      </label>
                    ))}
                  </div>

                  {formData.paymentMethod === 'credit_card' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="bg-gray-50 rounded-xl p-5 mb-6 space-y-4 border border-gray-200 overflow-hidden"
                    >
                      <div>
                        <label className={labelClass}>Số thẻ <span className="text-accent">*</span></label>
                        <input type="text" value={formData.cardNumber} onChange={e => handleInputChange('cardNumber', e.target.value)} placeholder="0000 0000 0000 0000" className={inputClass(errors.cardNumber)} />
                        {errors.cardNumber && <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Hạn dùng <span className="text-accent">*</span></label>
                          <input type="text" value={formData.cardExpiry} onChange={e => handleInputChange('cardExpiry', e.target.value)} placeholder="MM/YY" className={inputClass(errors.cardExpiry)} />
                          {errors.cardExpiry && <p className="text-red-500 text-xs mt-1">{errors.cardExpiry}</p>}
                        </div>
                        <div>
                          <label className={labelClass}>CVV <span className="text-accent">*</span></label>
                          <input type="password" value={formData.cardCvv} onChange={e => handleInputChange('cardCvv', e.target.value)} placeholder="***" className={inputClass(errors.cardCvv)} />
                          {errors.cardCvv && <p className="text-red-500 text-xs mt-1">{errors.cardCvv}</p>}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="flex gap-3">
                    <button type="button" onClick={prevStep} className="flex-1 py-3.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                      Quay lại
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={loading}
                      className={`flex-[2] py-3.5 bg-accent hover:bg-red-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-5 h-5" />Xác nhận đặt hàng</>}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Success */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 md:p-12 text-center"
                >
                  <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/30 mx-auto mb-6">
                    <Check className="w-10 h-10" strokeWidth={3} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Đặt hàng thành công!</h2>
                  <p className="text-gray-500 mb-6">
                    Cảm ơn bạn đã tin tưởng Quang Hưởng Computer.<br />
                    Mã đơn hàng: <span className="text-accent font-bold bg-red-50 px-2 py-0.5 rounded-lg ml-1">#{orderId}</span>
                  </p>

                  <div className="bg-gray-50 rounded-xl p-5 text-left max-w-sm mx-auto mb-6 space-y-3">
                    {formData.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Email xác nhận</p>
                          <p className="text-sm text-gray-700">Đã gửi tới {formData.email}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Liên hệ hỗ trợ</p>
                        <p className="text-sm text-gray-700">Bộ phận chăm sóc sẽ gọi xác nhận trong 15-30 phút</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CardIcon className="w-4 h-4 text-accent mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Thanh toán</p>
                        <p className="text-sm text-gray-700">
                          {formData.paymentMethod === 'cod' && `COD — ${formatPrice(total)}`}
                          {formData.paymentMethod === 'bank_transfer' && 'Chuyển khoản ngân hàng'}
                          {formData.paymentMethod === 'credit_card' && 'VNPay'}
                          {formData.paymentMethod === 'momo' && 'Ví MoMo'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SePay QR Code */}
                  {formData.paymentMethod === 'bank_transfer' && (
                    <div className="bg-white border-2 border-green-200 rounded-xl p-6 mb-6">
                      <h3 className="text-lg font-bold text-green-700 mb-1">Quét mã VietQR để thanh toán</h3>
                      <p className="text-sm text-gray-500 mb-4">Đơn hàng xác nhận tự động sau khi nhận tiền</p>
                      {localStorage.getItem('lastPaymentUrl') && (
                        <div className="flex justify-center mb-4">
                          <img src={localStorage.getItem('lastPaymentUrl') || ''} alt="QR Code" className="w-56 h-56 object-contain border-4 border-gray-100 rounded-xl" />
                        </div>
                      )}
                      <div className="bg-gray-50 p-4 rounded-xl text-sm space-y-2 border border-gray-100">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Số tiền:</span>
                          <span className="font-bold text-accent">{formatPrice(Number(localStorage.getItem('lastOrderAmount') || 0))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Nội dung:</span>
                          <span className="font-bold text-gray-900 bg-yellow-100 px-2 rounded">Thanh toan {orderId?.substring(0, 8).toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-center">
                        <span className="inline-flex items-center gap-2 text-green-600 font-semibold bg-green-50 px-4 py-2 rounded-full text-sm animate-pulse">
                          <Loader2 className="w-4 h-4 animate-spin" />Đang chờ thanh toán...
                        </span>
                      </div>
                    </div>
                  )}

                  {formData.paymentMethod !== 'cod' && (
                    <div className="p-3 bg-amber-50 rounded-xl mb-6">
                      <p className="text-xs text-amber-800 text-center">Đơn hàng xác nhận trong <strong>30 phút</strong> sau khi nhận được tiền</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button onClick={() => navigate('/')} className="px-6 py-3.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                      <ShoppingBag className="w-5 h-5" />Tiếp tục mua sắm
                    </button>
                    <button onClick={() => navigate('/profile?tab=orders')} className="px-6 py-3.5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                      <Package className="w-5 h-5" />Xem đơn hàng
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar: Order Summary (40%) */}
          <div className="lg:col-span-2">
            <CheckoutOrderSummary
              items={items}
              subtotal={subtotal}
              tax={tax}
              total={total}
              discountAmount={discountAmount}
              shippingAmount={shippingAmount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

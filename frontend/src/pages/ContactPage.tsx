import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, Loader2 } from 'lucide-react';
import SEO from '../components/SEO';
import { systemConfigApi, getConfigValue, type ConfigurationEntry } from '../api/systemConfig';
import { contentApi } from '../api/content';

interface ContactFormData {
    fullName: string;
    phone: string;
    email: string;
    subject: string;
    message: string;
}

interface FormErrors {
    fullName?: string;
    phone?: string;
    email?: string;
    subject?: string;
    message?: string;
}

export const ContactPage = () => {
    const [configs, setConfigs] = useState<ConfigurationEntry[]>([]);
    const [formData, setFormData] = useState<ContactFormData>({
        fullName: '',
        phone: '',
        email: '',
        subject: '',
        message: ''
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        const fetchConfigs = async () => {
            try {
                const data = await systemConfigApi.getConfigs();
                setConfigs(data || []);
            } catch (error) {
                console.error('Failed to load configs', error);
            }
        };
        fetchConfigs();
    }, []);

    const companyName = getConfigValue(configs, 'COMPANY_NAME', 'Quang Hưởng Computer', (v) => v);
    const address = getConfigValue(configs, 'COMPANY_ADDRESS', 'Số 91 Nguyễn Xiển, Thanh Xuân, Hà Nội', (v) => v);
    const phone = getConfigValue(configs, 'COMPANY_PHONE', '1800.6321', (v) => v);
    const email = getConfigValue(configs, 'COMPANY_EMAIL', 'contact@quanghuong.com', (v) => v);
    const workingHours = getConfigValue(configs, 'COMPANY_WORKING_HOURS', '8:00 - 21:00 (Tất cả các ngày trong tuần)', (v) => v);

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Vui lòng nhập họ tên';
        } else if (formData.fullName.trim().length < 2) {
            newErrors.fullName = 'Họ tên phải có ít nhất 2 ký tự';
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Vui lòng nhập số điện thoại';
        } else if (!/^(0|\+84)[0-9]{9,10}$/.test(formData.phone.replace(/\s/g, ''))) {
            newErrors.phone = 'Số điện thoại không hợp lệ';
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email không hợp lệ';
        }

        if (!formData.subject.trim()) {
            newErrors.subject = 'Vui lòng nhập tiêu đề';
        }

        if (!formData.message.trim()) {
            newErrors.message = 'Vui lòng nhập nội dung tin nhắn';
        } else if (formData.message.trim().length < 10) {
            newErrors.message = 'Nội dung phải có ít nhất 10 ký tự';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);

        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            await contentApi.submitContact({
                fullName: formData.fullName.trim(),
                phone: formData.phone.trim(),
                email: formData.email.trim() || undefined,
                subject: formData.subject.trim(),
                message: formData.message.trim()
            });

            setSubmitSuccess(true);
            setFormData({
                fullName: '',
                phone: '',
                email: '',
                subject: '',
                message: ''
            });
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            setSubmitError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitSuccess) {
        return (
            <div className="bg-gray-50 min-h-screen pb-10">
                <SEO title="Liên hệ" description={`Liên hệ với ${companyName}`} />
                <div className="bg-white py-3 border-b border-gray-200">
                    <div className="container mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                        <Link to="/" className="hover:text-[#D70018]">Trang chủ</Link>
                        <span>/</span>
                        <span className="text-gray-900 font-medium">Liên hệ</span>
                    </div>
                </div>

                <div className="container mx-auto px-4 mt-8">
                    <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 p-8 md:p-16 border border-gray-50 text-center max-w-2xl mx-auto">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 mb-4">Gửi liên hệ thành công!</h1>
                        <p className="text-gray-600 mb-8">
                            Cảm ơn bạn đã liên hệ với chúng tôi. Chúng tôi sẽ phản hồi trong thời gian sớm nhất có thể.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Link
                                to="/"
                                className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
                            >
                                Về trang chủ
                            </Link>
                            <button
                                onClick={() => setSubmitSuccess(false)}
                                className="px-6 py-3 bg-[#D70018] text-white font-bold rounded-xl hover:bg-[#b50014] transition"
                            >
                                Gửi liên hệ khác
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen pb-10">
            <SEO
                title="Liên hệ"
                description={`Liên hệ với ${companyName} - Hotline: ${phone}. Địa chỉ: ${address}. Hỗ trợ kỹ thuật và tư vấn mua hàng 24/7.`}
            />
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="container mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-[#D70018]">Trang chủ</Link>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">Liên hệ</span>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-8 font-sans">
                <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 p-8 md:p-16 border border-gray-50">
                    <h1 className="text-4xl font-black text-gray-900 mb-12 text-center uppercase italic tracking-tighter">Liên hệ với <span className="text-[#D70018]">Quang Hưởng</span></h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-10">
                            <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter border-l-4 border-[#D70018] pl-4">Thông tin hệ thống</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-5 group">
                                    <div className="bg-red-50 p-4 rounded-2xl text-[#D70018] group-hover:bg-[#D70018] group-hover:text-white transition-all shadow-sm"><MapPin /></div>
                                    <div>
                                        <b className="block text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1 italic">Trụ sở chính:</b>
                                        <p className="text-gray-900 font-bold">{address}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-5 group">
                                    <div className="bg-red-50 p-4 rounded-2xl text-[#D70018] group-hover:bg-[#D70018] group-hover:text-white transition-all shadow-sm"><Phone /></div>
                                    <div>
                                        <b className="block text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1 italic">Tổng đài hỗ trợ:</b>
                                        <p className="text-[#D70018] font-black text-2xl tracking-tighter">{phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-5 group">
                                    <div className="bg-red-50 p-4 rounded-2xl text-[#D70018] group-hover:bg-[#D70018] group-hover:text-white transition-all shadow-sm"><Mail /></div>
                                    <div>
                                        <b className="block text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1 italic">Email phản hồi:</b>
                                        <p className="text-gray-900 font-bold">{email}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-5 group">
                                    <div className="bg-red-50 p-4 rounded-2xl text-[#D70018] group-hover:bg-[#D70018] group-hover:text-white transition-all shadow-sm"><Clock /></div>
                                    <div>
                                        <b className="block text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1 italic">Thời gian phục vụ:</b>
                                        <p className="text-gray-900 font-bold">{workingHours}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="bg-gray-50/50 p-8 md:p-12 rounded-[32px] border border-gray-100 shadow-inner">
                            <h3 className="text-2xl font-black text-gray-900 mb-8 uppercase italic tracking-tighter">Gửi tin nhắn <span className="text-[#D70018]">tư vấn</span></h3>

                            {submitError && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                    {submitError}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Họ tên *</label>
                                        <input
                                            type="text"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleInputChange}
                                            className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all focus:ring-4 focus:ring-red-500/5 ${errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-[#D70018]'}`}
                                            placeholder="Nguyễn Văn A"
                                        />
                                        {errors.fullName && <p className="text-red-500 text-xs mt-1 px-1">{errors.fullName}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Điện thoại *</label>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all focus:ring-4 focus:ring-red-500/5 ${errors.phone ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-[#D70018]'}`}
                                            placeholder="09xxx..."
                                        />
                                        {errors.phone && <p className="text-red-500 text-xs mt-1 px-1">{errors.phone}</p>}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all focus:ring-4 focus:ring-red-500/5 ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-[#D70018]'}`}
                                        placeholder="email@example.com"
                                    />
                                    {errors.email && <p className="text-red-500 text-xs mt-1 px-1">{errors.email}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Tiêu đề *</label>
                                    <select
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all focus:ring-4 focus:ring-red-500/5 ${errors.subject ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-[#D70018]'}`}
                                    >
                                        <option value="">-- Chọn chủ đề --</option>
                                        <option value="Tư vấn mua hàng">Tư vấn mua hàng</option>
                                        <option value="Hỗ trợ kỹ thuật">Hỗ trợ kỹ thuật</option>
                                        <option value="Bảo hành sản phẩm">Bảo hành sản phẩm</option>
                                        <option value="Khiếu nại">Khiếu nại</option>
                                        <option value="Hợp tác kinh doanh">Hợp tác kinh doanh</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                    {errors.subject && <p className="text-red-500 text-xs mt-1 px-1">{errors.subject}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Nội dung *</label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-bold h-32 outline-none transition-all focus:ring-4 focus:ring-red-500/5 resize-none ${errors.message ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-[#D70018]'}`}
                                        placeholder="Nội dung cần tư vấn..."
                                    />
                                    {errors.message && <p className="text-red-500 text-xs mt-1 px-1">{errors.message}</p>}
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-[#D70018] hover:bg-[#b50014] text-white font-black py-5 rounded-xl transition-all uppercase shadow-xl shadow-red-500/20 active:scale-95 tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Đang gửi...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Gửi liên hệ ngay
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

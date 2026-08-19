import { useState, useEffect } from 'react';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, Loader2, ChevronRight } from 'lucide-react';
import SEO from '../components/SEO';
import { systemConfigApi, getConfigValue, type ConfigurationEntry } from '../api/systemConfig';
import { contentApi } from '../api/content';

interface ContactFormData { fullName: string; phone: string; email: string; subject: string; message: string; }
interface FormErrors { fullName?: string; phone?: string; email?: string; subject?: string; message?: string; }

export const ContactPage = () => {
    const [configs, setConfigs] = useState<ConfigurationEntry[]>([]);
    const [formData, setFormData] = useState<ContactFormData>({ fullName: '', phone: '', email: '', subject: '', message: '' });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        systemConfigApi.getConfigs().then(data => setConfigs(data || [])).catch(() => {});
    }, []);

    const companyName = getConfigValue(configs, 'COMPANY_NAME', 'Quang Hưởng Computer', (v) => v);
    const address = getConfigValue(configs, 'COMPANY_ADDRESS', 'Số 179 khu phố 3/2, Thị Trấn Vĩnh Bảo, Huyện Vĩnh Bảo, TP Hải Phòng', (v) => v);
    const phone = getConfigValue(configs, 'COMPANY_PHONE', '031 3823769', (v) => v);
    const phone2 = getConfigValue(configs, 'COMPANY_PHONE_2', '0904.235.090', (v) => v);
    const email = getConfigValue(configs, 'COMPANY_EMAIL', 'quanghuongvbhp@gmail.com', (v) => v);
    const workingHours = getConfigValue(configs, 'COMPANY_WORKING_HOURS', '7:00 - 17h15 (Từ thứ 2 đến thứ 7)', (v) => v);

    const validateForm = (): boolean => {
        const e: FormErrors = {};
        if (!formData.fullName.trim()) e.fullName = 'Vui lòng nhập họ tên';
        else if (formData.fullName.trim().length < 2) e.fullName = 'Họ tên phải có ít nhất 2 ký tự';
        if (!formData.phone.trim()) e.phone = 'Vui lòng nhập số điện thoại';
        else if (!/^(0|\+84)[0-9]{9,10}$/.test(formData.phone.replace(/\s/g, ''))) e.phone = 'Số điện thoại không hợp lệ';
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Email không hợp lệ';
        if (!formData.subject.trim()) e.subject = 'Vui lòng nhập tiêu đề';
        if (!formData.message.trim()) e.message = 'Vui lòng nhập nội dung tin nhắn';
        else if (formData.message.trim().length < 10) e.message = 'Nội dung phải có ít nhất 10 ký tự';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleInputChange = (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = ev.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof FormErrors]) setErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setSubmitError(null);
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            await contentApi.submitContact({ fullName: formData.fullName.trim(), phone: formData.phone.trim(), email: formData.email.trim() || undefined, subject: formData.subject.trim(), message: formData.message.trim() });
            setSubmitSuccess(true);
            setFormData({ fullName: '', phone: '', email: '', subject: '', message: '' });
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            setSubmitError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputCls = (hasError: boolean) => `w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent ${hasError ? 'border-red-400' : 'border-gray-200'}`;

    const infoItems = [
        { icon: MapPin, label: 'Địa chỉ', value: address },
        { icon: Phone, label: 'Hotline', value: `${phone2} - ${phone}`, accent: true },
        { icon: Mail, label: 'Email', value: email },
        { icon: Clock, label: 'Giờ làm việc', value: workingHours },
    ];

    if (submitSuccess) {
        return (
            <div className="bg-gray-50 min-h-screen pb-10">
                <SEO title="Liên hệ" description={`Liên hệ với ${companyName}`} />
                <div className="bg-white py-3 border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                        <Link to="/" className="hover:text-accent cursor-pointer">Trang chủ</Link>
                        <ChevronRight size={14} className="text-gray-400" />
                        <span className="text-gray-900 font-medium">Liên hệ</span>
                    </div>
                </div>
                <div className="max-w-lg mx-auto px-4 mt-12">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Gửi liên hệ thành công!</h1>
                        <p className="text-gray-500 text-sm mb-6">Chúng tôi sẽ phản hồi trong thời gian sớm nhất.</p>
                        <div className="flex gap-3 justify-center">
                            <Link to="/" className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition text-sm cursor-pointer">Về trang chủ</Link>
                            <button onClick={() => setSubmitSuccess(false)} className="px-5 py-2.5 bg-accent text-white font-bold rounded-xl hover:bg-accent-hover transition text-sm cursor-pointer">Gửi liên hệ khác</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen pb-16">
            <SEO title="Liên hệ" description={`Liên hệ với ${companyName} - Hotline: ${phone}. Địa chỉ: ${address}.`} />
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-accent cursor-pointer">Trang chủ</Link>
                    <ChevronRight size={14} className="text-gray-400" />
                    <span className="text-gray-900 font-medium">Liên hệ</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">Liên hệ với <span className="text-accent">Quang Hưởng</span></h1>

                <div className="grid md:grid-cols-5 gap-6">
                    {/* Contact Form - 3 cols */}
                    <div className="md:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-6 md:p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Gửi tin nhắn tư vấn</h2>
                        {submitError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{submitError}</div>}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ tên *</label>
                                    <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className={inputCls(!!errors.fullName)} placeholder="Nguyễn Văn A" />
                                    {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Điện thoại *</label>
                                    <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className={inputCls(!!errors.phone)} placeholder="09xxx..." />
                                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={inputCls(!!errors.email)} placeholder="email@example.com" />
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tiêu đề *</label>
                                <SearchableSelect name="subject" value={formData.subject} onChange={(val) => handleInputChange({ target: { name: 'subject', value: val } } as any)} error={!!errors.subject} placeholder="-- Chọn chủ đề --"
                                    options={[
                                        { value: 'Tư vấn mua hàng', label: 'Tư vấn mua hàng' },
                                        { value: 'Hỗ trợ kỹ thuật', label: 'Hỗ trợ kỹ thuật' },
                                        { value: 'Bảo hành sản phẩm', label: 'Bảo hành sản phẩm' },
                                        { value: 'Khiếu nại', label: 'Khiếu nại' },
                                        { value: 'Hợp tác kinh doanh', label: 'Hợp tác kinh doanh' },
                                        { value: 'Khác', label: 'Khác' },
                                    ]}
                                />
                                {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nội dung *</label>
                                <textarea name="message" value={formData.message} onChange={handleInputChange} className={`${inputCls(!!errors.message)} h-28 resize-none`} placeholder="Nội dung cần tư vấn..." />
                                {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
                            </div>
                            <button type="submit" disabled={isSubmitting}
                                className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer">
                                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...</> : <><Send className="w-4 h-4" /> Gửi liên hệ</>}
                            </button>
                        </form>
                    </div>

                    {/* Store Info - 2 cols */}
                    <div className="md:col-span-2 space-y-4">
                        {infoItems.map((item) => (
                            <div key={item.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
                                <div className="p-2.5 bg-red-50 rounded-lg flex-shrink-0">
                                    <item.icon className="text-accent" size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 font-medium mb-0.5">{item.label}</div>
                                    <div className={`font-bold ${item.accent ? 'text-accent text-lg' : 'text-gray-900 text-sm'}`}>{item.value}</div>
                                </div>
                            </div>
                        ))}
                        {/* Map placeholder */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-2 aspect-video flex items-center justify-center">
                            <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                                <MapPin size={20} className="mr-2" /> Google Maps
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

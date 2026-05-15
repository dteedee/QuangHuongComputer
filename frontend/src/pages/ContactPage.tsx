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

    const companyName = getConfigValue(configs, 'COMPANY_NAME', 'Quang Huong Computer', (v) => v);
    const address = getConfigValue(configs, 'COMPANY_ADDRESS', 'So 179, Thon 3/2, xa Vinh Bao, Hai Phong', (v) => v);
    const phone = getConfigValue(configs, 'COMPANY_PHONE', '0904.235.090', (v) => v);
    const email = getConfigValue(configs, 'COMPANY_EMAIL', 'quanghuongvbhp@gmail.com', (v) => v);
    const workingHours = getConfigValue(configs, 'COMPANY_WORKING_HOURS', '7:00 - 17h15 (Tu thu 2 den thu 7)', (v) => v);

    const validateForm = (): boolean => {
        const e: FormErrors = {};
        if (!formData.fullName.trim()) e.fullName = 'Vui long nhap ho ten';
        else if (formData.fullName.trim().length < 2) e.fullName = 'Ho ten phai co it nhat 2 ky tu';
        if (!formData.phone.trim()) e.phone = 'Vui long nhap so dien thoai';
        else if (!/^(0|\+84)[0-9]{9,10}$/.test(formData.phone.replace(/\s/g, ''))) e.phone = 'So dien thoai khong hop le';
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Email khong hop le';
        if (!formData.subject.trim()) e.subject = 'Vui long nhap tieu de';
        if (!formData.message.trim()) e.message = 'Vui long nhap noi dung tin nhan';
        else if (formData.message.trim().length < 10) e.message = 'Noi dung phai co it nhat 10 ky tu';
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
            setSubmitError(err.response?.data?.message || 'Co loi xay ra. Vui long thu lai sau.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputCls = (hasError: boolean) => `w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent ${hasError ? 'border-red-400' : 'border-gray-200'}`;

    const infoItems = [
        { icon: MapPin, label: 'Dia chi', value: address },
        { icon: Phone, label: 'Hotline', value: phone, accent: true },
        { icon: Mail, label: 'Email', value: email },
        { icon: Clock, label: 'Gio lam viec', value: workingHours },
    ];

    if (submitSuccess) {
        return (
            <div className="bg-gray-50 min-h-screen pb-10">
                <SEO title="Lien he" description={`Lien he voi ${companyName}`} />
                <div className="bg-white py-3 border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                        <Link to="/" className="hover:text-accent cursor-pointer">Trang chu</Link>
                        <ChevronRight size={14} className="text-gray-400" />
                        <span className="text-gray-900 font-medium">Lien he</span>
                    </div>
                </div>
                <div className="max-w-lg mx-auto px-4 mt-12">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Gui lien he thanh cong!</h1>
                        <p className="text-gray-500 text-sm mb-6">Chung toi se phan hoi trong thoi gian som nhat.</p>
                        <div className="flex gap-3 justify-center">
                            <Link to="/" className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition text-sm cursor-pointer">Ve trang chu</Link>
                            <button onClick={() => setSubmitSuccess(false)} className="px-5 py-2.5 bg-accent text-white font-bold rounded-xl hover:bg-accent-hover transition text-sm cursor-pointer">Gui lien he khac</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen pb-16">
            <SEO title="Lien he" description={`Lien he voi ${companyName} - Hotline: ${phone}. Dia chi: ${address}.`} />
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-accent cursor-pointer">Trang chu</Link>
                    <ChevronRight size={14} className="text-gray-400" />
                    <span className="text-gray-900 font-medium">Lien he</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">Lien he voi <span className="text-accent">Quang Huong</span></h1>

                <div className="grid md:grid-cols-5 gap-6">
                    {/* Contact Form - 3 cols */}
                    <div className="md:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-6 md:p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Gui tin nhan tu van</h2>
                        {submitError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{submitError}</div>}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Ho ten *</label>
                                    <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className={inputCls(!!errors.fullName)} placeholder="Nguyen Van A" />
                                    {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Dien thoai *</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tieu de *</label>
                                <SearchableSelect name="subject" value={formData.subject} onChange={(val) => handleInputChange({ target: { name: 'subject', value: val } } as any)} error={!!errors.subject} placeholder="-- Chon chu de --"
                                    options={[
                                        { value: 'Tu van mua hang', label: 'Tu van mua hang' },
                                        { value: 'Ho tro ky thuat', label: 'Ho tro ky thuat' },
                                        { value: 'Bao hanh san pham', label: 'Bao hanh san pham' },
                                        { value: 'Khieu nai', label: 'Khieu nai' },
                                        { value: 'Hop tac kinh doanh', label: 'Hop tac kinh doanh' },
                                        { value: 'Khac', label: 'Khac' },
                                    ]}
                                />
                                {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Noi dung *</label>
                                <textarea name="message" value={formData.message} onChange={handleInputChange} className={`${inputCls(!!errors.message)} h-28 resize-none`} placeholder="Noi dung can tu van..." />
                                {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
                            </div>
                            <button type="submit" disabled={isSubmitting}
                                className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer">
                                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Dang gui...</> : <><Send className="w-4 h-4" /> Gui lien he</>}
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

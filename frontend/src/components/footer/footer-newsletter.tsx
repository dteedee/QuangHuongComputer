import { Send } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import client from '../../api/client';

interface FooterNewsletterProps {
    brand1: string;
    brand2: string;
}

export const FooterNewsletter = ({ brand1, brand2 }: FooterNewsletterProps) => {
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) { toast.error('Vui long nhap email'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Email khong hop le'); return; }
        setSending(true);
        try {
            const res = await client.post('/communication/newsletter/subscribe', { email });
            if (res.data.success) { toast.success(res.data.message || 'Dang ky thanh cong!'); setEmail(''); }
            else if (res.data.alreadySubscribed) { toast.error('Email nay da duoc dang ky'); }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Co loi xay ra. Vui long thu lai.');
        } finally { setSending(false); }
    };

    return (
        <div className="border-b border-gray-800">
            <div className="max-w-[1400px] mx-auto px-4 py-8 flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="text-center lg:text-left">
                    <h3 className="text-lg font-bold text-white">Dang ky nhan tin khuyen mai</h3>
                    <p className="text-gray-500 text-sm mt-1">Nhan deal hot va ma giam gia tu {brand1} {brand2}.</p>
                </div>
                <form onSubmit={handleSubmit} className="flex w-full lg:w-auto max-w-md">
                    <input
                        type="email"
                        placeholder="Nhap email cua ban..."
                        className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-l-lg text-white text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-gray-500"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <button type="submit" disabled={sending} className="bg-accent hover:bg-accent-hover text-white font-semibold px-5 py-2.5 rounded-r-lg text-sm transition-colors cursor-pointer flex items-center gap-1.5">
                        <Send size={14} /> {sending ? '...' : 'Gui'}
                    </button>
                </form>
            </div>
        </div>
    );
};

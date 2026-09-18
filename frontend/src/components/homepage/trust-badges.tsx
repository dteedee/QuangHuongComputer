import { Truck, Shield, HeadphonesIcon, BadgeCheck } from 'lucide-react';
import { useCompanyInfo } from '../../hooks/use-company-info';
import { Reveal } from '../motion';

/* D09: no hardcoded phone number or opening hours anywhere — the old
 * "Hotline: 0904.235.090" here disagreed with the Footer and the contact page.
 * Everything comes from `useCompanyInfo()` (backed by /api/config/public). */

/**
 * 4 trust/confidence badges for the homepage.
 * Displays warranty, shipping, authenticity, and price guarantees.
 */
export const TrustBadges = () => {
    const { companyInfo } = useCompanyInfo();
    const BADGES = [
        { icon: BadgeCheck, title: 'Chính hãng 100%', desc: 'Cam kết hàng chính hãng', color: 'text-accent bg-red-50' },
        { icon: Shield, title: 'Bảo hành an tâm', desc: 'Bảo hành dài hạn uy tín', color: 'text-emerald-600 bg-emerald-50' },
        { icon: Truck, title: 'Giao hàng nhanh', desc: 'Giao nhanh nội thành, chuyển phát toàn quốc', color: 'text-blue-600 bg-blue-50' },
        { icon: HeadphonesIcon, title: 'Hỗ trợ tận tâm', desc: `Hotline: ${companyInfo.hotline}`, color: 'text-amber-600 bg-amber-50' },
    ];

    return (
    <div className="max-w-[1400px] mx-auto px-4 mt-14">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {BADGES.map((item, i) => {
                    const Icon = item.icon;
                    return (
                        <Reveal
                            key={i}
                            index={i}
                            className="flex items-center gap-4 group"
                        >
                            <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                                <Icon size={22} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm mb-0.5">
                                    {item.title}
                                </h4>
                                <p className="text-sm text-gray-500">{item.desc}</p>
                            </div>
                        </Reveal>
                    );
                })}
            </div>
        </div>
    </div>
    );
};

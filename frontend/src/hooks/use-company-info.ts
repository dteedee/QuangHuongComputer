import { useEffect, useState } from 'react';
import { systemConfigApi, getConfigValue, configParsers, type ConfigurationEntry } from '../api/systemConfig';

export interface CompanyInfo {
    name: string;
    nameEn: string;
    shortName: string;
    taxCode: string;
    address: string;
    taxAddress: string;
    representative: string;
    phone: string;
    phone2: string;
    email: string;
    hotline: string;
    website: string;
    workingHours: string;
    brandText1: string;
    brandText2: string;
    since: string;
    bankAccount: string;
}

// Fallback = giá trị thật của công ty (dùng khi API chưa trả về / lỗi mạng).
// Nguồn: docs/hacom-design-reference.md §"Company info" (masothue.com/0200807633).
const FALLBACK_COMPANY_INFO: CompanyInfo = {
    name: 'Công ty TNHH Máy Tính Quang Hưởng',
    nameEn: 'Quang Huong Computer Limited Company',
    shortName: 'Quang Huong Computer Co., Ltd.',
    taxCode: '0200807633',
    address: 'Số 179 khu phố 3/2, Thị Trấn Vĩnh Bảo, Huyện Vĩnh Bảo, TP Hải Phòng',
    taxAddress: 'Số 179 Khu phố 13/2 - TT Vĩnh Bảo, Xã Vĩnh Bảo, TP Hải Phòng',
    representative: 'Dương Thị Hạnh',
    phone: '031 3823769',
    phone2: '0904.235.090',
    email: 'quanghuongvbhp@gmail.com',
    hotline: '0904.235.090',
    website: 'https://quanghuong.com',
    workingHours: '8:00 - 21:00 (T2 - CN)',
    brandText1: 'QUANG HƯỞNG',
    brandText2: 'COMPUTER',
    since: '2008',
    bankAccount: '1234567890 - Vietcombank',
};

function mapConfigsToCompanyInfo(configs: ConfigurationEntry[]): CompanyInfo {
    const get = (key: string, fallback: string) =>
        getConfigValue(configs, key, fallback, configParsers.string);

    return {
        name: get('COMPANY_NAME', FALLBACK_COMPANY_INFO.name),
        nameEn: get('COMPANY_NAME_EN', FALLBACK_COMPANY_INFO.nameEn),
        shortName: get('COMPANY_SHORT_NAME', FALLBACK_COMPANY_INFO.shortName),
        taxCode: get('COMPANY_TAX_CODE', FALLBACK_COMPANY_INFO.taxCode),
        address: get('COMPANY_ADDRESS', FALLBACK_COMPANY_INFO.address),
        taxAddress: get('COMPANY_TAX_ADDRESS', FALLBACK_COMPANY_INFO.taxAddress),
        representative: get('COMPANY_REPRESENTATIVE', FALLBACK_COMPANY_INFO.representative),
        phone: get('COMPANY_PHONE', FALLBACK_COMPANY_INFO.phone),
        phone2: get('COMPANY_PHONE_2', FALLBACK_COMPANY_INFO.phone2),
        email: get('COMPANY_EMAIL', FALLBACK_COMPANY_INFO.email),
        hotline: get('COMPANY_HOTLINE', FALLBACK_COMPANY_INFO.hotline),
        website: get('COMPANY_WEBSITE', FALLBACK_COMPANY_INFO.website),
        workingHours: get('COMPANY_WORKING_HOURS', FALLBACK_COMPANY_INFO.workingHours),
        brandText1: get('COMPANY_BRAND_TEXT_1', FALLBACK_COMPANY_INFO.brandText1),
        brandText2: get('COMPANY_BRAND_TEXT_2', FALLBACK_COMPANY_INFO.brandText2),
        since: get('COMPANY_SINCE', FALLBACK_COMPANY_INFO.since),
        bankAccount: get('COMPANY_BANK_ACCOUNT', FALLBACK_COMPANY_INFO.bankAccount),
    };
}

// Cache module-level: tránh mỗi component gọi lại API public config riêng.
let cachedInfo: CompanyInfo | null = null;
let inFlightRequest: Promise<CompanyInfo> | null = null;

async function loadCompanyInfo(): Promise<CompanyInfo> {
    if (cachedInfo) return cachedInfo;
    if (!inFlightRequest) {
        inFlightRequest = systemConfigApi.config
            .getPublic()
            .then((configs) => {
                cachedInfo = mapConfigsToCompanyInfo(configs);
                return cachedInfo;
            })
            .catch(() => FALLBACK_COMPANY_INFO)
            .finally(() => {
                inFlightRequest = null;
            });
    }
    return inFlightRequest;
}

/**
 * Hook duy nhất cho thông tin công ty (tên, địa chỉ, MST, liên hệ...).
 * Đọc từ `GET /api/config/public`, cache ở module-level, fallback = dữ liệu thật đã xác minh.
 */
export function useCompanyInfo(): { companyInfo: CompanyInfo; isLoading: boolean } {
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(cachedInfo ?? FALLBACK_COMPANY_INFO);
    const [isLoading, setIsLoading] = useState(!cachedInfo);

    useEffect(() => {
        if (cachedInfo) return;
        let cancelled = false;
        setIsLoading(true);
        loadCompanyInfo().then((info) => {
            if (!cancelled) {
                setCompanyInfo(info);
                setIsLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return { companyInfo, isLoading };
}

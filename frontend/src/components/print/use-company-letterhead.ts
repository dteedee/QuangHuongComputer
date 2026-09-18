import { useQuery } from '@tanstack/react-query';
import { systemConfigApi } from '../../api/systemConfig';

export interface CompanyLetterhead {
    name: string;
    address: string;
    taxCode: string;
    phone: string;
    hotline: string;
    email: string;
}

/**
 * Sender block for the A5 delivery note / A6 deposit receipt — pulled from the `Company`
 * config category, never hardcoded (Success Criteria). Uses `/config/public` (allow-listed,
 * `AllowAnonymous`) rather than `/config` — the admin endpoint needs `System.ViewConfig`, which
 * a warehouse or sales cashier printing these documents does not hold.
 */
export function useCompanyLetterhead() {
    return useQuery({
        queryKey: ['bulk-tools', 'company-letterhead'],
        queryFn: async (): Promise<CompanyLetterhead> => {
            const entries = await systemConfigApi.config.getPublic();
            const get = (key: string) => entries.find((e) => e.key === key)?.value ?? '';
            return {
                name: get('COMPANY_NAME') || get('COMPANY_SHORT_NAME'),
                address: get('COMPANY_TAX_ADDRESS') || get('COMPANY_ADDRESS'),
                taxCode: get('COMPANY_TAX_CODE'),
                phone: get('COMPANY_PHONE'),
                hotline: get('COMPANY_HOTLINE') || get('COMPANY_PHONE_2'),
                email: get('COMPANY_EMAIL'),
            };
        },
        staleTime: 5 * 60 * 1000,
    });
}

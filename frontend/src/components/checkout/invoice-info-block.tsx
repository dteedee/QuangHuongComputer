import type { Control, UseFormWatch } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { FileText } from 'lucide-react';
import { Checkbox, RadioGroup, Radio } from '../ui';
import { TextField } from '../form';
import type { ReviewSchemaValues } from './checkout-schemas';

interface InvoiceInfoBlockProps {
    control: Control<ReviewSchemaValues>;
    watch: UseFormWatch<ReviewSchemaValues>;
}

/**
 * D07 — "Thông tin hóa đơn" ở bước xác nhận.
 *
 * Mặc định: hóa đơn điện tử được phát hành tự động khi giao hàng và gửi vào email của khách.
 * Hóa đơn xuất cho **cá nhân KHÔNG dùng để hạch toán chi phí được**, nên khách mua cho công ty
 * phải khai thông tin đơn vị TRƯỚC khi hóa đơn được lập. Bỏ sót vẫn còn cửa: trang đơn hàng và
 * email xác nhận có mục "Bổ sung thông tin xuất hóa đơn công ty" cho tới khi hóa đơn được phát hành.
 */
export function InvoiceInfoBlock({ control, watch }: InvoiceInfoBlockProps) {
    const requested = watch('requested');
    const buyerType = watch('buyerType');

    return (
        <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
            <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-fg-muted" aria-hidden />
                <h3 className="text-sm font-semibold text-fg">Thông tin hóa đơn</h3>
            </div>

            <p className="text-13 text-fg-muted">
                Hóa đơn điện tử sẽ được phát hành và gửi vào email của bạn sau khi đơn hàng giao thành công.
            </p>

            <Controller
                name="requested"
                control={control}
                render={({ field }) => (
                    <Checkbox
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        label={<span>
                            Xuất hóa đơn cho công ty/đơn vị
                            <span className="block text-2xs font-normal text-fg-subtle">
                                Hóa đơn ghi tên cá nhân không dùng để hạch toán chi phí cho doanh nghiệp.
                            </span>
                        </span>}
                    />
                )}
            />

            {requested && (
                <div className="space-y-4 border-t border-line pt-4">
                    <Controller
                        name="buyerType"
                        control={control}
                        render={({ field }) => (
                            <RadioGroup legend="Loại đơn vị">
                                <Radio name={field.name} value="Company" checked={field.value === 'Company'}
                                    onChange={() => field.onChange('Company')} label="Doanh nghiệp (có mã số thuế)" />
                                <Radio name={field.name} value="BudgetUnit" checked={field.value === 'BudgetUnit'}
                                    onChange={() => field.onChange('BudgetUnit')} label="Đơn vị dùng ngân sách nhà nước" />
                            </RadioGroup>
                        )}
                    />

                    <TextField name="legalName" control={control} required
                        label="Tên đơn vị theo đăng ký kinh doanh" placeholder="Công ty TNHH …" />

                    {buyerType === 'BudgetUnit' ? (
                        <TextField name="budgetUnitCode" control={control} required
                            label="Mã quan hệ ngân sách" placeholder="VD: 1234567" />
                    ) : (
                        <TextField name="taxCode" control={control} required
                            label="Mã số thuế" placeholder="0123456789 hoặc 0123456789-001" inputMode="numeric" />
                    )}

                    <TextField name="address" control={control} required
                        label="Địa chỉ trên đăng ký kinh doanh" />

                    <TextField name="email" control={control} required type="email"
                        label="Email nhận hóa đơn"
                        hint="Có thể khác email nhận thông báo đơn hàng." />
                </div>
            )}
        </section>
    );
}

export default InvoiceInfoBlock;

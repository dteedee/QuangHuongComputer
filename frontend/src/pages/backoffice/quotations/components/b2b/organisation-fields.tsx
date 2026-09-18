/**
 * Buyer block — D07's field set (legal name, tax code OR budget-unit code,
 * address, email, contact person) for a quotation's buyer. Rendered inside
 * the quotation editor's `<Form>`, reading/writing its RHF `control`.
 */
import type { Control } from 'react-hook-form';
import { TextField, SelectField } from '../../../../../components/form';
import type { BuyerType } from '../../../../../api/sales/quotations';

export interface OrganisationFieldsValues {
  buyerType: BuyerType;
  buyerLegalName: string;
  buyerTaxCode?: string | null;
  buyerBudgetUnitCode?: string | null;
  buyerAddress?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
}

const BUYER_TYPE_OPTIONS = [
  { value: 'Individual', label: 'Cá nhân' },
  { value: 'Organization', label: 'Doanh nghiệp' },
  { value: 'BudgetUnit', label: 'Đơn vị ngân sách nhà nước (trường/UBND...)' },
];

export function OrganisationFields<T extends OrganisationFieldsValues>({
  control,
  buyerType,
}: {
  control: Control<T>;
  buyerType: BuyerType;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SelectField name={'buyerType' as never} control={control} label="Loại người mua" options={BUYER_TYPE_OPTIONS} required />
      <TextField name={'buyerLegalName' as never} control={control} label="Tên pháp lý người mua" required />

      {buyerType === 'BudgetUnit' ? (
        <TextField name={'buyerBudgetUnitCode' as never} control={control} label="Mã đơn vị quan hệ ngân sách (ĐVQHNS)" />
      ) : (
        <TextField name={'buyerTaxCode' as never} control={control} label="Mã số thuế" />
      )}

      <TextField name={'buyerAddress' as never} control={control} label="Địa chỉ" />
      <TextField name={'customerName' as never} control={control} label="Người liên hệ" required />
      <TextField name={'customerPhone' as never} control={control} label="Số điện thoại liên hệ" />
      <TextField name={'customerEmail' as never} control={control} label="Email" />
    </div>
  );
}

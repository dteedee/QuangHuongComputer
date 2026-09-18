/**
 * Hộp thoại thêm / sửa khoản chi. Dùng chung một instance cho cả hai việc
 * (form kit §4: mở lại dialog tự `reset` theo `defaultValues`).
 * Sửa chỉ mở khi phiếu còn Draft/Pending — máy chủ không có DELETE (IR #31).
 */
import { CrudFormDialog, MoneyField, NumberField, SelectField, TextField } from '../../../components/form';
import { notify, type SelectOption } from '../../../components/ui';
import { expensesApi, type Expense } from '../../../api/accounting';
import { expenseSchema, type ExpenseFormData } from '../../../schemas/expense';

export interface ExpenseFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: Expense | null;
    categoryOptions: SelectOption[];
    onSaved: () => void;
}

export const ExpenseFormDialog = ({ open, onOpenChange, editing, categoryOptions, onSaved }: ExpenseFormDialogProps) => (
    <CrudFormDialog<ExpenseFormData>
        open={open}
        onOpenChange={onOpenChange}
        title={editing ? `Sửa khoản chi ${editing.expenseNumber}` : 'Thêm khoản chi'}
        schema={expenseSchema}
        defaultValues={
            editing
                ? {
                      categoryId: editing.categoryId, description: editing.description,
                      amount: editing.amount, vatRate: editing.vatRate,
                      expenseDate: editing.expenseDate.slice(0, 10),
                      notes: editing.notes ?? '', receiptUrl: editing.receiptUrl ?? '',
                  }
                : { categoryId: '', description: '', amount: 0, vatRate: 10, expenseDate: new Date().toISOString().slice(0, 10) }
        }
        submitLabel={editing ? 'Lưu thay đổi' : 'Tạo khoản chi'}
        knownFields={['categoryId', 'description', 'amount', 'vatRate', 'expenseDate', 'notes', 'receiptUrl']}
        onSubmit={async (data) => {
            const payload = {
                categoryId: data.categoryId, description: data.description, amount: data.amount,
                vatRate: data.vatRate, expenseDate: data.expenseDate,
                notes: data.notes || undefined, receiptUrl: data.receiptUrl || undefined,
            };
            if (editing) {
                await expensesApi.update(editing.id, payload);
                notify.success('Đã cập nhật khoản chi');
            } else {
                await expensesApi.create(payload);
                notify.success('Đã tạo khoản chi');
            }
            onSaved();
        }}
    >
        {(form) => (
            <>
                <SelectField name="categoryId" control={form.control} label="Nhóm chi phí" options={categoryOptions} required />
                <TextField name="description" control={form.control} label="Diễn giải" required />
                <MoneyField name="amount" control={form.control} label="Số tiền chưa thuế" />
                <NumberField name="vatRate" control={form.control} label="Thuế suất GTGT (%)" />
                <TextField name="expenseDate" control={form.control} label="Ngày chi" type="date" required />
                <TextField name="notes" control={form.control} label="Ghi chú" />
            </>
        )}
    </CrudFormDialog>
);

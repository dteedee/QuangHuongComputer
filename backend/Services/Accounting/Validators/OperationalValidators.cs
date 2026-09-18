using Accounting.DTOs;
using BuildingBlocks.Validation;
using FluentValidation;

namespace Accounting.Validators;

// ===== Ca thu ngân =====

public class OpenShiftRequestValidator : AbstractValidator<OpenShiftRequest>
{
    public OpenShiftRequestValidator()
    {
        RuleFor(x => x.WarehouseId)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Cửa hàng/kho"));

        RuleFor(x => x.OpeningBalance)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số dư đầu ca", 0));
    }
}

public class CloseShiftRequestValidator : AbstractValidator<CloseShiftRequest>
{
    public CloseShiftRequestValidator()
    {
        RuleFor(x => x.ActualCash)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Tiền mặt đếm được", 0));

        RuleFor(x => x.VarianceReason)
            .MaximumLength(500).WithMessage(VietnameseValidationMessages.StringTooLong("Lý do chênh lệch", 500));
    }
}

public class RecordShiftTransactionRequestValidator : AbstractValidator<RecordShiftTransactionRequest>
{
    public RecordShiftTransactionRequestValidator()
    {
        RuleFor(x => x.Description)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Nội dung giao dịch"))
            .MaximumLength(500).WithMessage(VietnameseValidationMessages.StringTooLong("Nội dung giao dịch", 500));

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số tiền", 1));
    }
}

// ===== Sổ quỹ =====

public class CreateCashVoucherRequestValidator : AbstractValidator<CreateCashVoucherRequest>
{
    public CreateCashVoucherRequestValidator()
    {
        RuleFor(x => x.FundCode)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Mã quỹ"))
            .MaximumLength(50).WithMessage(VietnameseValidationMessages.StringTooLong("Mã quỹ", 50));

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số tiền", 1));

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Nội dung phiếu"))
            .MaximumLength(500).WithMessage(VietnameseValidationMessages.StringTooLong("Nội dung phiếu", 500));
    }
}

// ===== Giấy báo có =====

public class CreateCreditNoteRequestValidator : AbstractValidator<CreateCreditNoteRequest>
{
    public CreateCreditNoteRequestValidator()
    {
        RuleFor(x => x.OriginalInvoiceId)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Hoá đơn gốc"));

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số tiền điều chỉnh", 1));

        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Lý do"))
            .MaximumLength(1000).WithMessage(VietnameseValidationMessages.StringTooLong("Lý do", 1000));
    }
}

public class CancelCreditNoteRequestValidator : AbstractValidator<CancelCreditNoteRequest>
{
    public CancelCreditNoteRequestValidator()
    {
        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Lý do huỷ"))
            .MaximumLength(500).WithMessage(VietnameseValidationMessages.StringTooLong("Lý do huỷ", 500));
    }
}

// ===== Chi phí =====

public class CreateExpenseRequestValidator : AbstractValidator<CreateExpenseRequest>
{
    public CreateExpenseRequestValidator()
    {
        RuleFor(x => x.CategoryId)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Danh mục chi phí"));

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Nội dung chi"))
            .MaximumLength(500).WithMessage(VietnameseValidationMessages.StringTooLong("Nội dung chi", 500));

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số tiền", 1));

        RuleFor(x => x.VatRate)
            .InclusiveBetween(0, 100).WithMessage(VietnameseValidationMessages.NumberOutOfRange("Thuế suất", 0, 100));
    }
}

public class UpdateExpenseRequestValidator : AbstractValidator<UpdateExpenseRequest>
{
    public UpdateExpenseRequestValidator()
    {
        RuleFor(x => x.CategoryId)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Danh mục chi phí"));

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Nội dung chi"));

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số tiền", 1));

        RuleFor(x => x.VatRate)
            .InclusiveBetween(0, 100).WithMessage(VietnameseValidationMessages.NumberOutOfRange("Thuế suất", 0, 100));
    }
}

public class RejectExpenseRequestValidator : AbstractValidator<RejectExpenseRequest>
{
    public RejectExpenseRequestValidator()
    {
        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Lý do từ chối"))
            .MaximumLength(500).WithMessage(VietnameseValidationMessages.StringTooLong("Lý do từ chối", 500));
    }
}

public class PayExpenseRequestValidator : AbstractValidator<PayExpenseRequest>
{
    public PayExpenseRequestValidator()
    {
        RuleFor(x => x.PaymentMethod)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Phương thức thanh toán"));
    }
}

public class CreateExpenseCategoryRequestValidator : AbstractValidator<CreateExpenseCategoryRequest>
{
    public CreateExpenseCategoryRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên danh mục"))
            .MaximumLength(100).WithMessage(VietnameseValidationMessages.StringTooLong("Tên danh mục", 100));

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Mã danh mục"))
            .MaximumLength(50).WithMessage(VietnameseValidationMessages.StringTooLong("Mã danh mục", 50));
    }
}

public class UpdateExpenseCategoryRequestValidator : AbstractValidator<UpdateExpenseCategoryRequest>
{
    public UpdateExpenseCategoryRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên danh mục"))
            .MaximumLength(100).WithMessage(VietnameseValidationMessages.StringTooLong("Tên danh mục", 100));
    }
}

using Accounting.DTOs;
using Accounting.Endpoints;
using BuildingBlocks.Validation;
using FluentValidation;

namespace Accounting.Validators;

/// <summary>Hoá đơn bán ra lập tay: ít nhất một dòng, số lượng dương, đơn giá không âm.</summary>
public class CreateManualInvoiceRequestValidator : AbstractValidator<CreateManualInvoiceRequest>
{
    public CreateManualInvoiceRequestValidator()
    {
        RuleFor(x => x.Lines)
            .NotEmpty().WithMessage(VietnameseValidationMessages.CollectionEmpty("Danh sách dòng hàng"));

        RuleForEach(x => x.Lines).SetValidator(new ManualInvoiceLineRequestValidator());
    }
}

public class UpdateManualInvoiceRequestValidator : AbstractValidator<UpdateManualInvoiceRequest>
{
    public UpdateManualInvoiceRequestValidator()
    {
        RuleFor(x => x.Lines)
            .NotEmpty().WithMessage(VietnameseValidationMessages.CollectionEmpty("Danh sách dòng hàng"));

        RuleForEach(x => x.Lines).SetValidator(new ManualInvoiceLineRequestValidator());
    }
}

public class ManualInvoiceLineRequestValidator : AbstractValidator<ManualInvoiceLineRequest>
{
    public ManualInvoiceLineRequestValidator()
    {
        RuleFor(x => x.Description)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên hàng hoá/dịch vụ"))
            .MaximumLength(500).WithMessage(VietnameseValidationMessages.StringTooLong("Tên hàng hoá/dịch vụ", 500));

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số lượng", 1));

        // Đơn giá 0 là hợp lệ: hàng khuyến mại vẫn phải xuất hiện trên hoá đơn.
        RuleFor(x => x.UnitPriceIncludingVat)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Đơn giá", 0));

        RuleFor(x => x.Discount)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Giảm giá", 0));

        RuleFor(x => x.VatStatutoryRate!.Value)
            .InclusiveBetween(0, 100)
            .WithMessage(VietnameseValidationMessages.NumberOutOfRange("Thuế suất", 0, 100))
            .When(x => x.VatStatutoryRate.HasValue);
    }
}

public class CancelInvoiceRequestValidator : AbstractValidator<CancelInvoiceRequest>
{
    public CancelInvoiceRequestValidator()
    {
        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Lý do huỷ"))
            .MaximumLength(500).WithMessage(VietnameseValidationMessages.StringTooLong("Lý do huỷ", 500));
    }
}

public class CreateAccountDtoValidator : AbstractValidator<CreateAccountDto>
{
    public CreateAccountDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên tài khoản"))
            .MaximumLength(200).WithMessage(VietnameseValidationMessages.StringTooLong("Tên tài khoản", 200));

        RuleFor(x => x.CreditLimit)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Hạn mức tín dụng", 0));
    }
}

public class CreateAPInvoiceRequestValidator : AbstractValidator<CreateAPInvoiceRequest>
{
    public CreateAPInvoiceRequestValidator()
    {
        RuleFor(x => x.SupplierId)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Nhà cung cấp"));

        RuleFor(x => x.Lines)
            .NotEmpty().WithMessage(VietnameseValidationMessages.CollectionEmpty("Danh sách dòng hàng"));

        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.Description)
                .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên hàng hoá"));
            line.RuleFor(l => l.Quantity)
                .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số lượng", 1));
            line.RuleFor(l => l.UnitPrice)
                .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Đơn giá", 0));
        });
    }
}

public class ApplyPaymentRequestValidator : AbstractValidator<ApplyPaymentRequest>
{
    public ApplyPaymentRequestValidator()
    {
        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số tiền thanh toán", 1));
    }
}

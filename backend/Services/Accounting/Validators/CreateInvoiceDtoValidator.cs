using BuildingBlocks.Validation;
using FluentValidation;

namespace Accounting.Validators;

/// <summary>Validate request tạo hoá đơn — bắt buộc có ít nhất 1 dòng hàng, số lượng/đơn giá dương.</summary>
public class CreateInvoiceDtoValidator : AbstractValidator<CreateInvoiceDto>
{
    public CreateInvoiceDtoValidator()
    {
        RuleFor(x => x.Items)
            .NotEmpty().WithMessage(VietnameseValidationMessages.CollectionEmpty("Danh sách dòng hàng"));

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.Description)
                .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Mô tả"));
            item.RuleFor(i => i.Quantity)
                .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số lượng", 1));
            item.RuleFor(i => i.UnitPrice)
                .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Đơn giá", 1));
        });
    }
}

/// <summary>Validate request tạo tài khoản công nợ (Organization Account).</summary>
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

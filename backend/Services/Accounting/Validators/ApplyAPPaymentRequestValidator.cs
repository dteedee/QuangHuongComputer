using BuildingBlocks.Validation;
using FluentValidation;

namespace Accounting.Validators;

/// <summary>Validate request thanh toán công nợ phải trả (AP) — số tiền dương, phương thức hợp lệ.</summary>
public class ApplyAPPaymentRequestValidator : AbstractValidator<ApplyAPPaymentRequest>
{
    public ApplyAPPaymentRequestValidator()
    {
        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số tiền thanh toán", 1));

        RuleFor(x => x.PaymentMethod)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Phương thức thanh toán"));
    }
}

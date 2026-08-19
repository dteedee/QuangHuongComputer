using BuildingBlocks.Validation;
using FluentValidation;

namespace Payments.Validators;

/// <summary>Validate request tạo payment intent (POST /api/payments/initiate).</summary>
public class InitiatePaymentDtoValidator : AbstractValidator<InitiatePaymentDto>
{
    public InitiatePaymentDtoValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Đơn hàng"));

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số tiền", 1));

        RuleFor(x => x.Provider)
            .IsInEnum().WithMessage(VietnameseValidationMessages.Invalid);
    }
}

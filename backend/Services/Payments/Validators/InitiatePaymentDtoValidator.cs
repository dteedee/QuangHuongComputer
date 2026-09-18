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

        // W0-10: `Amount` do client gửi bị SERVER BỎ QUA (số tiền lấy từ đơn hàng).
        // Không còn bắt buộc > 0 để không ép frontend gửi một con số vô nghĩa.
        RuleFor(x => x.Amount)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số tiền", 0));

        RuleFor(x => x.Provider)
            .IsInEnum().WithMessage(VietnameseValidationMessages.Invalid);
    }
}

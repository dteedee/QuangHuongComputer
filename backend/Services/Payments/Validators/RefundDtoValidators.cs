using BuildingBlocks.Validation;
using FluentValidation;
using Payments.Endpoints.Admin;

namespace Payments.Validators;

/// <summary>
/// Validator cho luồng hoàn tiền. Bắt buộc phải có: `WithValidation&lt;T&gt;()` làm API CHẾT LÚC KHỞI
/// ĐỘNG nếu thiếu `IValidator&lt;T&gt;` (ValidatorRegistrationGuard — docs/api-conventions.md mục 2).
/// </summary>
public class CreateRefundDtoValidator : AbstractValidator<CreateRefundDto>
{
    public CreateRefundDtoValidator()
    {
        RuleFor(x => x.PaymentId)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Giao dịch thanh toán"));

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số tiền hoàn", 0));

        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Lý do hoàn tiền"))
            .MaximumLength(500);
    }
}

public class CompleteRefundDtoValidator : AbstractValidator<CompleteRefundDto>
{
    public CompleteRefundDtoValidator()
    {
        // Mã tham chiếu là BẰNG CHỨNG đã trả tiền — không có thì không được ghi là đã hoàn.
        RuleFor(x => x.Reference)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Mã tham chiếu giao dịch"))
            .MaximumLength(100);
    }
}

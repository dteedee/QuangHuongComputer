using BuildingBlocks.Validation;
using FluentValidation;

namespace Catalog.Validators;

/// <summary>Validate request tạo đánh giá sản phẩm — rating 1..5, comment bắt buộc.</summary>
public class CreateProductReviewDtoValidator : AbstractValidator<CreateProductReviewDto>
{
    public CreateProductReviewDtoValidator()
    {
        RuleFor(x => x.Rating)
            .InclusiveBetween(1, 5).WithMessage(VietnameseValidationMessages.NumberOutOfRange("Đánh giá (sao)", 1, 5));

        RuleFor(x => x.Comment)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Nội dung đánh giá"))
            .MinimumLength(10).WithMessage(VietnameseValidationMessages.StringTooShort("Nội dung đánh giá", 10))
            .MaximumLength(2000).WithMessage(VietnameseValidationMessages.StringTooLong("Nội dung đánh giá", 2000));

        RuleFor(x => x.Title)
            .MaximumLength(200).WithMessage(VietnameseValidationMessages.StringTooLong("Tiêu đề", 200))
            .When(x => x.Title != null);
    }
}

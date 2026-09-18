using BuildingBlocks.Validation;
using FluentValidation;

namespace Catalog.Validators;

public class CreateCategoryDtoValidator : AbstractValidator<CreateCategoryDto>
{
    public CreateCategoryDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên danh mục"))
            .MaximumLength(100).WithMessage(VietnameseValidationMessages.StringTooLong("Tên danh mục", 100));

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Mô tả"));

        RuleFor(x => x.VatRate)
            .InclusiveBetween(0m, 1m).WithMessage(VietnameseValidationMessages.NumberOutOfRange("Thuế suất VAT", 0, 1))
            .When(x => x.VatRate.HasValue);
    }
}

public class UpdateCategoryDtoValidator : AbstractValidator<UpdateCategoryDto>
{
    public UpdateCategoryDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên danh mục"))
            .MaximumLength(100).WithMessage(VietnameseValidationMessages.StringTooLong("Tên danh mục", 100));

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Mô tả"));

        RuleFor(x => x.VatRate)
            .InclusiveBetween(0m, 1m).WithMessage(VietnameseValidationMessages.NumberOutOfRange("Thuế suất VAT", 0, 1))
            .When(x => x.VatRate.HasValue);
    }
}

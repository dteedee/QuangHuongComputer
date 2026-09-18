using BuildingBlocks.Validation;
using FluentValidation;

namespace Catalog.Validators;

public class CreateBrandDtoValidator : AbstractValidator<CreateBrandDto>
{
    public CreateBrandDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên thương hiệu"))
            .MaximumLength(100).WithMessage(VietnameseValidationMessages.StringTooLong("Tên thương hiệu", 100));

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Mô tả"));

        RuleFor(x => x.Website)
            .MaximumLength(500).WithMessage(VietnameseValidationMessages.StringTooLong("Website", 500))
            .When(x => x.Website != null);
    }
}

public class UpdateBrandDtoValidator : AbstractValidator<UpdateBrandDto>
{
    public UpdateBrandDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên thương hiệu"))
            .MaximumLength(100).WithMessage(VietnameseValidationMessages.StringTooLong("Tên thương hiệu", 100));

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Mô tả"));
    }
}

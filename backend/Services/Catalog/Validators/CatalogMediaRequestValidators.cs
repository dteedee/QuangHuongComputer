using BuildingBlocks.Validation;
using FluentValidation;

namespace Catalog.Validators;

/// <summary>Validate `POST /api/catalog/products/{id}/media` - Url bắt buộc trừ khi tạo từ upload trực tiếp.</summary>
public class AddMediaRequestValidator : AbstractValidator<CatalogMediaEndpoints.AddMediaRequest>
{
    public AddMediaRequestValidator()
    {
        RuleFor(x => x.Url)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("URL media"))
            .MaximumLength(1024).WithMessage(VietnameseValidationMessages.StringTooLong("URL media", 1024));

        RuleFor(x => x.SortOrder)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Thứ tự", 0));

        RuleFor(x => x.AltText)
            .MaximumLength(500).WithMessage(VietnameseValidationMessages.StringTooLong("Alt text", 500))
            .When(x => x.AltText != null);
    }
}

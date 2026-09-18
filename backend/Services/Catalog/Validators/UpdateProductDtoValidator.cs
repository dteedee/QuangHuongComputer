using BuildingBlocks.Validation;
using FluentValidation;

namespace Catalog.Validators;

/// <summary>Validate `PUT /api/catalog/products/{id}` - PARTIAL: chỉ ràng buộc trường có gửi (không null).</summary>
public class UpdateProductDtoValidator : AbstractValidator<UpdateProductDto>
{
    public UpdateProductDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên sản phẩm"))
            .MaximumLength(200).WithMessage(VietnameseValidationMessages.StringTooLong("Tên sản phẩm", 200))
            .When(x => x.Name != null);

        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Giá bán", 0))
            .When(x => x.Price.HasValue);

        RuleFor(x => x.CostPrice)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Giá vốn", 0))
            .When(x => x.CostPrice.HasValue);

        RuleFor(x => x.StockQuantity)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Tồn kho", 0))
            .When(x => x.StockQuantity.HasValue);

        RuleFor(x => x.WarrantyMonths)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số tháng bảo hành", 0))
            .When(x => x.WarrantyMonths.HasValue);

        RuleFor(x => x.UnitName)
            .MaximumLength(30).WithMessage(VietnameseValidationMessages.StringTooLong("Đơn vị tính", 30))
            .When(x => x.UnitName != null);
    }
}

using BuildingBlocks.Validation;
using FluentValidation;

namespace Catalog.Validators;

/// <summary>Validate `POST /api/catalog/products` - tên/mô tả bắt buộc, giá/tồn không âm, FK không rỗng.</summary>
public class CreateProductDtoValidator : AbstractValidator<CreateProductDto>
{
    public CreateProductDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên sản phẩm"))
            .MaximumLength(200).WithMessage(VietnameseValidationMessages.StringTooLong("Tên sản phẩm", 200));

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Mô tả"));

        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Giá bán", 0));

        RuleFor(x => x.CostPrice)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Giá vốn", 0));

        RuleFor(x => x.StockQuantity)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Tồn kho", 0));

        RuleFor(x => x.CategoryId)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Danh mục"));

        RuleFor(x => x.BrandId)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Thương hiệu"));

        RuleFor(x => x.WarrantyMonths)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số tháng bảo hành", 0))
            .When(x => x.WarrantyMonths.HasValue);

        RuleFor(x => x.UnitName)
            .MaximumLength(30).WithMessage(VietnameseValidationMessages.StringTooLong("Đơn vị tính", 30))
            .When(x => x.UnitName != null);
    }
}

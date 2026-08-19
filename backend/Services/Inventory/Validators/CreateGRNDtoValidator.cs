using BuildingBlocks.Validation;
using FluentValidation;

namespace InventoryModule.Validators;

/// <summary>Validate request tạo phiếu nhập kho GRN (POST /api/inventory/grn).</summary>
public class CreateGRNDtoValidator : AbstractValidator<CreateGRNDto>
{
    public CreateGRNDtoValidator()
    {
        RuleFor(x => x.ReceivedBy)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Người nhận hàng"));

        RuleFor(x => x.Items)
            .NotEmpty().WithMessage(VietnameseValidationMessages.CollectionEmpty("Danh sách hàng nhập"));

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId)
                .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Sản phẩm"));
            item.RuleFor(i => i.ProductName)
                .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên sản phẩm"));
            item.RuleFor(i => i.Quantity)
                .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số lượng", 1));
            item.RuleFor(i => i.UnitCost)
                .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Đơn giá", 0));
        });
    }
}

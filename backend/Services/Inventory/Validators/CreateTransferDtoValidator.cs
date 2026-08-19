using BuildingBlocks.Validation;
using FluentValidation;

namespace InventoryModule.Validators;

/// <summary>Validate request tạo phiếu chuyển kho (POST /api/inventory/transfers).</summary>
public class CreateTransferDtoValidator : AbstractValidator<CreateTransferDto>
{
    public CreateTransferDtoValidator()
    {
        RuleFor(x => x.FromWarehouseId)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Kho xuất"));

        RuleFor(x => x.ToWarehouseId)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Kho nhận"))
            .NotEqual(x => x.FromWarehouseId).WithMessage("Kho nhận phải khác kho xuất");

        RuleFor(x => x.Items)
            .NotEmpty().WithMessage(VietnameseValidationMessages.CollectionEmpty("Danh sách hàng chuyển kho"));

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.InventoryItemId)
                .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Mặt hàng"));
            item.RuleFor(i => i.Quantity)
                .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số lượng", 1));
        });
    }
}

using BuildingBlocks.Validation;
using FluentValidation;
using InventoryModule.Endpoints;

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

        RuleFor(x => x.Items)
            .Must(items => items is null || items.Select(i => i.InventoryItemId).Distinct().Count() == items.Count)
            .WithMessage("Mỗi mặt hàng chỉ được xuất hiện một lần trong phiếu");

        RuleFor(x => x.Notes).MaximumLength(1000);

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.InventoryItemId)
                .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Mặt hàng"));
            item.RuleFor(i => i.Quantity)
                .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số lượng", 1));
            item.RuleFor(i => i.SerialNumbers)
                .Must(s => s is null || s.All(x => !string.IsNullOrWhiteSpace(x)))
                .WithMessage("Số serial không được để trống")
                .Must(s => s is null || s.Distinct(StringComparer.OrdinalIgnoreCase).Count() == s.Count)
                .WithMessage("Số serial bị trùng trong cùng một dòng");
            item.RuleFor(i => i)
                .Must(i => i.SerialNumbers is not { Count: > 0 } || i.SerialNumbers.Count == i.Quantity)
                .WithMessage("Số serial đã chọn phải bằng số lượng chuyển");
        });
    }
}

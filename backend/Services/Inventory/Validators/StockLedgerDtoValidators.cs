using BuildingBlocks.Validation;
using FluentValidation;
using InventoryModule.Endpoints;

namespace InventoryModule.Validators;

/// <summary>
/// D10 — tồn đầu kỳ. <c>WithValidation&lt;T&gt;()</c> làm host CHẾT lúc khởi động nếu DTO không có
/// validator, nên mỗi endpoint mới của W2-5 đều có một validator ở đây.
/// </summary>
public class OpeningBalanceDtoValidator : AbstractValidator<OpeningBalanceDto>
{
    public OpeningBalanceDtoValidator()
    {
        RuleFor(x => x.ProductId)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Sản phẩm"));

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số lượng", 1));

        RuleFor(x => x.UnitCost)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Giá vốn", 0));
    }
}

/// <summary>Phiếu điều chỉnh: bắt buộc lý do + ít nhất một dòng có chênh lệch khác 0.</summary>
public class CreateStockAdjustmentDtoValidator : AbstractValidator<CreateStockAdjustmentDto>
{
    public CreateStockAdjustmentDtoValidator()
    {
        RuleFor(x => x.WarehouseId)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Kho"));

        // Success Criteria W2-5: "điều chỉnh thủ công không có lý do bị từ chối".
        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Lý do điều chỉnh"))
            .MinimumLength(3).WithMessage("Lý do điều chỉnh phải có ít nhất 3 ký tự");

        RuleFor(x => x.Items)
            .NotEmpty().WithMessage(VietnameseValidationMessages.CollectionEmpty("Danh sách dòng điều chỉnh"));

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.InventoryItemId)
                .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Dòng tồn kho"));
            item.RuleFor(i => i.QuantityAdjusted)
                .NotEqual(0).WithMessage("Chênh lệch điều chỉnh phải khác 0");
        });
    }
}

/// <summary>Từ chối phiếu điều chỉnh: bắt buộc lý do.</summary>
public class RejectAdjustmentDtoValidator : AbstractValidator<RejectAdjustmentDto>
{
    public RejectAdjustmentDtoValidator()
    {
        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Lý do từ chối"));
    }
}

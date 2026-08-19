using BuildingBlocks.Validation;
using FluentValidation;
using InventoryModule.DTOs;

namespace InventoryModule.Validators;

/// <summary>Validate request điều chỉnh tồn kho (PUT /api/inventory/stock/{id}/adjust).</summary>
public class AdjustStockDtoValidator : AbstractValidator<AdjustStockDto>
{
    public AdjustStockDtoValidator()
    {
        RuleFor(x => x.Amount)
            .NotEqual(0).WithMessage(VietnameseValidationMessages.RequiredField("Số lượng điều chỉnh"));

        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Lý do điều chỉnh"));
    }
}

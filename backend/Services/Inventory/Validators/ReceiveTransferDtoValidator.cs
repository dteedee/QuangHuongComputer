using FluentValidation;
using InventoryModule.Endpoints;

namespace InventoryModule.Validators;

/// <summary>Validate request nhận hàng chuyển kho (PUT /api/inventory/transfers/{id}/receive).</summary>
public class ReceiveTransferDtoValidator : AbstractValidator<ReceiveTransferDto>
{
    public ReceiveTransferDtoValidator()
    {
        RuleFor(x => x.Note).MaximumLength(1000);

        RuleFor(x => x.Lines)
            .Must(lines => lines is null || lines.Select(l => l.ItemId).Distinct().Count() == lines.Count)
            .WithMessage("Mỗi dòng phiếu chỉ được khai một lần");

        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.ItemId).NotEmpty();
            line.RuleFor(l => l.ReceivedQuantity)
                .GreaterThanOrEqualTo(0).WithMessage("Số lượng nhận không được âm");
            line.RuleFor(l => l)
                .Must(l => l.ReceivedSerials is null || l.ReceivedSerials.Count == l.ReceivedQuantity)
                .WithMessage("Số serial nhận phải bằng số lượng nhận");
        });
    }
}

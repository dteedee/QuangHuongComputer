using BuildingBlocks.Validation;
using FluentValidation;
using Sales.Application.Checkout;

namespace Sales.Validators;

/// <summary>Validate request checkout orchestrator (POST /api/sales/checkout).</summary>
public class CheckoutOrchestratorRequestDtoValidator : AbstractValidator<CheckoutOrchestratorRequestDto>
{
    public CheckoutOrchestratorRequestDtoValidator()
    {
        RuleFor(x => x.CartId)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Giỏ hàng"));

        RuleFor(x => x.Shipping)
            .NotNull().WithMessage(VietnameseValidationMessages.RequiredField("Thông tin giao hàng"));

        When(x => x.Shipping != null, () =>
        {
            RuleFor(x => x.Shipping.RecipientName)
                .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên người nhận"))
                .MaximumLength(200).WithMessage(VietnameseValidationMessages.StringTooLong("Tên người nhận", 200));

            RuleFor(x => x.Shipping.Phone)
                .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Số điện thoại"))
                .Matches(@"^(0|\+84)[0-9]{9,10}$").WithMessage(VietnameseValidationMessages.InvalidPhone());

            // Địa chỉ chỉ bắt buộc khi không nhận tại cửa hàng.
            RuleFor(x => x.Shipping.StreetAddress)
                .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Địa chỉ"))
                .When(x => !x.Shipping.IsPickup);
        });

        RuleFor(x => x.GuestEmail)
            .EmailAddress().WithMessage(VietnameseValidationMessages.InvalidEmail())
            .When(x => !string.IsNullOrWhiteSpace(x.GuestEmail));
    }
}

/// <summary>Validate request checkout trực tiếp / POS (POST /api/sales/checkout — SalesEndpoints legacy).</summary>
public class CheckoutDtoValidator : AbstractValidator<CheckoutDto>
{
    public CheckoutDtoValidator()
    {
        RuleFor(x => x.Items)
            .NotEmpty().WithMessage(VietnameseValidationMessages.CollectionEmpty("Giỏ hàng"));

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId)
                .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Sản phẩm"));
            item.RuleFor(i => i.Quantity)
                .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số lượng", 1));
            item.RuleFor(i => i.UnitPrice)
                .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Đơn giá", 0));
        });

        // Địa chỉ giao hàng bắt buộc khi không nhận tại cửa hàng.
        RuleFor(x => x.ShippingAddress)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Địa chỉ giao hàng"))
            .When(x => !x.IsPickup);

        RuleFor(x => x.ManualDiscount)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Giảm giá", 0))
            .When(x => x.ManualDiscount.HasValue);
    }
}

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

/// <summary>
/// W0-4 — Validate checkout của KHÁCH HÀNG (POST /api/sales/checkout).
/// Không còn rule cho ManualDiscount: field đó đã bị gỡ khỏi <see cref="CheckoutDto"/>
/// (khách từng gửi manualDiscount để mua 0đ). Giá/tên sản phẩm client gửi lên chỉ để
/// tương thích payload cũ — server luôn lấy lại từ Catalog.
/// </summary>
public class CheckoutDtoValidator : AbstractValidator<CheckoutDto>
{
    /// <summary>Trần số lượng mỗi dòng — khớp SalesEndpoints.MaxQuantityPerCartLine.</summary>
    public const int MaxQuantityPerLine = 99;

    public CheckoutDtoValidator()
    {
        RuleFor(x => x.Items)
            .NotEmpty().WithMessage(VietnameseValidationMessages.CollectionEmpty("Giỏ hàng"));

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId)
                .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Sản phẩm"));
            item.RuleFor(i => i.Quantity)
                .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số lượng", 1))
                .LessThanOrEqualTo(MaxQuantityPerLine)
                .WithMessage($"Số lượng tối đa mỗi sản phẩm là {MaxQuantityPerLine}");
        });

        // Địa chỉ giao hàng bắt buộc khi không nhận tại cửa hàng.
        RuleFor(x => x.ShippingAddress)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Địa chỉ giao hàng"))
            .When(x => !x.IsPickup);

        // Người nhận: SĐT phải là số VN hợp lệ khi được gửi lên (W0-7 làm frontend gửi).
        RuleFor(x => x.RecipientPhone)
            .Matches(@"^(0|\+84)[0-9]{9,10}$").WithMessage(VietnameseValidationMessages.InvalidPhone())
            .When(x => !string.IsNullOrWhiteSpace(x.RecipientPhone));

        RuleFor(x => x.RecipientName)
            .MaximumLength(200).WithMessage(VietnameseValidationMessages.StringTooLong("Tên người nhận", 200))
            .When(x => !string.IsNullOrWhiteSpace(x.RecipientName));
    }
}

/// <summary>
/// W0-4 — Validate checkout của NHÂN VIÊN (POST /api/sales/staff-checkout, RequireRole).
/// Giảm giá tay ≥ 0 (server còn cap thêm ở tạm tính), phí ship ≥ 0.
/// </summary>
public class StaffCheckoutDtoValidator : AbstractValidator<StaffCheckoutDto>
{
    public StaffCheckoutDtoValidator()
    {
        RuleFor(x => x.Items)
            .NotEmpty().WithMessage(VietnameseValidationMessages.CollectionEmpty("Giỏ hàng"));

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId)
                .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Sản phẩm"));
            item.RuleFor(i => i.Quantity)
                .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số lượng", 1))
                .LessThanOrEqualTo(CheckoutDtoValidator.MaxQuantityPerLine)
                .WithMessage($"Số lượng tối đa mỗi sản phẩm là {CheckoutDtoValidator.MaxQuantityPerLine}");
        });

        RuleFor(x => x.ShippingAddress)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Địa chỉ giao hàng"))
            .When(x => !x.IsPickup);

        RuleFor(x => x.ManualDiscount)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Giảm giá", 0))
            .When(x => x.ManualDiscount.HasValue);

        RuleFor(x => x.ShippingFee)
            .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Phí vận chuyển", 0))
            .When(x => x.ShippingFee.HasValue);

        RuleFor(x => x.RecipientPhone)
            .Matches(@"^(0|\+84)[0-9]{9,10}$").WithMessage(VietnameseValidationMessages.InvalidPhone())
            .When(x => !string.IsNullOrWhiteSpace(x.RecipientPhone));
    }
}

using BuildingBlocks.Validation;
using FluentValidation;

namespace Sales.Validators;

/// <summary>Validate request đặt hàng khách vãng lai (POST /api/sales/public/guest-checkout).</summary>
public class GuestCheckoutDtoValidator : AbstractValidator<GuestCheckoutDto>
{
    public GuestCheckoutDtoValidator()
    {
        RuleFor(x => x.CustomerName)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Họ tên"))
            .MaximumLength(200).WithMessage(VietnameseValidationMessages.StringTooLong("Họ tên", 200));

        RuleFor(x => x.CustomerEmail)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Email"))
            .EmailAddress().WithMessage(VietnameseValidationMessages.InvalidEmail());

        RuleFor(x => x.CustomerPhone)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Số điện thoại"))
            .Matches(@"^(0|\+84)[0-9]{9,10}$").WithMessage(VietnameseValidationMessages.InvalidPhone());

        RuleFor(x => x.ShippingAddress)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Địa chỉ giao hàng"));

        RuleFor(x => x.Items)
            .NotEmpty().WithMessage(VietnameseValidationMessages.CollectionEmpty("Giỏ hàng"));

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId)
                .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Sản phẩm"));
            item.RuleFor(i => i.Quantity)
                .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số lượng", 1));
            item.RuleFor(i => i.Price)
                .GreaterThanOrEqualTo(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Giá", 0));
        });
    }
}

/// <summary>Validate request tạo yêu cầu đổi trả (POST /api/sales/returns).</summary>
public class CreateReturnRequestDtoValidator : AbstractValidator<CreateReturnRequestDto>
{
    public CreateReturnRequestDtoValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Đơn hàng"));

        RuleFor(x => x.OrderItemId)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Sản phẩm trong đơn"));

        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Lý do đổi trả"))
            .MaximumLength(500).WithMessage(VietnameseValidationMessages.StringTooLong("Lý do đổi trả", 500));

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage(VietnameseValidationMessages.StringTooLong("Mô tả", 2000))
            .When(x => x.Description != null);
    }
}

/// <summary>Validate request cập nhật trạng thái đơn hàng (Admin — PUT /api/sales/admin/orders/{id}/status).</summary>
public class UpdateOrderStatusDtoValidator : AbstractValidator<UpdateOrderStatusDto>
{
    public UpdateOrderStatusDtoValidator()
    {
        RuleFor(x => x.Status)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Trạng thái đơn hàng"));
    }
}

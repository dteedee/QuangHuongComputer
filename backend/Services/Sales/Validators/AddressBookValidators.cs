using BuildingBlocks.Validation;
using FluentValidation;

namespace Sales.Validators;

/// <summary>Validate request tạo/sửa địa chỉ sổ địa chỉ khách hàng (POST/PUT /api/sales/addresses).</summary>
public class SaveAddressRequestValidator : AbstractValidator<SaveAddressRequest>
{
    public SaveAddressRequestValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Họ tên"))
            .MaximumLength(200).WithMessage(VietnameseValidationMessages.StringTooLong("Họ tên", 200));

        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Số điện thoại"))
            .Matches(@"^(0|\+84)[0-9]{9,10}$").WithMessage(VietnameseValidationMessages.InvalidPhone());

        RuleFor(x => x.Province)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tỉnh/Thành phố"))
            .MaximumLength(100).WithMessage(VietnameseValidationMessages.StringTooLong("Tỉnh/Thành phố", 100));

        RuleFor(x => x.District)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Quận/Huyện"))
            .MaximumLength(100).WithMessage(VietnameseValidationMessages.StringTooLong("Quận/Huyện", 100));

        RuleFor(x => x.Ward)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Phường/Xã"))
            .MaximumLength(100).WithMessage(VietnameseValidationMessages.StringTooLong("Phường/Xã", 100));

        RuleFor(x => x.StreetAddress)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Địa chỉ cụ thể"))
            .MaximumLength(300).WithMessage(VietnameseValidationMessages.StringTooLong("Địa chỉ cụ thể", 300));

        RuleFor(x => x.Label)
            .MaximumLength(50).WithMessage(VietnameseValidationMessages.StringTooLong("Nhãn địa chỉ", 50))
            .When(x => x.Label != null);
    }
}

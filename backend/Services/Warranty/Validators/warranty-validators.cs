using BuildingBlocks.Validation;
using FluentValidation;

namespace Warranty.Validators;

/// <summary>
/// W2-6 Requirement "validators everywhere". Every DTO an endpoint marks with
/// <c>.WithValidation&lt;T&gt;()</c> needs exactly one of these — <c>ValidatorRegistrationGuard</c>
/// fails the host at startup otherwise (see FluentValidationExtensions.cs).
/// </summary>
public class RegisterWarrantyDtoValidator : AbstractValidator<RegisterWarrantyDto>
{
    public RegisterWarrantyDtoValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Sản phẩm"));
        RuleFor(x => x.SerialNumber).NotEmpty().MaximumLength(120)
            .WithMessage(VietnameseValidationMessages.RequiredField("Số serial"));
        // D08 §4: 0-120 tháng, ngày mua không ở tương lai (khớp validator trong ProductWarranty).
        RuleFor(x => x.WarrantyPeriodMonths).InclusiveBetween(0, 120)
            .WithMessage(VietnameseValidationMessages.NumberOutOfRange("Số tháng bảo hành", 0, 120));
        RuleFor(x => x.PurchaseDate).LessThanOrEqualTo(_ => DateTime.UtcNow.Date.AddDays(1))
            .WithMessage("Ngày mua không được ở tương lai.");
    }
}

public class CreateClaimDtoValidator : AbstractValidator<CreateClaimDto>
{
    public CreateClaimDtoValidator()
    {
        RuleFor(x => x.SerialNumber).NotEmpty().MaximumLength(120)
            .WithMessage(VietnameseValidationMessages.RequiredField("Số serial"));
        RuleFor(x => x.IssueDescription).NotEmpty().MaximumLength(2000)
            .WithMessage(VietnameseValidationMessages.RequiredField("Mô tả lỗi"));
    }
}

public class RejectClaimDtoValidator : AbstractValidator<RejectClaimDto>
{
    public RejectClaimDtoValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000)
            .WithMessage(VietnameseValidationMessages.RequiredField("Lý do từ chối"));
    }
}

public class ResolveClaimDtoValidator : AbstractValidator<ResolveClaimDto>
{
    public ResolveClaimDtoValidator()
    {
        RuleFor(x => x.Notes).NotEmpty().MaximumLength(2000)
            .WithMessage(VietnameseValidationMessages.RequiredField("Ghi chú xử lý"));
    }
}

public class CreateWarrantyPolicyDtoValidator : AbstractValidator<CreateWarrantyPolicyDto>
{
    public CreateWarrantyPolicyDtoValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200)
            .WithMessage(VietnameseValidationMessages.RequiredField("Tên chính sách"));
        RuleFor(x => x.CoverageTerms).NotEmpty()
            .WithMessage(VietnameseValidationMessages.RequiredField("Điều khoản bảo hành"));
        RuleFor(x => x.DurationMonths).InclusiveBetween(0, 120)
            .WithMessage(VietnameseValidationMessages.NumberOutOfRange("Số tháng bảo hành", 0, 120));
    }
}

public class UpdateWarrantyPolicyDtoValidator : AbstractValidator<UpdateWarrantyPolicyDto>
{
    public UpdateWarrantyPolicyDtoValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200)
            .WithMessage(VietnameseValidationMessages.RequiredField("Tên chính sách"));
        RuleFor(x => x.CoverageTerms).NotEmpty()
            .WithMessage(VietnameseValidationMessages.RequiredField("Điều khoản bảo hành"));
        RuleFor(x => x.DurationMonths).InclusiveBetween(0, 120)
            .WithMessage(VietnameseValidationMessages.NumberOutOfRange("Số tháng bảo hành", 0, 120));
    }
}

public class CreateRmaDtoValidator : AbstractValidator<CreateRmaDto>
{
    public CreateRmaDtoValidator()
    {
        RuleFor(x => x.SupplierId).NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Nhà cung cấp"));
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.SerialNumber).NotEmpty()
                .WithMessage(VietnameseValidationMessages.RequiredField("Số serial"));
            item.RuleFor(i => i.Issue).NotEmpty()
                .WithMessage(VietnameseValidationMessages.RequiredField("Mô tả lỗi"));
        });
    }
}

public class ReceiveRmaDtoValidator : AbstractValidator<ReceiveRmaDto>
{
    public ReceiveRmaDtoValidator()
    {
        RuleFor(x => x.Result).NotEmpty().MaximumLength(500)
            .WithMessage(VietnameseValidationMessages.RequiredField("Kết quả xử lý"));
    }
}

public class CreateLoanerDeviceDtoValidator : AbstractValidator<CreateLoanerDeviceDto>
{
    public CreateLoanerDeviceDtoValidator()
    {
        RuleFor(x => x.SerialNumber).NotEmpty()
            .WithMessage(VietnameseValidationMessages.RequiredField("Số serial"));
        RuleFor(x => x.CustomerId).NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Khách hàng"));
        RuleFor(x => x.WarrantyClaimId).NotEmpty()
            .WithMessage(VietnameseValidationMessages.RequiredField("Yêu cầu bảo hành liên quan"));
        RuleFor(x => x.ConditionAtLoan).NotEmpty()
            .WithMessage(VietnameseValidationMessages.RequiredField("Tình trạng máy khi cho mượn"));
        RuleFor(x => x.ExpectedReturnDate).GreaterThan(DateTime.UtcNow)
            .WithMessage("Ngày dự kiến trả phải ở tương lai.");
    }
}

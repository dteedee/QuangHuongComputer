using FluentValidation;
using Identity.DTOs;
using Microsoft.Extensions.Hosting;

namespace Identity.Validators;

/// <summary>
/// Vietnamese-language validation for the anonymous auth surface.
///
/// D03 is binding on the e-mail rule: RFC 2606 domains (`example.com/.net/.org`)
/// are rejected in PRODUCTION ONLY. Development must keep accepting them,
/// because every probe and every end-to-end test in this overhaul signs up as
/// something@example.com - rejecting them everywhere would make the whole test
/// stack unusable.
/// </summary>
public sealed class RegisterDtoValidator : AbstractValidator<RegisterDto>
{
    private static readonly string[] ReservedDomains = { "example.com", "example.net", "example.org" };

    public RegisterDtoValidator(IHostEnvironment environment)
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Vui lòng nhập email.")
            .EmailAddress().WithMessage("Email không hợp lệ.")
            .MaximumLength(256).WithMessage("Email tối đa 256 ký tự.");

        if (environment.IsProduction())
        {
            RuleFor(x => x.Email)
                .Must(email => !ReservedDomains.Any(d =>
                    (email ?? string.Empty).Trim().EndsWith("@" + d, StringComparison.OrdinalIgnoreCase)))
                .WithMessage("Vui lòng dùng địa chỉ email thật.");
        }

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Vui lòng nhập mật khẩu.")
            .MinimumLength(6).WithMessage("Mật khẩu tối thiểu 6 ký tự.")
            .MaximumLength(128).WithMessage("Mật khẩu tối đa 128 ký tự.");

        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Vui lòng nhập họ tên.")
            .MaximumLength(200).WithMessage("Họ tên tối đa 200 ký tự.");
    }
}

public sealed class LoginDtoValidator : AbstractValidator<LoginDto>
{
    public LoginDtoValidator()
    {
        // Deliberately shallow: a strict format check here would answer "email
        // không hợp lệ" for an address that exists, and "sai mật khẩu" for one
        // that does not - an enumeration oracle in the validator layer.
        RuleFor(x => x.Email).NotEmpty().WithMessage("Vui lòng nhập email.").MaximumLength(256);
        RuleFor(x => x.Password).NotEmpty().WithMessage("Vui lòng nhập mật khẩu.").MaximumLength(128);
    }
}

public sealed class LoginTwoFactorDtoValidator : AbstractValidator<LoginTwoFactorDto>
{
    public LoginTwoFactorDtoValidator()
    {
        RuleFor(x => x.ChallengeToken)
            .NotEmpty().WithMessage("Thiếu mã phiên xác thực.")
            .MaximumLength(256);

        RuleFor(x => x)
            .Must(x => !string.IsNullOrWhiteSpace(x.Code) || !string.IsNullOrWhiteSpace(x.BackupCode))
            .WithMessage("Vui lòng nhập mã xác thực hoặc mã dự phòng.")
            .OverridePropertyName(nameof(LoginTwoFactorDto.Code));

        RuleFor(x => x.Code)
            .Matches("^[0-9]{6}$").WithMessage("Mã xác thực gồm 6 chữ số.")
            .When(x => !string.IsNullOrWhiteSpace(x.Code));
    }
}

public sealed class TwoFactorVerifyRequestValidator : AbstractValidator<TwoFactorVerifyRequest>
{
    public TwoFactorVerifyRequestValidator()
    {
        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Vui lòng nhập mã xác thực.")
            .Matches("^[0-9]{6}$").WithMessage("Mã xác thực gồm 6 chữ số.");
    }
}

public sealed class TwoFactorDisableDtoValidator : AbstractValidator<TwoFactorDisableDto>
{
    public TwoFactorDisableDtoValidator()
    {
        RuleFor(x => x.Password).NotEmpty().WithMessage("Vui lòng nhập mật khẩu.").MaximumLength(128);

        RuleFor(x => x)
            .Must(x => !string.IsNullOrWhiteSpace(x.Code) || !string.IsNullOrWhiteSpace(x.BackupCode))
            .WithMessage("Vui lòng nhập mã xác thực hoặc mã dự phòng.")
            .OverridePropertyName(nameof(TwoFactorDisableDto.Code));

        RuleFor(x => x.Code)
            .Matches("^[0-9]{6}$").WithMessage("Mã xác thực gồm 6 chữ số.")
            .When(x => !string.IsNullOrWhiteSpace(x.Code));
    }
}

public sealed class ChangePasswordDtoValidator : AbstractValidator<ChangePasswordDto>
{
    public ChangePasswordDtoValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().WithMessage("Vui lòng nhập mật khẩu hiện tại.");
        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("Vui lòng nhập mật khẩu mới.")
            .MinimumLength(6).WithMessage("Mật khẩu tối thiểu 6 ký tự.")
            .MaximumLength(128).WithMessage("Mật khẩu tối đa 128 ký tự.");
        RuleFor(x => x.NewPassword)
            .NotEqual(x => x.CurrentPassword).WithMessage("Mật khẩu mới phải khác mật khẩu hiện tại.");
    }
}

public sealed class UpdateProfileDtoValidator : AbstractValidator<UpdateProfileDto>
{
    public UpdateProfileDtoValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Vui lòng nhập họ tên.")
            .MaximumLength(200).WithMessage("Họ tên tối đa 200 ký tự.");

        // Vietnamese numbers: 10-11 digits, optional +84 prefix.
        RuleFor(x => x.PhoneNumber)
            .Matches(@"^(\+?84|0)[0-9]{9,10}$").WithMessage("Số điện thoại không hợp lệ.")
            .When(x => !string.IsNullOrWhiteSpace(x.PhoneNumber));

        RuleFor(x => x.Address).MaximumLength(500).WithMessage("Địa chỉ tối đa 500 ký tự.");
    }
}

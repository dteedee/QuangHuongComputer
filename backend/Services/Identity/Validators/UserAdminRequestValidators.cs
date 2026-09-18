using FluentValidation;
using Identity.DTOs;

namespace Identity.Validators;

/// <summary>Write DTOs of the user-admin surface. Vietnamese messages, same shape as the rest of the API.</summary>
public sealed class CreateUserDtoValidator : AbstractValidator<CreateUserDto>
{
    public CreateUserDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Vui lòng nhập email.")
            .EmailAddress().WithMessage("Email không hợp lệ.")
            .MaximumLength(256).WithMessage("Email tối đa 256 ký tự.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Vui lòng nhập mật khẩu.")
            .MinimumLength(6).WithMessage("Mật khẩu tối thiểu 6 ký tự.")
            .MaximumLength(128).WithMessage("Mật khẩu tối đa 128 ký tự.");

        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Vui lòng nhập họ tên.")
            .MaximumLength(200).WithMessage("Họ tên tối đa 200 ký tự.");

        RuleForEach(x => x.Roles)
            .NotEmpty().WithMessage("Tên vai trò không được để trống.")
            .MaximumLength(64).WithMessage("Tên vai trò tối đa 64 ký tự.")
            .When(x => x.Roles != null);
    }
}

public sealed class UpdateUserDtoValidator : AbstractValidator<UpdateUserDto>
{
    public UpdateUserDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Vui lòng nhập email.")
            .EmailAddress().WithMessage("Email không hợp lệ.")
            .MaximumLength(256).WithMessage("Email tối đa 256 ký tự.");

        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Vui lòng nhập họ tên.")
            .MaximumLength(200).WithMessage("Họ tên tối đa 200 ký tự.");
    }
}

/// <summary>
/// An empty role array is legal - it means "strip every role" - but a null one
/// is a malformed body, and the endpoint's own guards decide whether the result
/// is allowed (last-admin, privilege escalation).
/// </summary>
public sealed class AssignRolesDtoValidator : AbstractValidator<AssignRolesDto>
{
    public AssignRolesDtoValidator()
    {
        RuleFor(x => x.Roles).NotNull().WithMessage("Thiếu danh sách vai trò.");

        RuleForEach(x => x.Roles)
            .NotEmpty().WithMessage("Tên vai trò không được để trống.")
            .MaximumLength(64).WithMessage("Tên vai trò tối đa 64 ký tự.")
            .When(x => x.Roles != null);
    }
}

public sealed class CreateRoleDtoValidator : AbstractValidator<CreateRoleDto>
{
    public CreateRoleDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Tên vai trò không được để trống.")
            .MaximumLength(64).WithMessage("Tên vai trò tối đa 64 ký tự.")
            .Matches(@"^[A-Za-z0-9._-]+$").WithMessage("Tên vai trò chỉ được chứa chữ, số và . _ -");
    }
}

public sealed class UpdateRoleDtoValidator : AbstractValidator<UpdateRoleDto>
{
    public UpdateRoleDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Tên vai trò không được để trống.")
            .MaximumLength(64).WithMessage("Tên vai trò tối đa 64 ký tự.");
    }
}

public sealed class ForgotPasswordDtoValidator : AbstractValidator<ForgotPasswordDto>
{
    public ForgotPasswordDtoValidator()
    {
        RuleFor(x => x.Email).NotEmpty().WithMessage("Vui lòng nhập email.").MaximumLength(256);
    }
}

public sealed class ResetPasswordDtoValidator : AbstractValidator<ResetPasswordDto>
{
    public ResetPasswordDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Vui lòng nhập email đã yêu cầu đặt lại mật khẩu.")
            .MaximumLength(256);

        RuleFor(x => x.SubmittedCode)
            .NotEmpty().WithMessage("Vui lòng nhập mã xác nhận.")
            .Matches("^[0-9]{6}$").WithMessage("Mã xác nhận gồm 6 chữ số.")
            .OverridePropertyName(nameof(ResetPasswordDto.Code));

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("Vui lòng nhập mật khẩu mới.")
            .MinimumLength(6).WithMessage("Mật khẩu tối thiểu 6 ký tự.")
            .MaximumLength(128).WithMessage("Mật khẩu tối đa 128 ký tự.");
    }
}

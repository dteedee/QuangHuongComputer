using BuildingBlocks.Validation;
using FluentValidation;

namespace SystemConfig.Validators;

/// <summary>Validate request tạo cấu hình bảng dữ liệu động (POST /api/config/table-views).</summary>
public class CreateTableViewDtoValidator : AbstractValidator<CreateTableViewDto>
{
    public CreateTableViewDtoValidator()
    {
        RuleFor(x => x.Key)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Key"))
            .MaximumLength(100);

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên bảng"))
            .MaximumLength(200);

        RuleFor(x => x.ColumnsJson)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("ColumnsJson"));
    }
}

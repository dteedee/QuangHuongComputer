using BuildingBlocks.Validation;
using FluentValidation;

namespace Catalog.Validators;

using static CatalogSpecificationAdminEndpoints;

public class CreateSpecGroupRequestValidator : AbstractValidator<CreateSpecGroupRequest>
{
    public CreateSpecGroupRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên nhóm thông số"))
            .MaximumLength(200).WithMessage(VietnameseValidationMessages.StringTooLong("Tên nhóm thông số", 200));
    }
}

public class UpdateSpecGroupRequestValidator : AbstractValidator<UpdateSpecGroupRequest>
{
    public UpdateSpecGroupRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên nhóm thông số"))
            .MaximumLength(200).WithMessage(VietnameseValidationMessages.StringTooLong("Tên nhóm thông số", 200));
    }
}

public class CreateSpecAttributeRequestValidator : AbstractValidator<CreateSpecAttributeRequest>
{
    public CreateSpecAttributeRequestValidator()
    {
        RuleFor(x => x.Key)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Key kỹ thuật"))
            .MaximumLength(100).WithMessage(VietnameseValidationMessages.StringTooLong("Key kỹ thuật", 100))
            .Matches("^[a-z0-9_]+$").WithMessage("Key kỹ thuật chỉ gồm chữ thường, số và dấu gạch dưới (vd: cpu_socket)");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên thuộc tính"))
            .MaximumLength(200).WithMessage(VietnameseValidationMessages.StringTooLong("Tên thuộc tính", 200));
    }
}

public class UpdateSpecAttributeRequestValidator : AbstractValidator<UpdateSpecAttributeRequest>
{
    public UpdateSpecAttributeRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên thuộc tính"))
            .MaximumLength(200).WithMessage(VietnameseValidationMessages.StringTooLong("Tên thuộc tính", 200));
    }
}

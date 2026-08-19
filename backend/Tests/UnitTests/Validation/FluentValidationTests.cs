using BuildingBlocks.Validation;
using FluentAssertions;
using FluentValidation;
using Xunit;

namespace UnitTests.Validation;

/// <summary>
/// Kiểm tra validation framework — đảm bảo messages tiếng Việt, format lỗi chuẩn.
/// </summary>
public class FluentValidationTests
{
    private class TestRequest
    {
        public string Name { get; set; }
        public string Email { get; set; }
        public decimal Amount { get; set; }
    }

    private class TestRequestValidator : AbstractValidator<TestRequest>
    {
        public TestRequestValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Tên"))
                .Length(2, 100).WithMessage(VietnameseValidationMessages.StringTooShort("Tên", 2));

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Email"))
                .EmailAddress().WithMessage(VietnameseValidationMessages.InvalidEmail("Email"));

            RuleFor(x => x.Amount)
                .GreaterThan(0).WithMessage(VietnameseValidationMessages.NumberTooSmall("Số tiền", 0));
        }
    }

    [Fact]
    public void Validator_RequiredFieldEmpty_ReturnsVietnameseError()
    {
        var validator = new TestRequestValidator();
        var request = new TestRequest { Name = "", Email = "test@example.com", Amount = 100 };

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Count.Should().BeGreaterThan(0);
        result.Errors.First().ErrorMessage.Should().Contain("bắt buộc");
    }

    [Fact]
    public void Validator_MultipleErrors_ReturnsAllErrors()
    {
        var validator = new TestRequestValidator();
        var request = new TestRequest { Name = "A", Email = "invalid-email", Amount = -10 };

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().HaveCount(3);
    }

    [Fact]
    public void Validator_ValidRequest_ReturnsSuccess()
    {
        var validator = new TestRequestValidator();
        var request = new TestRequest { Name = "John Doe", Email = "john@example.com", Amount = 100 };

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public void VietnameseValidationMessages_RequiredField_ReturnsVietnamesMessage()
    {
        var message = VietnameseValidationMessages.RequiredField("Tên khách hàng");

        message.Should().Contain("Tên khách hàng");
        message.Should().Contain("bắt buộc");
    }

    [Fact]
    public void VietnameseValidationMessages_InvalidPhone_ReturnsVietnamesMessage()
    {
        var message = VietnameseValidationMessages.InvalidPhone("Số điện thoại");

        message.Should().Contain("Số điện thoại");
        message.Should().Contain("không hợp lệ");
    }

    [Fact]
    public void VietnameseValidationMessages_StringTooShort_ReturnsVietnamesMessage()
    {
        var message = VietnameseValidationMessages.StringTooShort("Mật khẩu", 6);

        message.Should().Contain("Mật khẩu");
        message.Should().Contain("6");
    }

    [Fact]
    public void VietnameseValidationMessages_NumberTooSmall_ReturnsVietnamesMessage()
    {
        var message = VietnameseValidationMessages.NumberTooSmall("Giá", 0);

        message.Should().Contain("Giá");
        message.Should().Contain("0");
    }

    [Fact]
    public void VietnameseValidationMessages_DuplicateItem_ReturnsVietnamesMessage()
    {
        var message = VietnameseValidationMessages.DuplicateItem("Mã sản phẩm");

        message.Should().Contain("Mã sản phẩm");
        message.Should().Contain("trùng");
    }

    [Fact]
    public void ValidationResult_ErrorFormat_FollowsStandard()
    {
        var validator = new TestRequestValidator();
        var request = new TestRequest { Name = "", Email = "invalid", Amount = 0 };

        var result = validator.Validate(request);

        result.Errors.Should().AllSatisfy(e =>
        {
            e.PropertyName.Should().NotBeNullOrEmpty();
            e.ErrorMessage.Should().NotBeNullOrEmpty();
            e.ErrorMessage.Should().NotContain("{");  // No template vars left
        });
    }
}

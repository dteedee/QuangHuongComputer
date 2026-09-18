using BuildingBlocks.Validation;
using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace UnitTests.Kernel;

/// <summary>
/// <c>WithValidation&lt;T&gt;()</c> is a PROMISE that the endpoint validates its body. With no
/// registered validator the filter silently forwards everything, so the endpoint stops validating and
/// nothing says so - which is how this codebase reached ~4% validation coverage while every call site
/// looked validated. The guard turns that into a startup failure.
/// </summary>
public class ValidationContractTests
{
    private sealed class OrderDraft
    {
        public string Sku { get; set; } = string.Empty;
    }

    private sealed class OrderDraftValidator : AbstractValidator<OrderDraft>
    {
        public OrderDraftValidator() => RuleFor(x => x.Sku).NotEmpty().WithMessage("Mã SKU là bắt buộc.");
    }

    private sealed class UnvalidatedDraft
    {
        public string Anything { get; set; } = string.Empty;
    }

    [Fact]
    public async Task ThieuValidator_ThiNemLoiNgayLucKhoiDong_VaNeuDichLoaiThieu()
    {
        ValidationContractRegistry.Register(typeof(UnvalidatedDraft));
        var services = new ServiceCollection().BuildServiceProvider();
        var guard = new ValidatorRegistrationGuard(services, NullLogger<ValidatorRegistrationGuard>.Instance);

        var act = () => guard.StartAsync(CancellationToken.None);

        (await act.Should().ThrowAsync<InvalidOperationException>())
            .Which.Message.Should().Contain(nameof(UnvalidatedDraft));
    }

    /// <summary>
    /// Bắt lỗi thật: <c>IValidator&lt;T&gt;</c> có trong CẢ FluentValidation lẫn
    /// BuildingBlocks.Validation, mà guard nằm trong namespace thứ hai - nếu tra cứu bằng tên không
    /// đủ điều kiện thì MỌI kiểu đều bị coi là thiếu validator và API không khởi động được.
    /// </summary>
    [Fact]
    public void CoValidator_ThiKhongConThieu()
    {
        ValidationContractRegistry.Register(typeof(OrderDraft));
        var services = new ServiceCollection()
            .AddScoped<FluentValidation.IValidator<OrderDraft>, OrderDraftValidator>()
            .BuildServiceProvider();

        ValidationContractRegistry.FindMissingValidators(services)
            .Should().NotContain(typeof(OrderDraft));
    }

    [Fact]
    public void DangKyHaiLan_ChiGhiMotLan()
    {
        ValidationContractRegistry.Register(typeof(OrderDraft));
        ValidationContractRegistry.Register(typeof(OrderDraft));

        ValidationContractRegistry.RequestedTypes.Count(t => t == typeof(OrderDraft)).Should().Be(1);
    }

    /// <summary>
    /// FluentValidation đặt mã lỗi theo tên luật ("NotEmptyValidator"), và đó là thứ frontend rẽ
    /// nhánh; thông điệp tiếng Việt chỉ để hiển thị.
    /// </summary>
    [Fact]
    public async Task LoiValidation_CoDuField_Code_Message()
    {
        var result = await new OrderDraftValidator().ValidateAsync(new OrderDraft { Sku = "" });

        result.IsValid.Should().BeFalse();
        var failure = result.Errors[0];
        failure.PropertyName.Should().Be("Sku");
        failure.ErrorCode.Should().Be("NotEmptyValidator");
        failure.ErrorMessage.Should().Be("Mã SKU là bắt buộc.");
    }
}

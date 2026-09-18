using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Payments.Application;
using Payments.Application.Configuration;
using Payments.Domain;
using Xunit;

namespace UnitTests.Domain.Payments;

/// <summary>
/// W2-4 / D04 mục 2 tầng 0b + mục 4.
///
/// 1. Chuyển khoản ngân hàng bật được bằng `Payment:BankTransfer:*` mà KHÔNG cần tài khoản SePay
///    (SePay chỉ là kênh tự động xác nhận). Khoá `Payment:SePay:*` cũ vẫn được chấp nhận làm bí danh.
/// 2. Gợi ý đối soát theo số tiền chỉ là GỢI Ý và chỉ khi có ĐÚNG MỘT ứng viên — không bao giờ
///    tự xác nhận (đây là luật D04 còn lại sau khi chiến lược khớp "chỉ theo số tiền" bị xoá).
/// </summary>
public class BankTransferConfigAndSuggestionTests
{
    private sealed class FakeEnv : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "Tests";
        public string ContentRootPath { get; set; } = "/";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static PaymentConfigGuard Guard(Dictionary<string, string?> values)
        => new(new ConfigurationBuilder().AddInMemoryCollection(values).Build(),
            new FakeEnv(), NullLogger<PaymentConfigGuard>.Instance);

    [Fact]
    public void DuKhoaBankTransfer_ThiBatMaKhongCanSePay()
    {
        var guard = Guard(new Dictionary<string, string?>
        {
            ["Payment:BankTransfer:Enabled"] = "true",
            ["Payment:BankTransfer:BankBin"] = "970422",
            ["Payment:BankTransfer:AccountNumber"] = "0123456789",
            ["Payment:BankTransfer:AccountName"] = "CONG TY QUANG HUONG"
        });

        guard.IsAvailable(PaymentProvider.SePay).Should().BeTrue();
        guard.AvailableMethods().Select(m => m.Code).Should().Contain("bank_transfer");
        guard.HasWebhookSecret(PaymentProvider.SePay).Should().BeFalse("chưa bật tầng tự động xác nhận");
    }

    [Fact]
    public void ThieuTenChuTaiKhoan_ThiTat()
    {
        var guard = Guard(new Dictionary<string, string?>
        {
            ["Payment:BankTransfer:Enabled"] = "true",
            ["Payment:BankTransfer:BankBin"] = "970422",
            ["Payment:BankTransfer:AccountNumber"] = "0123456789"
        });

        guard.IsAvailable(PaymentProvider.SePay).Should().BeFalse();
        guard.Evaluate(PaymentProvider.SePay).MissingKeys
            .Should().Contain("Payment:BankTransfer:AccountName");
    }

    [Fact]
    public void ThieuKhoa_ThiLietKeCaTenMoiVaTenCu()
    {
        var missing = Guard(new Dictionary<string, string?> { ["Payment:BankTransfer:Enabled"] = "true" })
            .Evaluate(PaymentProvider.SePay).MissingKeys;

        missing.Should().Contain("Payment:BankTransfer:AccountNumber");
        missing.Should().Contain("Payment:SePay:AccountNumber", "cấu hình cũ vẫn dùng được, phải nói ra");
    }

    [Fact]
    public void KhoaCu_VanDuocChapNhan()
    {
        var guard = Guard(new Dictionary<string, string?>
        {
            ["Payment:SePay:Enabled"] = "true",
            ["Payment:SePay:BankCode"] = "970422",
            ["Payment:SePay:AccountNumber"] = "0123456789",
            ["Payment:BankTransfer:AccountName"] = "CONG TY QUANG HUONG"
        });

        guard.IsAvailable(PaymentProvider.SePay).Should().BeTrue();
    }

    [Fact]
    public void TraGop_ChiHienKhiDanhSachDoiTacKhacRong()
    {
        Guard(new Dictionary<string, string?>())
            .IsAvailable(PaymentProvider.Installment).Should().BeFalse();

        var withPartner = Guard(new Dictionary<string, string?>
        {
            ["Sales:Installment:Partners:0:Name"] = "FE Credit",
            ["Sales:Installment:Partners:0:Terms"] = "6,9,12"
        });
        withPartner.IsAvailable(PaymentProvider.Installment).Should().BeTrue();
        withPartner.Evaluate(PaymentProvider.Installment).IsDirect
            .Should().BeFalse("trả góp là lead-mode, không tạo lệnh thu tiền");
    }

    // ---------------------------------------------------------------- gợi ý đối soát

    private static PaymentIntent Pending(decimal amount, DateTime? expiresAt = null)
    {
        var p = PaymentIntent.Create(Guid.NewGuid(), amount, "VND", PaymentProvider.SePay, Guid.NewGuid().ToString());
        if (expiresAt is not null) p.SetExpiry(expiresAt.Value);
        return p;
    }

    [Fact]
    public void GoiY_ChiKhiDungMotUngVien()
    {
        var now = DateTime.UtcNow;
        var only = Pending(2_000_000m, now.AddHours(12));

        SePayPaymentMatcher.Suggest(new[] { only }, 2_000_000m, now).Should().Be(only);

        var two = new[] { Pending(2_000_000m, now.AddHours(12)), Pending(2_000_000m, now.AddHours(12)) };
        SePayPaymentMatcher.Suggest(two, 2_000_000m, now)
            .Should().BeNull("hai đơn cùng số tiền ⇒ mơ hồ, để người quyết định");
    }

    [Fact]
    public void GoiY_BoQuaIntentDaHetHan()
    {
        var now = DateTime.UtcNow;
        var expired = Pending(2_000_000m, now.AddHours(-1));
        SePayPaymentMatcher.Suggest(new[] { expired }, 2_000_000m, now).Should().BeNull();
    }

    [Fact]
    public void KhopTuDong_VanBatBuocDungMaThanhToan()
    {
        var now = DateTime.UtcNow;
        var intent = Pending(2_000_000m, now.AddHours(12));

        // Trùng tiền nhưng nội dung không có mã ⇒ KHÔNG khớp tự động.
        SePayPaymentMatcher.Match(new[] { intent }, 2_000_000m, "CHUYEN TIEN", null, null)
            .Should().BeNull();

        intent.SetPaymentCode("QH34679ACD");
        SePayPaymentMatcher.Match(new[] { intent }, 2_000_000m, "CK QH34679ACD", null, null)
            .Should().Be(intent);
    }

    [Fact]
    public void KhopTuDong_LechSoTien_ThiKhongKhop()
    {
        var intent = Pending(2_000_000m);
        intent.SetPaymentCode("QH34679ACD");
        SePayPaymentMatcher.Match(new[] { intent }, 1_999_000m, "CK QH34679ACD", null, null)
            .Should().BeNull();
    }
}

using FluentAssertions;
using Payments.Application;
using Payments.Domain;
using Xunit;

namespace UnitTests.Domain.Payments;

/// <summary>
/// W0-10 / D04 — chiến lược khớp SePay. "Chiến lược 3" (khớp CHỈ theo số tiền khi đúng một intent
/// Pending trùng tiền) đã bị xoá: một khoản tiền vào bất kỳ trùng số tiền từng xác nhận nhầm
/// đơn của người khác.
/// </summary>
public class SePayPaymentMatcherTests
{
    private static PaymentIntent Intent(decimal amount, string? code = null)
    {
        var p = PaymentIntent.Create(Guid.NewGuid(), amount, "VND", PaymentProvider.SePay, Guid.NewGuid().ToString());
        if (code is not null) p.SetExternalId("SEPAY-x", code);
        return p;
    }

    [Fact]
    public void KhopTheoMaDon8KyTu_VaDungSoTien()
    {
        var p = Intent(290_000m);
        var short8 = p.OrderId.ToString("N")[..8].ToUpperInvariant();

        SePayPaymentMatcher.Match(new[] { p }, 290_000m, $"Thanh toan {short8}", null, null)
            .Should().BeSameAs(p);
    }

    [Fact]
    public void KhopTheoMaThanhToanSinhRieng()
    {
        var p = Intent(290_000m, "QH7F3AC91B");
        SePayPaymentMatcher.Match(new[] { p }, 290_000m, "CT DEN QH7F3AC91B", null, null)
            .Should().BeSameAs(p);
    }

    [Fact]
    public void DungMaNhungSaiSoTien_KhongKhop()
    {
        var p = Intent(290_000m);
        var short8 = p.OrderId.ToString("N")[..8].ToUpperInvariant();

        SePayPaymentMatcher.Match(new[] { p }, 250_000m, $"Thanh toan {short8}", null, null)
            .Should().BeNull();
    }

    [Fact]
    public void ChiTrungSoTien_KhongCoMa_KhongKhop()
    {
        // Chiến lược 3 cũ sẽ khớp ở đây — nay phải trả null và vào hàng "Chưa gán".
        var p = Intent(290_000m);
        SePayPaymentMatcher.Match(new[] { p }, 290_000m, "CT DEN TU NGUYEN VAN A", null, null)
            .Should().BeNull();
    }

    [Fact]
    public void NoiDungRong_KhongKhop()
    {
        var p = Intent(290_000m);
        SePayPaymentMatcher.Match(new[] { p }, 290_000m, "", null, null).Should().BeNull();
    }

    [Fact]
    public void SoTienKhongDuong_KhongKhop()
    {
        var p = Intent(290_000m);
        var short8 = p.OrderId.ToString("N")[..8].ToUpperInvariant();
        SePayPaymentMatcher.Match(new[] { p }, 0m, short8, null, null).Should().BeNull();
    }

    [Fact]
    public void NhieuIntentCungSoTien_ChiKhopDungMa()
    {
        var a = Intent(290_000m);
        var b = Intent(290_000m);
        var short8B = b.OrderId.ToString("N")[..8].ToUpperInvariant();

        SePayPaymentMatcher.Match(new[] { a, b }, 290_000m, $"CK {short8B}", null, null)
            .Should().BeSameAs(b);
    }

    [Fact]
    public void KhopTuTruongCode_VaDescription()
    {
        var p = Intent(290_000m);
        var short8 = p.OrderId.ToString("N")[..8].ToUpperInvariant();

        SePayPaymentMatcher.Match(new[] { p }, 290_000m, null, short8, null).Should().BeSameAs(p);
        SePayPaymentMatcher.Match(new[] { p }, 290_000m, null, null, $"noi dung {short8}").Should().BeSameAs(p);
    }
}

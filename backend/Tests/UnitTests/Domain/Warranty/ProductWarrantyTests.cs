using FluentAssertions;
using Warranty.Domain;
using Xunit;

namespace UnitTests.Domain.Warranty;

/// <summary>
/// Bảo hành sản phẩm: ExpirationDate = PurchaseDate + số tháng bảo hành.
/// IsValid() = còn Active VÀ chưa quá hạn tại thời điểm hiện tại.
/// Void/Expire tách biệt trạng thái; sản phẩm Voided KHÔNG còn hiệu lực bảo hành.
/// </summary>
public class ProductWarrantyTests
{
    private static ProductWarranty NewWarranty(DateTime purchaseDate, int months = 24)
        => new ProductWarranty(
            productId: Guid.NewGuid(),
            serialNumber: "SN-TEST-001",
            customerId: Guid.NewGuid(),
            purchaseDate: purchaseDate,
            warrantyPeriodMonths: months);

    [Fact]
    public void KhoiTao_TinhDungNgayHetHan_CongDungSoThang()
    {
        var purchase = new DateTime(2026, 1, 15, 0, 0, 0, DateTimeKind.Utc);

        var w = NewWarranty(purchase, months: 24);

        w.ExpirationDate.Should().Be(new DateTime(2028, 1, 15, 0, 0, 0, DateTimeKind.Utc));
        w.WarrantyPeriodMonths.Should().Be(24);
        w.Status.Should().Be(WarrantyStatus.Active);
    }

    [Fact]
    public void KhoiTao_MuaCuoiThang_XuLyDungNgayThangNgan()
    {
        // 31/1 + 1 tháng: .NET AddMonths trả về 28/2 (hoặc 29/2 nếu năm nhuận)
        var purchase = new DateTime(2026, 1, 31, 0, 0, 0, DateTimeKind.Utc);

        var w = NewWarranty(purchase, months: 1);

        w.ExpirationDate.Should().Be(new DateTime(2026, 2, 28, 0, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public void KhoiTao_BaoHanh0Thang_NgayHetHanBangNgayMua()
    {
        var purchase = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);

        var w = NewWarranty(purchase, months: 0);

        w.ExpirationDate.Should().Be(purchase);
    }

    [Fact]
    public void IsValid_BaoHanhMoiConDaiHan_TraVeTrue()
    {
        var purchase = DateTime.UtcNow.AddDays(-30);

        var w = NewWarranty(purchase, months: 24);

        w.IsValid().Should().BeTrue();
    }

    [Fact]
    public void IsValid_DaQuaNgayHetHan_TraVeFalse()
    {
        // Mua 3 năm trước, bảo hành 12 tháng -> đã quá hạn 2 năm
        var purchase = DateTime.UtcNow.AddYears(-3);

        var w = NewWarranty(purchase, months: 12);

        w.IsValid().Should().BeFalse();
    }

    [Fact]
    public void IsValid_TrangThaiVoided_TraVeFalse_DuChuaHetHan()
    {
        var w = NewWarranty(DateTime.UtcNow.AddDays(-1), months: 24);
        w.IsValid().Should().BeTrue();

        w.Void("Khách vi phạm điều khoản");

        w.Status.Should().Be(WarrantyStatus.Voided);
        w.IsValid().Should().BeFalse();
    }

    [Fact]
    public void IsValid_TrangThaiExpired_TraVeFalse()
    {
        var w = NewWarranty(DateTime.UtcNow.AddDays(-1), months: 24);

        w.Expire();

        w.Status.Should().Be(WarrantyStatus.Expired);
        w.IsValid().Should().BeFalse();
    }

    [Fact]
    public void Void_LuuLyDoVaoNotes()
    {
        var w = NewWarranty(DateTime.UtcNow, months: 24);

        w.Void("Serial không khớp");

        w.Notes.Should().Be("Serial không khớp");
        w.Status.Should().Be(WarrantyStatus.Voided);
    }

    [Fact]
    public void KhoiTao_CoOrderNumber_LuuLai()
    {
        var w = new ProductWarranty(
            productId: Guid.NewGuid(),
            serialNumber: "SN-002",
            customerId: Guid.NewGuid(),
            purchaseDate: DateTime.UtcNow,
            warrantyPeriodMonths: 12,
            orderNumber: "QH-2026-0001");

        w.OrderNumber.Should().Be("QH-2026-0001");
    }

    [Fact]
    public void IsValid_TaiDungThoiDiemHetHan_VanConHieuLuc()
    {
        // Bảo hành hết vào tương lai gần -> vẫn nên hợp lệ ngay bây giờ
        var purchase = DateTime.UtcNow.AddMonths(-12).AddSeconds(60);
        var w = NewWarranty(purchase, months: 12);

        w.IsValid().Should().BeTrue();
        (w.ExpirationDate > DateTime.UtcNow).Should().BeTrue();
    }
}

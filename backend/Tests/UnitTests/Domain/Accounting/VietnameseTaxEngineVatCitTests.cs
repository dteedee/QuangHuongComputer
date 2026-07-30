using Accounting.Domain;
using FluentAssertions;
using Xunit;

namespace UnitTests.Domain.Accounting;

/// <summary>
/// VAT (GTGT) 8% hàng hóa thông thường / 10% viễn thông-tài chính-BĐS / 0% xuất khẩu / miễn thuế.
/// ExtractVat phải là phép nghịch đảo đúng của CalculateVat.
/// CIT (TNDN) 20% trên thu nhập chịu thuế.
/// </summary>
public class VietnameseTaxEngineVatCitTests
{
    [Theory]
    [InlineData(10_000_000L, 800_000L)]
    [InlineData(15_990_000L, 1_279_200L)]
    [InlineData(999_000L, 79_920L)]
    public void CalculateVat_ThueSuat8PhanTram_TinhDungTienThue(long price, long expectedVat)
    {
        var result = VietnameseTaxEngine.CalculateVat(price, VietnameseTaxEngine.VatStandard);

        result.VatAmount.Should().Be(expectedVat);
        result.PriceAfterVat.Should().Be(price + expectedVat);
        result.IsExempt.Should().BeFalse();
    }

    [Fact]
    public void CalculateVat_ThueSuat10PhanTram_ChoVienThongTaiChinh()
    {
        var result = VietnameseTaxEngine.CalculateVat(10_000_000m, VietnameseTaxEngine.VatTelecom);

        result.VatAmount.Should().Be(1_000_000m);
        result.PriceAfterVat.Should().Be(11_000_000m);
    }

    [Fact]
    public void CalculateVat_ThueSuat0PhanTram_XuatKhau_KhongCoThueNhungKhongMienThue()
    {
        var result = VietnameseTaxEngine.CalculateVat(10_000_000m, VietnameseTaxEngine.VatExport);

        result.VatAmount.Should().Be(0);
        result.PriceAfterVat.Should().Be(10_000_000m);
        result.IsExempt.Should().BeFalse(); // 0% khác với miễn thuế về mặt kê khai
    }

    [Fact]
    public void CalculateVat_MienThue_DanhDauIsExempt()
    {
        var result = VietnameseTaxEngine.CalculateVat(10_000_000m, VietnameseTaxEngine.VatExempt);

        result.VatAmount.Should().Be(0);
        result.VatRate.Should().Be(0);
        result.IsExempt.Should().BeTrue();
    }

    [Fact]
    public void CalculateVat_GiaBangKhong_TraVeKhong()
    {
        var result = VietnameseTaxEngine.CalculateVat(0m);

        result.VatAmount.Should().Be(0);
        result.PriceAfterVat.Should().Be(0);
    }

    [Theory]
    [InlineData("vien-thong", 0.10)]
    [InlineData("tai-chinh", 0.10)]
    [InlineData("bat-dong-san", 0.10)]
    [InlineData("laptop", 0.08)]
    [InlineData("linh-kien-may-tinh", 0.08)]
    [InlineData(null, 0.08)]
    public void VatRateForCategory_TraVeDungThueSuatTheoNganhHang(string? slug, double expected)
    {
        VietnameseTaxEngine.VatRateForCategory(slug).Should().Be((decimal)expected);
    }

    [Fact]
    public void ExtractVat_TachThueTuGiaDaBaoGomVat_8PhanTram()
    {
        var result = VietnameseTaxEngine.ExtractVat(10_800_000m, VietnameseTaxEngine.VatStandard);

        result.PriceBeforeVat.Should().Be(10_000_000m);
        result.VatAmount.Should().Be(800_000m);
        result.PriceAfterVat.Should().Be(10_800_000m);
    }

    [Fact]
    public void ExtractVat_TachThueTuGiaDaBaoGomVat_10PhanTram()
    {
        var result = VietnameseTaxEngine.ExtractVat(11_000_000m, VietnameseTaxEngine.VatTelecom);

        result.PriceBeforeVat.Should().Be(10_000_000m);
        result.VatAmount.Should().Be(1_000_000m);
    }

    [Theory]
    [InlineData(10_000_000L)]
    [InlineData(15_990_000L)]
    [InlineData(12_345_678L)]
    [InlineData(999_000L)]
    [InlineData(1L)]
    public void ExtractVat_LaPhepNghichDaoCuaCalculateVat_8PhanTram(long priceBeforeVat)
    {
        var forward = VietnameseTaxEngine.CalculateVat(priceBeforeVat, VietnameseTaxEngine.VatStandard);
        var backward = VietnameseTaxEngine.ExtractVat(forward.PriceAfterVat, VietnameseTaxEngine.VatStandard);

        backward.PriceBeforeVat.Should().Be(priceBeforeVat);
        backward.VatAmount.Should().Be(forward.VatAmount);
    }

    [Theory]
    [InlineData(10_000_000L)]
    [InlineData(23_450_000L)]
    [InlineData(333_333L)]
    public void ExtractVat_LaPhepNghichDaoCuaCalculateVat_10PhanTram(long priceBeforeVat)
    {
        var forward = VietnameseTaxEngine.CalculateVat(priceBeforeVat, VietnameseTaxEngine.VatTelecom);
        var backward = VietnameseTaxEngine.ExtractVat(forward.PriceAfterVat, VietnameseTaxEngine.VatTelecom);

        backward.PriceBeforeVat.Should().Be(priceBeforeVat);
        backward.VatAmount.Should().Be(forward.VatAmount);
    }

    [Fact]
    public void ExtractVat_ThueSuat0_GiuNguyenGia()
    {
        var result = VietnameseTaxEngine.ExtractVat(10_000_000m, 0m);

        result.PriceBeforeVat.Should().Be(10_000_000m);
        result.VatAmount.Should().Be(0);
        result.IsExempt.Should().BeFalse();
    }

    [Fact]
    public void ExtractVat_MienThue_GiuNguyenGiaVaDanhDauMienThue()
    {
        var result = VietnameseTaxEngine.ExtractVat(10_000_000m, VietnameseTaxEngine.VatExempt);

        result.PriceBeforeVat.Should().Be(10_000_000m);
        result.IsExempt.Should().BeTrue();
    }

    [Fact]
    public void CalculateCit_CoLai_Nop20PhanTram()
    {
        var result = VietnameseTaxEngine.CalculateCit(100_000_000m, 60_000_000m);

        result.TaxableIncome.Should().Be(40_000_000m);
        result.TaxRate.Should().Be(0.20m);
        result.CitAmount.Should().Be(8_000_000m);
    }

    [Fact]
    public void CalculateCit_KinhDoanhLo_KhongNopThue()
    {
        var result = VietnameseTaxEngine.CalculateCit(50_000_000m, 80_000_000m);

        result.TaxableIncome.Should().Be(0);
        result.CitAmount.Should().Be(0);
    }

    [Fact]
    public void CalculateCit_HoaVon_KhongNopThue()
    {
        var result = VietnameseTaxEngine.CalculateCit(80_000_000m, 80_000_000m);

        result.CitAmount.Should().Be(0);
    }
}

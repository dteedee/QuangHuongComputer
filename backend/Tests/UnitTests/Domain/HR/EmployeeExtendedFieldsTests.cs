using FluentAssertions;
using HR.Domain;
using Xunit;

namespace UnitTests.Domain.HR;

/// <summary>
/// Phase 06 A — trường mở rộng Employee: TaxCode/SIN/IdCard/BankInfo/StoreId/NumberOfDependents.
/// Validate độ dài chuỗi số theo chuẩn VN.
/// </summary>
public class EmployeeExtendedFieldsTests
{
    private static Employee NewEmployee() => new(
        "Nguyen Van A", "a@qh.vn", "0900000000", "Kinh doanh", "NV bán hàng",
        new DateTime(2024, 1, 1), 15_000_000m);

    [Fact]
    public void SetTaxCode_10ChuSo_DuocChap()
    {
        var e = NewEmployee();
        e.SetTaxCode("0123456789");
        e.TaxCode.Should().Be("0123456789");
    }

    [Fact]
    public void SetTaxCode_13ChuSo_DuocChap_MSTChiNhanh()
    {
        var e = NewEmployee();
        e.SetTaxCode("0123456789012");
        e.TaxCode.Should().Be("0123456789012");
    }

    [Theory]
    [InlineData("12345")]      // quá ngắn
    [InlineData("12345678901")] // 11 - không hợp lệ
    [InlineData("abcdefghij")]  // không phải chữ số
    public void SetTaxCode_KhongHopLe_NemLoi(string tc)
    {
        var e = NewEmployee();
        var act = () => e.SetTaxCode(tc);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void SetTaxCode_Null_DuocPhep_XoaMST()
    {
        var e = NewEmployee();
        e.SetTaxCode("0123456789");
        e.SetTaxCode(null);
        e.TaxCode.Should().BeNull();
    }

    [Fact]
    public void SetSocialInsuranceNumber_10ChuSo_DuocChap()
    {
        var e = NewEmployee();
        e.SetSocialInsuranceNumber("1234567890");
        e.SocialInsuranceNumber.Should().Be("1234567890");
    }

    [Theory]
    [InlineData("123456789")]     // 9 số
    [InlineData("12345678901")]   // 11 số
    [InlineData("12345abc90")]    // có chữ
    public void SetSocialInsuranceNumber_KhongHopLe_NemLoi(string sin)
    {
        var e = NewEmployee();
        var act = () => e.SetSocialInsuranceNumber(sin);
        act.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData("123456789")]        // 9 số CMND
    [InlineData("012345678912")]     // 12 số CCCD
    public void SetIdCard_9Hoac12ChuSo_DuocChap(string id)
    {
        var e = NewEmployee();
        e.SetIdCard(id);
        e.IdCardNumber.Should().Be(id);
    }

    [Theory]
    [InlineData("12345")]
    [InlineData("1234567890")]
    [InlineData("12345678")]
    public void SetIdCard_KhongHopLe_NemLoi(string id)
    {
        var e = NewEmployee();
        var act = () => e.SetIdCard(id);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void SetIdCard_KemIssueDateVaPlace_LuuDayDu()
    {
        var e = NewEmployee();
        var d = new DateTime(2020, 5, 20);
        e.SetIdCard("012345678912", d, "Cục QLHC về TTXH");

        e.IdCardIssueDate.Should().Be(d);
        e.IdCardIssuePlace.Should().Be("Cục QLHC về TTXH");
    }

    [Fact]
    public void UpdateBankInfo_CoTenNH_MaKhongCoSoTK_NemLoi()
    {
        var e = NewEmployee();
        var act = () => e.UpdateBankInfo("", "Vietcombank");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void UpdateBankInfo_DuySoTK_KhongCoTenNH_DuocPhep_TruongHopBienBanTay()
    {
        var e = NewEmployee();
        var act = () => e.UpdateBankInfo("1234567890", "");
        act.Should().NotThrow();
        e.BankAccount.Should().Be("1234567890");
    }

    [Fact]
    public void AssignStore_LuuStoreId()
    {
        var e = NewEmployee();
        var sid = Guid.NewGuid();
        e.AssignStore(sid);
        e.StoreId.Should().Be(sid);
    }

    [Fact]
    public void RefreshDependentCount_LuuSoNguoi()
    {
        var e = NewEmployee();
        e.RefreshDependentCount(3);
        e.NumberOfDependents.Should().Be(3);
    }

    [Fact]
    public void RefreshDependentCount_SoAm_NemLoi()
    {
        var e = NewEmployee();
        var act = () => e.RefreshDependentCount(-1);
        act.Should().Throw<ArgumentException>();
    }
}

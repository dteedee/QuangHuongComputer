using Catalog.Application.Specifications;
using FluentAssertions;
using Xunit;

namespace UnitTests.Domain.Catalog;

/// <summary>
/// SpecificationFilterBuilder parse operator từ chuỗi query:
/// - "16-32" (2 số) → Between
/// - "i5,i7" (dấu phẩy) → In
/// - đơn lẻ → Eq
/// </summary>
public class SpecificationFilterBuilderTests
{
    [Theory]
    [InlineData("16-32", FilterOperator.Between)]
    [InlineData("100-200", FilterOperator.Between)]
    [InlineData("0-1", FilterOperator.Between)]
    public void ParseOperator_ChuoiDangSoDenSo_TraVeBetween(string input, FilterOperator expected)
    {
        SpecificationFilterBuilder.ParseOperator(input).Should().Be(expected);
    }

    [Theory]
    [InlineData("i5,i7", FilterOperator.In)]
    [InlineData("red,blue,green", FilterOperator.In)]
    public void ParseOperator_ChuoiCoDauPhay_TraVeIn(string input, FilterOperator expected)
    {
        SpecificationFilterBuilder.ParseOperator(input).Should().Be(expected);
    }

    [Theory]
    [InlineData("i5")]
    [InlineData("16")]
    [InlineData("true")]
    [InlineData("red")]
    public void ParseOperator_ChuoiDon_TraVeEq(string input)
    {
        SpecificationFilterBuilder.ParseOperator(input).Should().Be(FilterOperator.Eq);
    }

    /// <summary>
    /// "intel-core" chứa dấu "-" nhưng KHÔNG phải hai số → không được xem là Between.
    /// </summary>
    [Fact]
    public void ParseOperator_TextCoGachNganKhongPhaiSo_KhongDuocXemLaBetween()
    {
        SpecificationFilterBuilder.ParseOperator("intel-core").Should().Be(FilterOperator.Eq);
    }

    [Fact]
    public void ParseOperator_ChuoiRong_TraVeEq()
    {
        SpecificationFilterBuilder.ParseOperator("").Should().Be(FilterOperator.Eq);
    }
}

using System.Text;
using BuildingBlocks.Spreadsheet;
using Content.Application.Redirects;
using FluentAssertions;
using Xunit;

namespace UnitTests.Kernel;

/// <summary>CSV đi qua CÙNG pipeline nhập với XLSX (bảng chuyển hướng URL là người dùng đầu tiên).</summary>
public class CsvImportPipelineTests
{
    private static MemoryStream Utf8(string text) => new(Encoding.UTF8.GetBytes(text));

    [Fact]
    public void Parse_ChuoiCoNgoacKep_XuongDong_VaDauChamPhay()
    {
        var rows = CsvTable.Parse("﻿a;b;c\r\n\"x;1\";\"say \"\"hi\"\"\";\"dòng\nhai\"\r\n");

        rows.Should().HaveCount(2);
        rows[0].Should().Equal("a", "b", "c");
        rows[1].Should().Equal("x;1", "say \"hi\"", "dòng\nhai");
    }

    [Fact]
    public void Write_CoBom_VaVoHieuHoaCongThuc()
    {
        var bytes = CsvTable.Write(new[] { new[] { "/a", "=HYPERLINK(\"x\")" } });

        bytes.Take(3).Should().Equal(Encoding.UTF8.GetPreamble());
        var text = Encoding.UTF8.GetString(bytes[3..]);
        text.Should().Be("\"/a\",\"'=HYPERLINK(\"\"x\"\")\"\r\n");
        CsvTable.Parse(text)[0][1].Should().StartWith("'=");
    }

    [Fact]
    public void ReadCsv_DungLuatCot_BaoLoiTheoDong()
    {
        var pipeline = new ExcelImportPipeline<UrlRedirectImportRow>(UrlRedirectImportColumns.Build());
        var csv = string.Join("\n",
            string.Join(",", UrlRedirectImportColumns.Headers),
            "/cu-1.html,/san-pham/moi,301,,1",
            ",/thieu-nguon,,,",
            "/cu-2.html,,410,het hang,0",
            "/cu-3.html,/x,307,,");

        var result = pipeline.ReadCsv(Utf8(csv));

        result.TotalRows.Should().Be(4);
        result.Rows.Should().HaveCount(2);
        result.Rows[1].StatusCode.Should().Be(410);
        result.Rows[1].IsActive.Should().BeFalse();
        result.Errors.Select(e => e.RowNumber).Should().Equal(3, 5);
    }

    [Fact]
    public void ReadCsv_ThieuCot_LaLoiCauTrucTep()
    {
        var pipeline = new ExcelImportPipeline<UrlRedirectImportRow>(UrlRedirectImportColumns.Build());

        var act = () => pipeline.ReadCsv(Utf8("from,to\n/a,/b"));

        act.Should().Throw<InvalidDataException>().WithMessage("*thiếu cột*");
    }

    [Fact]
    public void ReadCsv_KhongPhaiUtf8_BiTuChoi()
    {
        var pipeline = new ExcelImportPipeline<UrlRedirectImportRow>(UrlRedirectImportColumns.Build());
        var latin1 = new MemoryStream(new byte[] { 0x2F, 0xE0, 0xE1, 0x0A });

        var act = () => pipeline.ReadCsv(latin1);

        act.Should().Throw<InvalidDataException>().WithMessage("*UTF-8*");
    }
}

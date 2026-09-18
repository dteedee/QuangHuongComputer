using BuildingBlocks.Spreadsheet;
using ClosedXML.Excel;
using FluentAssertions;
using Xunit;

namespace UnitTests.Kernel;

/// <summary>
/// The one bulk-import path (D10). Every assertion here is a rule a per-module parser would have had
/// to re-decide: missing header, blank required cell, row cap, and formula injection on the way out.
/// </summary>
public class ExcelImportPipelineTests
{
    private sealed class ProductRow
    {
        public string Sku { get; set; } = string.Empty;
        public decimal Price { get; set; }
    }

    private static ExcelImportPipeline<ProductRow> Pipeline(int maxRows = 5000) => new(
        new[]
        {
            ExcelImportColumn<ProductRow>.Text("Mã SKU", (row, value) => row.Sku = value ?? string.Empty, required: true),
            new ExcelImportColumn<ProductRow>("Giá bán", (row, value) =>
            {
                if (string.IsNullOrEmpty(value)) return null;
                if (!decimal.TryParse(value, System.Globalization.NumberStyles.Number,
                        System.Globalization.CultureInfo.InvariantCulture, out var price))
                {
                    return "Giá bán phải là số.";
                }
                row.Price = price;
                return null;
            }, hint: "VND")
        },
        validateRow: row => row.Price < 0 ? new[] { "Giá bán không được âm." } : Array.Empty<string>(),
        maxRows: maxRows);

    private static MemoryStream Sheet(params string[][] rows)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Dữ liệu");
        for (var r = 0; r < rows.Length; r++)
        {
            for (var c = 0; c < rows[r].Length; c++)
            {
                sheet.Cell(r + 1, c + 1).Value = rows[r][c];
            }
        }
        var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        return stream;
    }

    [Fact]
    public void TepHopLe_DocDuTatCaDong()
    {
        using var file = Sheet(
            new[] { "Mã SKU", "Giá bán" },
            new[] { "SSD-980-1TB", "2490000" },
            new[] { "RAM-DDR5-16", "1290000" });

        var result = Pipeline().Read(file);

        result.IsValid.Should().BeTrue();
        result.TotalRows.Should().Be(2);
        result.Rows.Should().HaveCount(2);
        result.Rows[0].Sku.Should().Be("SSD-980-1TB");
        result.Rows[0].Price.Should().Be(2_490_000m);
    }

    [Fact]
    public void ThieuCotBatBuoc_ThiTuChoiCaTep_VoiThongBaoTiengViet()
    {
        using var file = Sheet(new[] { "Giá bán" }, new[] { "1000" });

        var act = () => Pipeline().Read(file);

        act.Should().Throw<InvalidDataException>().WithMessage("*Tệp thiếu cột: Mã SKU*");
    }

    [Fact]
    public void ODeTrongOBatBuoc_ThiBaoLoiDungSoDong_VaKhongNhanDongDo()
    {
        using var file = Sheet(
            new[] { "Mã SKU", "Giá bán" },
            new[] { "SSD-980-1TB", "2490000" },
            new[] { "", "1290000" });

        var result = Pipeline().Read(file);

        result.IsValid.Should().BeFalse();
        result.Rows.Should().HaveCount(1);
        result.Errors.Should().ContainSingle();
        result.Errors[0].RowNumber.Should().Be(3);
        result.Errors[0].Column.Should().Be("Mã SKU");
        result.Errors[0].Message.Should().Be("Bắt buộc nhập.");
    }

    [Fact]
    public void GiaTriSaiKieu_BaoLoiTheoO_KhongNemNgoaiLe()
    {
        using var file = Sheet(
            new[] { "Mã SKU", "Giá bán" },
            new[] { "SSD-980-1TB", "hai triệu" });

        var result = Pipeline().Read(file);

        result.Errors.Should().ContainSingle(e => e.Message == "Giá bán phải là số.");
        result.Rows.Should().BeEmpty();
    }

    [Fact]
    public void LuatCapDong_ChiChayKhiMoiOHopLe()
    {
        using var file = Sheet(
            new[] { "Mã SKU", "Giá bán" },
            new[] { "SSD-980-1TB", "-5" });

        var result = Pipeline().Read(file);

        result.Errors.Should().ContainSingle(e => e.Column == null && e.Message == "Giá bán không được âm.");
    }

    [Fact]
    public void VuotTranSoDong_ThiTuChoiTruocKhiXuLyHet()
    {
        var rows = new List<string[]> { new[] { "Mã SKU", "Giá bán" } };
        rows.AddRange(Enumerable.Range(1, 5).Select(i => new[] { $"SKU-{i}", "1000" }));
        using var file = Sheet(rows.ToArray());

        var act = () => Pipeline(maxRows: 3).Read(file);

        act.Should().Throw<InvalidDataException>().WithMessage("*nhiều hơn 3 dòng*");
    }

    [Fact]
    public void TepQuaLon_TuChoiTruocKhiGiaiNen()
    {
        var pipeline = new ExcelImportPipeline<ProductRow>(
            new[] { ExcelImportColumn<ProductRow>.Text("Mã SKU", (r, v) => r.Sku = v ?? "") },
            maxBytes: 10);
        using var big = new MemoryStream(new byte[64]);

        var act = () => pipeline.Read(big);

        act.Should().Throw<InvalidDataException>().WithMessage("*vượt quá giới hạn*");
    }

    /// <summary>Stream không seek được (body request thô) - vẫn phải chặn TRƯỚC khi giải nén.</summary>
    private sealed class ForwardOnlyStream : Stream
    {
        private readonly MemoryStream _inner;
        public ForwardOnlyStream(byte[] data) => _inner = new MemoryStream(data);
        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }
        public override int Read(byte[] buffer, int offset, int count) => _inner.Read(buffer, offset, count);
        public override void Flush() { }
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }

    [Fact]
    public void TepQuaLonTrenStreamKhongSeekDuoc_VanBiTuChoi()
    {
        var pipeline = new ExcelImportPipeline<ProductRow>(
            new[] { ExcelImportColumn<ProductRow>.Text("Mã SKU", (r, v) => r.Sku = v ?? "") },
            maxBytes: 10);
        using var big = new ForwardOnlyStream(new byte[64]);

        var act = () => pipeline.Read(big);

        act.Should().Throw<InvalidDataException>().WithMessage("*vượt quá giới hạn*");
    }

    /// <summary>Và một tệp hợp lệ trên stream không seek được vẫn đọc bình thường.</summary>
    [Fact]
    public void StreamKhongSeekDuoc_TepHopLe_VanDocDuoc()
    {
        using var file = Sheet(
            new[] { "Mã SKU", "Giá bán" },
            new[] { "SSD-980-1TB", "2490000" });
        using var forwardOnly = new ForwardOnlyStream(file.ToArray());

        var result = Pipeline().Read(forwardOnly);

        result.IsValid.Should().BeTrue();
        result.Rows.Should().ContainSingle().Which.Sku.Should().Be("SSD-980-1TB");
    }

    [Fact]
    public void TepKhongPhaiExcel_BaoLoiRoRang()
    {
        using var garbage = new MemoryStream(System.Text.Encoding.UTF8.GetBytes("không phải xlsx"));

        var act = () => Pipeline().Read(garbage);

        act.Should().Throw<InvalidDataException>().WithMessage("*không phải là tệp Excel*");
    }

    [Fact]
    public void TepMau_CoTieuDeVaDanhDauCotBatBuoc()
    {
        var bytes = Pipeline().BuildTemplate();

        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheet(1);

        sheet.Cell(1, 1).GetString().Should().Be("Mã SKU *");
        sheet.Cell(1, 2).GetString().Should().Be("Giá bán");
        sheet.Cell(2, 2).GetString().Should().Be("VND");
    }

    /// <summary>
    /// Tệp mẫu tải xuống phải nạp lại được: tiêu đề có hậu tố " *" cho cột bắt buộc, nếu bộ đọc
    /// không bỏ dấu sao thì mọi lần tải-lên-lại đều báo "thiếu cột" - một vòng lặp chết.
    /// </summary>
    [Fact]
    public void TepMauTaiXuong_NapLaiDuoc_KhongBaoThieuCot()
    {
        var bytes = Pipeline().BuildTemplate();
        using var stream = new MemoryStream(bytes);

        var result = Pipeline().Read(stream);

        // Chỉ còn dòng gợi ý ("Bắt buộc" / "VND"), và nó được ĐỌC chứ không làm hỏng ánh xạ cột.
        result.TotalRows.Should().Be(1);
        result.Errors.Should().NotContain(e => e.Message.Contains("thiếu cột"));
    }

    [Fact]
    public void WorkbookLoi_TraLaiDongHong_KemCotLoi_VaVoHieuHoaCongThuc()
    {
        using var file = Sheet(
            new[] { "Mã SKU", "Giá bán" },
            new[] { "=HYPERLINK(\"http://evil\",\"click\")", "hai triệu" });

        var pipeline = Pipeline();
        var result = pipeline.Read(file);
        var bytes = pipeline.BuildErrorWorkbook(result);

        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheet(1);

        sheet.Cell(1, 3).GetString().Should().Be("Lỗi");
        // Dấu nháy đơn dẫn đầu được OpenXML lưu thành cờ "quote prefix": ô hiển thị nguyên văn và
        // KHÔNG được tính là công thức khi mở bằng Excel/LibreOffice.
        sheet.Cell(2, 1).Style.IncludeQuotePrefix.Should().BeTrue();
        sheet.Cell(2, 1).HasFormula.Should().BeFalse();
        sheet.Cell(2, 3).GetString().Should().Contain("Giá bán phải là số.");
        sheet.Cell(3, 1).GetString().Should().BeEmpty(); // chỉ dòng hỏng mới xuất hiện
    }
}

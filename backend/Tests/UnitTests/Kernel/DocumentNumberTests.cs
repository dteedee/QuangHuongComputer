using BuildingBlocks.Documents;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace UnitTests.Kernel;

/// <summary>
/// The FORMAT and the type vocabulary. Uniqueness under concurrency is a property of the PostgreSQL
/// sequence, not of this class, and is proved against the TEST database by
/// <c>reports/probes/W1-3-document-number-concurrency.sh</c> (10.000 nextval calls from 10 parallel
/// sessions -> 10.000 distinct values).
/// </summary>
public class DocumentNumberTests
{
    [Fact]
    public void DinhDang_LaPREFIX_yyyyMM_5ChuSo()
    {
        var vn = new DateTimeOffset(2026, 9, 18, 14, 30, 0, TimeSpan.FromHours(7));

        DocumentNumberService.Format("PO", vn, 42).Should().Be("PO-202609-00042");
        DocumentNumberService.Format("GRN", vn, 1).Should().Be("GRN-202609-00001");
    }

    /// <summary>Quá 99.999 thì số dài thêm chứ KHÔNG quay vòng - quay vòng là trùng mã.</summary>
    [Fact]
    public void Vuot99999_ThiDaiThem_KhongQuayVong()
    {
        var vn = new DateTimeOffset(2026, 9, 18, 0, 0, 0, TimeSpan.FromHours(7));

        DocumentNumberService.Format("PO", vn, 100_000).Should().Be("PO-202609-100000");
    }

    /// <summary>
    /// 01:30 UTC ngày 01/10 = 08:30 giờ Việt Nam cùng ngày -> phải nằm ở tháng 10, không phải tháng 9.
    /// Đây chính là loại lệch 7 giờ đã làm sai kỳ chấm công.
    /// </summary>
    [Fact]
    public void ThangLayTheoGioVietNam_KhongPhaiUTC()
    {
        var utcInstant = new DateTimeOffset(2026, 10, 1, 1, 30, 0, TimeSpan.Zero);
        var vn = utcInstant.ToOffset(TimeSpan.FromHours(7));

        DocumentNumberService.Format("INV", vn, 7).Should().Be("INV-202610-00007");
        utcInstant.UtcDateTime.Month.Should().Be(10);
    }

    [Fact]
    public void DanhSachLoaiChungTu_LaHopDongCoDinhVoiW1_11()
    {
        DocumentNumberTypes.All.Keys.Should().BeEquivalentTo(
            new[] { "po", "grn", "dn", "rma", "inv", "wo", "tr", "pr", "rfq", "ret", "pay", "so", "bg", "lh" });

        DocumentNumberTypes.SequenceName("po").Should().Be("docnum_po_seq");
        DocumentNumberTypes.SequenceName("BG").Should().Be("docnum_bg_seq");
    }

    [Fact]
    public async Task LoaiChungTuLa_ThiNemLoiRoRang_KhongBiaTenSequence()
    {
        var service = new DocumentNumberService(Configuration("Host=localhost;Database=none"));

        var act = () => service.NextAsync("khong-ton-tai");

        await act.Should().ThrowAsync<ArgumentOutOfRangeException>()
            .Where(e => e.Message.Contains("Unknown document type"));
    }

    [Fact]
    public void ThieuChuoiKetNoi_ThiNemNgayLucKhoiTao()
    {
        var act = () => new DocumentNumberService(Configuration(null));

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*DefaultConnection*");
    }

    private static IConfiguration Configuration(string? connectionString)
        => new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = connectionString
            })
            .Build();
}

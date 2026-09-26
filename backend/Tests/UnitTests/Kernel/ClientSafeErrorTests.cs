using BuildingBlocks.Endpoints;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace UnitTests.Kernel;

/// <summary>
/// M6 — message exception chỉ tới client khi nó là copy nghiệp vụ của chính dự án. Lỗi ném từ
/// thư viện (EF, System.Linq...) bị ném lại cho middleware (log + câu chung ngoài Development).
/// </summary>
public class ClientSafeErrorTests
{
    private static Exception Capture(Action action)
    {
        try { action(); }
        catch (Exception ex) { return ex; }
        throw new Xunit.Sdk.XunitException("action không ném exception");
    }

    // Mô phỏng một quy tắc nghiệp vụ trong domain: ném từ code dự án (assembly tham chiếu BuildingBlocks).
    private static void BusinessRule() => throw new InvalidOperationException("Đơn nghỉ phép đã bị huỷ.");

    [Fact]
    public void QuyTacNghiepVuCuaDuAn_ThiGiuNguyenMessage()
    {
        var ex = Capture(BusinessRule);
        ClientSafeError.IsSafeToShow(ex).Should().BeTrue();
        ClientSafeError.Message(ex).Should().Be("Đơn nghỉ phép đã bị huỷ.");
    }

    [Fact]
    public void DomainException_LuonAnToan_KeCaChuaNem()
    {
        ClientSafeError.Message(new ConflictException("Mã SKU đã tồn tại.")).Should().Be("Mã SKU đã tồn tại.");
    }

    [Fact]
    public void LoiTuThuVien_ThiNemLaiChoMiddleware()
    {
        // "Sequence contains no elements" — ném từ System.Linq, không phải copy cho người dùng.
        var ex = Capture(() => Array.Empty<int>().First());
        ClientSafeError.IsSafeToShow(ex).Should().BeFalse();

        var act = () => ClientSafeError.Message(ex);
        act.Should().Throw<InvalidOperationException>().Which.Should().BeSameAs(ex);
    }

    [Fact]
    public void BocLoiThuVienTrongExceptionCuaDuAn_VanKhongAnToan()
    {
        var inner = Capture(() => Array.Empty<int>().First());
        var ex = Capture(() => throw new InvalidOperationException($"Không thể đặt trước hàng: {inner.Message}", inner));
        ClientSafeError.IsSafeToShow(ex).Should().BeFalse();
    }

    [Fact]
    public void ExceptionChuaTungNem_KhongXacDinhNguonGoc_ThiKhongAnToan()
    {
        ClientSafeError.IsSafeToShow(new InvalidOperationException("raw")).Should().BeFalse();
    }

    [Fact]
    public void MessageOrGeneric_KhongNem_TraCauChung()
    {
        var ex = Capture(() => Array.Empty<int>().First());
        ClientSafeError.MessageOrGeneric(ex, NullLogger.Instance).Should().Be(ClientSafeError.GenericMessage);
        ClientSafeError.MessageOrGeneric(Capture(BusinessRule)).Should().Be("Đơn nghỉ phép đã bị huỷ.");
    }
}

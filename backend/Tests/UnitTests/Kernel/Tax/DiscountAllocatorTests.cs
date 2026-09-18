using BuildingBlocks.TaxEngine;
using FluentAssertions;
using Xunit;

namespace UnitTests.Kernel.Tax;

/// <summary>
/// W1-15 / D01 §3.2 — ba chốt chặn của bộ phân bổ giảm giá. Mỗi test dưới đây tương ứng với một
/// lỗi ĐÃ được script chứng minh là xảy ra khi thiếu chốt chặn: VAT âm, chia cho 0, và snapshot
/// lệch giữa giỏ / đơn / hoá đơn.
/// </summary>
public class DiscountAllocatorTests
{
    [Fact]
    public void ChotChan1_GiamGiaLonHonTienHang_BiKepVeTongTienHang()
    {
        // Thiếu clamp: 250.000 trên 2 dòng 100.000 → −25.000/dòng, tổng đơn −50.000, VAT âm.
        var lines = new[] { 100_000m, 100_000m };

        var alloc = DiscountAllocator.Allocate(lines, 250_000m);

        alloc.Sum().Should().Be(200_000m);
        alloc.Should().OnlyContain(a => a >= 0m);
        (lines[0] - alloc[0]).Should().Be(0m);
        (lines[1] - alloc[1]).Should().Be(0m);
    }

    [Fact]
    public void ChotChan2_DonToanHangTang_KhongChiaCho0_VaCouponBiEpVe0()
    {
        var lines = new[]
        {
            new DiscountLine(1, 500_000m, IsGift: true),
            new DiscountLine(2, 300_000m, IsGift: true)
        };

        var alloc = DiscountAllocator.Allocate(lines, 200_000m);

        alloc.Should().AllBeEquivalentTo(0m);
        alloc.Sum().Should().Be(0m, "coupon không được ăn vào đơn 0đ");
    }

    [Fact]
    public void ChotChan3_PhanLeBangNhau_UuTienDongCoSequenceNhoNhat()
    {
        var lines = new[]
        {
            new DiscountLine(1, 100_000m),
            new DiscountLine(2, 100_000m),
            new DiscountLine(3, 100_000m)
        };

        var alloc = DiscountAllocator.Allocate(lines, 1m);

        alloc.Should().Equal(1m, 0m, 0m);
    }

    [Fact]
    public void ChotChan3_TatDinh_DuThuTuMangKhacSequence()
    {
        // Cùng dữ liệu, nhập vào theo thứ tự mảng đảo ngược: dòng Sequence 1 vẫn phải nhận 1đ.
        var reversed = new[]
        {
            new DiscountLine(3, 100_000m),
            new DiscountLine(2, 100_000m),
            new DiscountLine(1, 100_000m)
        };

        var alloc = DiscountAllocator.Allocate(reversed, 1m);

        alloc.Should().Equal(0m, 0m, 1m);
    }

    [Fact]
    public void DongQuaTang_KhongThamGiaPhanBo_NhungVanGiuViTri()
    {
        var lines = new[]
        {
            new DiscountLine(1, 1_000_000m),
            new DiscountLine(2, 500_000m, IsGift: true),
            new DiscountLine(3, 1_000_000m)
        };

        var alloc = DiscountAllocator.Allocate(lines, 300_000m);

        alloc[1].Should().Be(0m);
        alloc.Sum().Should().Be(300_000m);
        alloc[0].Should().Be(150_000m);
        alloc[2].Should().Be(150_000m);
    }

    [Fact]
    public void GiamGiaAmHoacBang0_KhongPhanBoGi()
    {
        var lines = new[] { 100_000m, 200_000m };

        DiscountAllocator.Allocate(lines, 0m).Sum().Should().Be(0m);
        DiscountAllocator.Allocate(lines, -50_000m).Sum().Should().Be(0m);
    }

    [Fact]
    public void DonRong_TraVeMangRong()
    {
        DiscountAllocator.Allocate(Array.Empty<decimal>(), 100_000m).Should().BeEmpty();
    }

    /// <summary>
    /// D01 §5 — trả hàng từng phần. Không có quy tắc "lần cuối lấy phần còn lại" thì dòng
    /// payable 1.268.113 qty 3 trả lẻ 3 lần chỉ hoàn 1.268.112 (thiếu đúng 1đ).
    /// </summary>
    [Fact]
    public void TraHangTungPhan_LanCuoiLayPhanConLai_TongHoanKhopTuyetDoi()
    {
        const decimal payable = 1_268_113m;
        const int qty = 3;

        var refund1 = DiscountAllocator.RefundForReturn(payable, qty, 1);
        var refund2 = DiscountAllocator.RefundForReturn(payable, qty, 1, 1, refund1);
        var refund3 = DiscountAllocator.RefundForReturn(payable, qty, 1, 2, refund1 + refund2);

        refund1.Should().Be(422_704m);
        refund2.Should().Be(422_704m);
        refund3.Should().Be(422_705m);
        (refund1 + refund2 + refund3).Should().Be(payable);
    }

    [Fact]
    public void TraHangToanBo_HoanDungPayable()
    {
        DiscountAllocator.RefundForReturn(1_268_113m, 3, 3).Should().Be(1_268_113m);
    }

    [Fact]
    public void TraHangQuaSoLuong_KhongHoanVuotPayable()
    {
        var first = DiscountAllocator.RefundForReturn(1_000_000m, 2, 2);
        var second = DiscountAllocator.RefundForReturn(1_000_000m, 2, 1, 2, first);

        first.Should().Be(1_000_000m);
        second.Should().Be(0m);
    }
}

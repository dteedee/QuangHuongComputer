using System.Web;
using FluentAssertions;
using Payments.Application.Providers;
using Payments.Application.Providers.VnPay;
using Payments.Domain;
using Xunit;

namespace UnitTests.Domain.Payments.Gateways;

/// <summary>
/// W2-21 bước 2 — URL `vpcpay.html`. Hàm thuần nên test kiểm được từng trường, không cần mạng.
/// </summary>
public class VnPayPaymentUrlBuilderTests
{
    /// <summary>18/09/2026 20:30:00 giờ Việt Nam = 13:30:00Z.</summary>
    private static readonly DateTimeOffset NowUtc = new(2026, 9, 18, 13, 30, 0, TimeSpan.Zero);

    private static VnPayOptions Options(int expireMinutes = 15)
        => VnPayOptions.ForTesting(VnPayFixtures.TmnCode, VnPayFixtures.HashSecret, expireMinutes: expireMinutes);

    private static PaymentCreationContext Context(
        PaymentIntent intent, decimal amount = VnPayFixtures.Amount, string? bankCode = "ncb", string ip = "113.161.0.1")
        => new(
            Intent: intent,
            Amount: amount,
            OrderReference: "1F7B0E42",
            BankCode: bankCode,
            BaseUrl: "https://quanghuongcomputer.vn",
            FrontendUrl: "https://quanghuongcomputer.vn",
            ClientIpAddress: ip);

    private static PaymentIntent NewIntent(decimal amount = VnPayFixtures.Amount)
        => PaymentIntent.Create(Guid.NewGuid(), amount, "VND", PaymentProvider.VnPay, Guid.NewGuid().ToString());

    private static Dictionary<string, string> ParseQuery(string url)
    {
        var parsed = HttpUtility.ParseQueryString(url[(url.IndexOf('?') + 1)..]);
        return parsed.AllKeys.Where(k => k is not null)
            .ToDictionary(k => k!, k => parsed[k] ?? string.Empty, StringComparer.Ordinal);
    }

    [Fact]
    public void DungDuMoiTruongBatBuoc_VaChuKyTuKiemDuoc()
    {
        var intent = NewIntent();
        var built = VnPayPaymentUrlBuilder.Build(Options(), Context(intent), NowUtc);
        var q = ParseQuery(built.Url);

        built.Url.Should().StartWith(VnPayOptions.DefaultPaymentUrl + "?");
        q["vnp_Version"].Should().Be("2.1.0");
        q["vnp_Command"].Should().Be("pay");
        q["vnp_TmnCode"].Should().Be(VnPayFixtures.TmnCode);
        q["vnp_CurrCode"].Should().Be("VND");
        q["vnp_Locale"].Should().Be("vn");
        q["vnp_OrderType"].Should().Be("other");
        q["vnp_CreateDate"].Should().Be("20260918203000", "mốc thời gian VNPay là giờ Việt Nam");
        q["vnp_ExpireDate"].Should().Be("20260918204500", "mặc định vnp_ExpireDate là 15 phút");
        q["vnp_IpAddr"].Should().Be("113.161.0.1");
        q["vnp_BankCode"].Should().Be("NCB", "mã ngân hàng luôn viết hoa");
        q["vnp_ReturnUrl"].Should().Be("https://quanghuongcomputer.vn/api/payments/v2/vnpay/return");
        q["vnp_OrderInfo"].Should().Be("Thanh toan don hang 1F7B0E42");

        // Chữ ký trong URL phải verify lại được từ chính các tham số đã giải mã.
        var fields = q.ToDictionary(kv => kv.Key, kv => (string?)kv.Value, StringComparer.Ordinal);
        VnPaySignature.Verify(VnPayFixtures.HashSecret, fields, q[VnPaySignature.HashField]).Should().BeTrue();
    }

    [Fact]
    public void SoTien_NhanTram_KhongMatDongNao()
    {
        var intent = NewIntent(29_990_000m);
        var q = ParseQuery(VnPayPaymentUrlBuilder.Build(Options(), Context(intent, 29_990_000m), NowUtc).Url);
        q["vnp_Amount"].Should().Be("2999000000");
    }

    [Fact]
    public void TxnRef_KhoiPhucDuocIntentIdVaCreateDate()
    {
        var intent = NewIntent();
        var built = VnPayPaymentUrlBuilder.Build(Options(), Context(intent), NowUtc);

        built.TxnRef.Should().HaveLength(44).And.StartWith(intent.Id.ToString("N"));
        VnPayPaymentUrlBuilder.TryParseIntentId(built.TxnRef, out var parsed).Should().BeTrue();
        parsed.Should().Be(intent.Id);
        VnPayPaymentUrlBuilder.TryParseCreateDate(built.TxnRef, out var createDate).Should().BeTrue();
        createDate.Should().Be("20260918203000");
    }

    [Fact]
    public void HaiLanTaoKhacGiay_ChoRaTxnRefKhacNhau()
    {
        var intent = NewIntent();
        var a = VnPayPaymentUrlBuilder.Build(Options(), Context(intent), NowUtc).TxnRef;
        var b = VnPayPaymentUrlBuilder.Build(Options(), Context(intent), NowUtc.AddSeconds(30)).TxnRef;
        a.Should().NotBe(b, "VNPay từ chối vnp_TxnRef trùng trong ngày khi khách thử lại");
    }

    [Fact]
    public void HetHan_TraVeMocUtcDung()
        => VnPayPaymentUrlBuilder.Build(Options(), Context(NewIntent()), NowUtc)
            .ExpiresAtUtc.Should().Be(new DateTime(2026, 9, 18, 13, 45, 0, DateTimeKind.Utc));

    [Fact]
    public void KhongChonNganHang_KhongGuiBankCode()
    {
        var q = ParseQuery(VnPayPaymentUrlBuilder.Build(Options(), Context(NewIntent(), bankCode: null), NowUtc).Url);
        q.Should().NotContainKey("vnp_BankCode");
    }

    [Theory]
    [InlineData("::1")]
    [InlineData("0:0:0:0:0:0:0:1")]
    [InlineData("")]
    [InlineData("khong-phai-ip")]
    public void IpKhongDung_QuyVe127001(string ip)
        => ParseQuery(VnPayPaymentUrlBuilder.Build(Options(), Context(NewIntent(), ip: ip), NowUtc).Url)["vnp_IpAddr"]
            .Should().Be("127.0.0.1");

    [Fact]
    public void OrderInfo_BoDauTiengVietVaKyTuLa()
        => VnPayPaymentUrlBuilder.BuildOrderInfo("Đơn #QH-2026/09 (gấp!)")
            .Should().Be("Thanh toan don hang Don QH-202609 gap");

    [Fact]
    public void ChuaCauHinh_Nem_KhongTraVeUrlGia()
    {
        var options = VnPayOptions.ForTesting("", "");
        var act = () => VnPayPaymentUrlBuilder.Build(options, Context(NewIntent()), NowUtc);
        act.Should().Throw<InvalidOperationException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void SoTienKhongDuong_Nem(decimal amount)
    {
        var act = () => VnPayPaymentUrlBuilder.Build(Options(), Context(NewIntent(), amount), NowUtc);
        act.Should().Throw<InvalidOperationException>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("qua-ngan")]
    [InlineData("khongphailaguid_khongphailaguid_1234")]
    public void TxnRefHong_KhongKhoiPhucDuocIntentId(string? txnRef)
        => VnPayPaymentUrlBuilder.TryParseIntentId(txnRef, out _).Should().BeFalse();
}

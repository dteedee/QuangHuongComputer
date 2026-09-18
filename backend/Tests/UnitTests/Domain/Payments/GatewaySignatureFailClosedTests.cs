using System.Security.Cryptography;
using System.Text;
using System.Web;
using FluentAssertions;
using Payments.Infrastructure.MoMo;
using Payments.Infrastructure.VNPay;
using Xunit;

namespace UnitTests.Domain.Payments;

/// <summary>
/// W0-10 — MoMo + VNPay verify fail-closed.
/// Trước đây MoMo chỉ verify KHI `SecretKey` khác rỗng (secret rỗng ⇒ ai cũng POST được
/// `{"orderId":"&lt;paymentId&gt;","resultCode":0}`), và `VerifySignature` truy cập `data["amount"]`
/// trực tiếp ⇒ payload thiếu trường làm 500 thay vì 401.
/// </summary>
public class GatewaySignatureFailClosedTests
{
    // ------------------------------------------------------------------ MoMo

    private const string MomoSecret = "momo_secret_9f2c7ab1";

    private static MoMoService Momo(string secret)
        => new(new MoMoConfig { PartnerCode = "QHCOMP", AccessKey = "ACCESS1", SecretKey = secret }, new HttpClient());

    private static Dictionary<string, string> MomoIpn() => new()
    {
        ["amount"] = "290000",
        ["extraData"] = "",
        ["message"] = "Successful.",
        ["orderId"] = "1f7b0e42-0000-4000-8000-000000000001",
        ["orderInfo"] = "Thanh toan don hang",
        ["orderType"] = "momo_wallet",
        ["payType"] = "qr",
        ["requestId"] = "req-1",
        ["responseTime"] = "1758100000000",
        ["resultCode"] = "0",
        ["transId"] = "2222222222"
    };

    private static string MomoSign(Dictionary<string, string> d, string secret)
    {
        var raw =
            $"accessKey=ACCESS1&amount={d["amount"]}&extraData={d["extraData"]}&message={d["message"]}" +
            $"&orderId={d["orderId"]}&orderInfo={d["orderInfo"]}&orderType={d["orderType"]}" +
            $"&partnerCode=QHCOMP&payType={d["payType"]}&requestId={d["requestId"]}" +
            $"&responseTime={d["responseTime"]}&resultCode={d["resultCode"]}&transId={d["transId"]}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(raw))).ToLowerInvariant();
    }

    [Fact]
    public void MoMo_ChuKyDung_TraTrue()
    {
        var d = MomoIpn();
        Momo(MomoSecret).VerifySignature(d, MomoSign(d, MomoSecret)).Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("${MOMO_SECRET_KEY}")]
    [InlineData("DEMOSECRET")]
    public void MoMo_SecretRongHoacPlaceholder_LuonTraFalse(string secret)
    {
        var d = MomoIpn();
        // Kể cả khi kẻ tấn công ký bằng đúng cái secret rỗng đó.
        Momo(secret).VerifySignature(d, MomoSign(d, secret)).Should().BeFalse(
            "secret chưa cấu hình ⇒ endpoint phải 503, không bao giờ chấp nhận webhook");
    }

    [Fact]
    public void MoMo_ChuKySai_TraFalse()
        => Momo(MomoSecret).VerifySignature(MomoIpn(), new string('0', 64)).Should().BeFalse();

    [Fact]
    public void MoMo_ChuKyRong_TraFalse()
        => Momo(MomoSecret).VerifySignature(MomoIpn(), "").Should().BeFalse();

    [Fact]
    public void MoMo_PayloadThieuTruong_TraFalse_KhongNem()
    {
        var partial = new Dictionary<string, string> { ["orderId"] = "x", ["resultCode"] = "0" };
        var act = () => Momo(MomoSecret).VerifySignature(partial, new string('a', 64));
        act.Should().NotThrow<KeyNotFoundException>();
        Momo(MomoSecret).VerifySignature(partial, new string('a', 64)).Should().BeFalse();
    }

    // ------------------------------------------------------------------ VNPay

    private const string VnpSecret = "VNPAYHASHSECRET123";

    private static Dictionary<string, string> VnpCallback(string secret, string responseCode = "00")
    {
        var data = new SortedDictionary<string, string>
        {
            ["vnp_Amount"] = "29000000",
            ["vnp_BankCode"] = "NCB",
            ["vnp_OrderInfo"] = "Thanh toan don hang",
            ["vnp_ResponseCode"] = responseCode,
            ["vnp_TmnCode"] = "QHC01234",
            ["vnp_TransactionNo"] = "14000001",
            ["vnp_TxnRef"] = "1f7b0e42-0000-4000-8000-000000000001"
        };
        var query = string.Join('&', data.Select(kv =>
            $"{HttpUtility.UrlEncode(kv.Key)}={HttpUtility.UrlEncode(kv.Value)}"));
        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(secret));
        var hash = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(query))).ToLowerInvariant();

        var result = data.ToDictionary(kv => kv.Key, kv => kv.Value);
        result["vnp_SecureHash"] = hash;
        return result;
    }

    [Fact]
    public void VNPay_ChuKyDung_Success()
    {
        var r = new VNPayService(new VNPayConfig { HashSecret = VnpSecret }).ProcessCallback(VnpCallback(VnpSecret));
        r.HasSignature.Should().BeTrue();
        r.IsValidSignature.Should().BeTrue();
        r.Success.Should().BeTrue();
        r.Amount.Should().Be(290_000m, "vnp_Amount chia 100");
    }

    [Fact]
    public void VNPay_ThieuSecureHash_KhongHopLe()
    {
        var q = VnpCallback(VnpSecret);
        q.Remove("vnp_SecureHash");
        var r = new VNPayService(new VNPayConfig { HashSecret = VnpSecret }).ProcessCallback(q);
        r.HasSignature.Should().BeFalse();
        r.IsValidSignature.Should().BeFalse();
        r.Success.Should().BeFalse();
    }

    [Fact]
    public void VNPay_SecretRong_KhongHopLe()
    {
        // Callback giả ký bằng secret rỗng vẫn phải bị từ chối.
        var r = new VNPayService(new VNPayConfig { HashSecret = "" }).ProcessCallback(VnpCallback(""));
        r.IsValidSignature.Should().BeFalse();
        r.Success.Should().BeFalse();
    }

    [Fact]
    public void VNPay_ChuKySai_KhongHopLe()
    {
        var q = VnpCallback(VnpSecret);
        q["vnp_SecureHash"] = new string('a', 128);
        var r = new VNPayService(new VNPayConfig { HashSecret = VnpSecret }).ProcessCallback(q);
        r.IsValidSignature.Should().BeFalse();
    }

    [Fact]
    public void VNPay_QueryRong_KhongNem()
    {
        var act = () => new VNPayService(new VNPayConfig { HashSecret = VnpSecret })
            .ProcessCallback(new Dictionary<string, string>());
        act.Should().NotThrow();
    }

    [Fact]
    public void VNPay_MaLoi_CoCauTiengViet()
        => VNPayErrorMessages.Describe("51").Should().Contain("không đủ số dư");
}

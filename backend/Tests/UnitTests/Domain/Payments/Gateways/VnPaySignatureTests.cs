using FluentAssertions;
using Payments.Application.Providers.VnPay;
using Xunit;

namespace UnitTests.Domain.Payments.Gateways;

/// <summary>
/// W2-21 bước 1 — chữ ký HMAC-SHA512 của VNPay.
///
/// Giá trị kỳ vọng đến từ <c>openssl dgst -sha512 -hmac</c>, KHÔNG từ chính code đang test: một
/// test tự ký rồi tự verify sẽ xanh kể cả khi cách encode sai và **mọi IPN thật sẽ bị từ chối 97**.
/// </summary>
public class VnPaySignatureTests
{
    [Fact]
    public void ChuoiKy_SapXepOrdinal_BoTruongRong_BoSecureHash()
    {
        var fields = VnPayFixtures.PayFields();
        fields["vnp_TransactionNo"] = "";                 // rỗng ⇒ không tham gia ký
        fields[VnPaySignature.HashField] = "deadbeef";    // chữ ký không tự ký chính nó
        fields[VnPaySignature.HashTypeField] = "SHA512";  // cũng bị loại
        fields["khong_phai_vnp"] = "x";                   // tham số lạ bị loại

        VnPaySignature.Canonicalize(fields).Should().Be(VnPayFixtures.PayCanonical);
    }

    [Fact]
    public void KyURLThanhToan_TrungVoiOpenSsl()
        => VnPaySignature.Sign(VnPayFixtures.HashSecret, VnPayFixtures.PayFields())
            .Should().Be(VnPayFixtures.ExpectedPayHashFromOpenSsl);

    [Fact]
    public void EncodeDungKieuWebUtility_HexChuHoa_KhoangTrangThanhCong()
    {
        // `HttpUtility.UrlEncode` sinh %2f chữ thường ⇒ hash khác ⇒ IPN thật 97.
        VnPayFixtures.PayCanonical.Should().Contain("%2F").And.NotContain("%2f");
        VnPayFixtures.PayCanonical.Should().Contain("Thanh+toan+don+hang");
    }

    [Fact]
    public void ChuKyDung_Verify_True()
    {
        var signed = VnPayFixtures.Ipn();
        VnPaySignature.Verify(VnPayFixtures.HashSecret, signed, VnPaySignature.ExtractHash(signed))
            .Should().BeTrue();
    }

    [Fact]
    public void SuaBatKyTruongNao_Verify_False()
    {
        var signed = VnPayFixtures.Ipn();
        signed["vnp_Amount"] = "100";   // kẻ tấn công hạ số tiền sau khi đã ký
        VnPaySignature.Verify(VnPayFixtures.HashSecret, signed, VnPaySignature.ExtractHash(signed))
            .Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("${VNPAY_HASH_SECRET}")]
    [InlineData("DEMOSECRET")]
    [InlineData("changeme")]
    [InlineData(null)]
    public void SecretChuaCauHinh_LuonFalse_KeCaKhiKeTanCongKyBangChinhNo(string? secret)
    {
        var data = VnPayFixtures.PayFields();
        var forged = secret is null ? "x" : VnPaySignature.Sign(secret, data);
        VnPaySignature.Verify(secret, data, forged).Should().BeFalse(
            "secret chưa cấu hình ⇒ route phải 503, không bao giờ chấp nhận callback");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void ThieuChuKy_False(string? hash)
        => VnPaySignature.Verify(VnPayFixtures.HashSecret, VnPayFixtures.PayFields(), hash).Should().BeFalse();

    [Fact]
    public void ChuKyKhacDoDai_False_KhongNem()
    {
        var act = () => VnPaySignature.Verify(VnPayFixtures.HashSecret, VnPayFixtures.PayFields(), "abc");
        act.Should().NotThrow();
        VnPaySignature.Verify(VnPayFixtures.HashSecret, VnPayFixtures.PayFields(), "abc").Should().BeFalse();
    }

    [Fact]
    public void ChuKyHoaThuong_ChapNhanCaHai()
    {
        var data = VnPayFixtures.PayFields();
        var hash = VnPaySignature.Sign(VnPayFixtures.HashSecret, data);
        VnPaySignature.Verify(VnPayFixtures.HashSecret, data, hash.ToUpperInvariant()).Should().BeTrue();
    }

    [Fact]
    public void KyDangOng_TrungVoiOpenSsl()
        => VnPaySignature.SignPipe(
                VnPayFixtures.HashSecret,
                VnPayFixtures.QueryRequestId, "2.1.0", "querydr", VnPayFixtures.TmnCode,
                VnPayFixtures.TxnRef, VnPayFixtures.CreateDate, "20260918205500", "127.0.0.1",
                "Tra cuu giao dich 1f7b0e42000040008000000000000001")
            .Should().Be(VnPayFixtures.ExpectedQueryHashFromOpenSsl);

    [Fact]
    public void KyDangOng_SecretChuaCauHinh_VerifyFalse()
        => VnPaySignature.VerifyPipe("${VNPAY_HASH_SECRET}", "anything", "a", "b").Should().BeFalse();
}

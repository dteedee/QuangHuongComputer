using FluentAssertions;
using Payments.Application.Providers.BankTransfer;
using Xunit;

namespace UnitTests.Domain.Payments;

/// <summary>
/// W2-4 / D04 mục 2 tầng 0b — payload VietQR tự sinh.
///
/// Không có "fixture VietQR thật" nào được bịa ra ở đây. Thứ được kiểm là những thứ KIỂM ĐƯỢC
/// một cách khách quan:
///  - thuật toán CRC đúng chuẩn CRC-16/CCITT-FALSE (check value công bố cho chuỗi "123456789"
///    là 0x29B1 — đây là hằng số kiểm tra chính thức của biến thể CRC này),
///  - khung TLV đọc ngược lại được đúng các trường đã ghi vào,
///  - BIN không phải 6 chữ số bị TỪ CHỐI (mã QR sẽ không quét được nếu lọt).
/// </summary>
public class VietQrPayloadBuilderTests
{
    private const string MbBin = "970422";
    private const string Account = "0123456789";

    [Fact]
    public void Crc16_DungCheckValueChuan()
        => VietQrPayloadBuilder.Crc16CcittFalse("123456789").Should().Be("29B1");

    [Fact]
    public void Payload_KetThucBangCrcCuaChinhNo()
    {
        var payload = VietQrPayloadBuilder.Build(MbBin, Account, 1_000_000m, "QH34679ACD", "CTY QUANG HUONG");

        payload.Should().Contain("6304");
        var withoutCrc = payload[..^4];
        withoutCrc.Should().EndWith("6304");
        VietQrPayloadBuilder.Crc16CcittFalse(withoutCrc).Should().Be(payload[^4..]);
    }

    [Fact]
    public void Payload_ChuaDungBin_SoTaiKhoan_SoTien_VaMaThanhToan()
    {
        var payload = VietQrPayloadBuilder.Build(MbBin, Account, 1_000_000m, "QH34679ACD");

        var fields = ParseTlv(payload);
        fields["00"].Should().Be("01");
        fields["01"].Should().Be("12", "có số tiền ⇒ QR động");
        fields["53"].Should().Be("704", "VND theo ISO 4217");
        fields["58"].Should().Be("VN");
        fields["54"].Should().Be("1000000", "số tiền là số nguyên đồng, không dấu phân cách");

        var merchant = ParseTlv(fields["38"]);
        merchant["00"].Should().Be("A000000727", "GUID của NAPAS");
        merchant["02"].Should().Be("QRIBFTTA", "chuyển tới tài khoản");

        var beneficiary = ParseTlv(merchant["01"]);
        beneficiary["00"].Should().Be(MbBin);
        beneficiary["01"].Should().Be(Account);

        ParseTlv(fields["62"])["08"].Should().Be("QH34679ACD");
    }

    [Fact]
    public void KhongCoSoTien_ThiLaQrTinhVaKhongCoTruong54()
    {
        var fields = ParseTlv(VietQrPayloadBuilder.Build(MbBin, Account, 0m, "QH34679ACD"));
        fields["01"].Should().Be("11");
        fields.Should().NotContainKey("54");
    }

    [Theory]
    [InlineData("MB")]          // mã ngân hàng cũ, KHÔNG phải BIN
    [InlineData("97042")]       // thiếu 1 chữ số
    [InlineData("97042A")]
    [InlineData("")]
    public void BinKhongPhai6ChuSo_ThiNem(string bin)
    {
        VietQrPayloadBuilder.IsValidBankBin(bin).Should().BeFalse();
        var act = () => VietQrPayloadBuilder.Build(bin, Account, 1000m, "QH34679ACD");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void TenChuTaiKhoan_BoDauTiengVietVaVietHoa()
        => VietQrPayloadBuilder.NormalizeAscii("Công ty TNHH Quang Hường", 25)
            .Should().Be("CONG TY TNHH QUANG HUONG");

    [Fact]
    public void TenQuaDai_ThiCatConDung25KyTu()
        => VietQrPayloadBuilder.NormalizeAscii(new string('A', 40), 25).Should().HaveLength(25);

    /// <summary>Đọc ngược khung TLV: 2 ký tự id + 2 ký tự độ dài + giá trị.</summary>
    private static Dictionary<string, string> ParseTlv(string input)
    {
        var result = new Dictionary<string, string>();
        var i = 0;
        while (i + 4 <= input.Length)
        {
            var id = input.Substring(i, 2);
            var length = int.Parse(input.Substring(i + 2, 2));
            result[id] = input.Substring(i + 4, length);
            i += 4 + length;
        }
        return result;
    }
}

using System.Globalization;
using System.Text;

namespace Payments.Application.Providers.BankTransfer;

/// <summary>
/// D04 mục 2 tầng 0b — dựng payload VietQR (EMVCo QR / NAPAS) NGAY TRONG BACKEND.
///
/// Trước đây mã QR được đi vay từ `https://qr.sepay.vn/img?...`: mỗi lần khách mở màn thanh toán là
/// một lần gửi số tài khoản + số tiền + nội dung sang máy chủ bên thứ ba, và mã QR biến mất nếu
/// dịch vụ đó ngừng. Payload dưới đây là chuỗi TLV chuẩn EMVCo, tự sinh, không gọi mạng.
///
/// Khung TLV (id-length-value, length luôn 2 chữ số thập phân):
///   00 "01"                     Payload Format Indicator
///   01 "11"|"12"                Point of Initiation: 11 tĩnh, 12 động (có số tiền → dùng 12)
///   38 { 00 "A000000727"        GUID của NAPAS
///        01 { 00 &lt;BIN 6 số&gt;    mã ngân hàng (VCB 970436, BIDV 970418, MB 970422)
///             01 &lt;số tài khoản&gt; }
///        02 "QRIBFTTA" }        chuyển tới TÀI KHOẢN (QRIBFTTC là tới thẻ)
///   52 "0000"                   Merchant Category Code
///   53 "704"                    Tiền tệ VND (ISO 4217)
///   54 &lt;số tiền&gt;               số nguyên đồng, không dấu phân cách
///   58 "VN"                     Quốc gia
///   59 &lt;tên đơn vị&gt;            ASCII hoa, tối đa 25 ký tự
///   62 { 08 &lt;nội dung CK&gt; }    mã thanh toán QH########
///   63 &lt;CRC16-CCITT-FALSE&gt;     tính trên TOÀN BỘ chuỗi KỂ CẢ "6304"
///
/// D04 mục 3b: có app ngân hàng bỏ qua số tiền và nội dung khi quét — vì vậy màn hình PHẢI luôn
/// hiện song song STK, tên chủ TK, số tiền và mã thanh toán. Payload này không tự đủ.
/// </summary>
public static class VietQrPayloadBuilder
{
    private const string NapasGuid = "A000000727";
    private const string ServiceTransferToAccount = "QRIBFTTA";
    private const string CurrencyVnd = "704";
    private const string CountryVn = "VN";

    public static string Build(
        string bankBin,
        string accountNumber,
        decimal amount,
        string paymentCode,
        string? accountName = null)
    {
        if (!IsValidBankBin(bankBin))
            throw new ArgumentException("Mã BIN ngân hàng phải là 6 chữ số", nameof(bankBin));
        if (string.IsNullOrWhiteSpace(accountNumber))
            throw new ArgumentException("Thiếu số tài khoản", nameof(accountNumber));

        var beneficiary = Tlv("00", bankBin.Trim()) + Tlv("01", accountNumber.Trim());
        var merchantAccount =
            Tlv("00", NapasGuid) +
            Tlv("01", beneficiary) +
            Tlv("02", ServiceTransferToAccount);

        var sb = new StringBuilder();
        sb.Append(Tlv("00", "01"));
        sb.Append(Tlv("01", amount > 0 ? "12" : "11"));
        sb.Append(Tlv("38", merchantAccount));
        sb.Append(Tlv("52", "0000"));
        sb.Append(Tlv("53", CurrencyVnd));
        if (amount > 0)
            sb.Append(Tlv("54", decimal.Truncate(amount).ToString("0", CultureInfo.InvariantCulture)));
        sb.Append(Tlv("58", CountryVn));

        var name = NormalizeAscii(accountName, 25);
        if (name.Length > 0) sb.Append(Tlv("59", name));

        var memo = NormalizeAscii(paymentCode, 25);
        if (memo.Length > 0) sb.Append(Tlv("62", Tlv("08", memo)));

        sb.Append("6304");
        sb.Append(Crc16CcittFalse(sb.ToString()));
        return sb.ToString();
    }

    /// <summary>BIN NAPAS luôn là 6 chữ số. "MB", "VCB" là mã cũ và KHÔNG quét được.</summary>
    public static bool IsValidBankBin(string? bin)
        => bin is not null && bin.Trim().Length == 6 && bin.Trim().All(char.IsAsciiDigit);

    private static string Tlv(string id, string value)
        => $"{id}{value.Length:D2}{value}";

    /// <summary>Bỏ dấu tiếng Việt + ký tự lạ: trường 59/62-08 chỉ an toàn với ASCII hoa.</summary>
    public static string NormalizeAscii(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        var decomposed = value.Trim().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposed.Length);
        foreach (var ch in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark) continue;
            var c = ch is 'đ' or 'Đ' ? 'D' : char.ToUpperInvariant(ch);
            if (char.IsAsciiLetterOrDigit(c) || c == ' ') sb.Append(c);
        }

        var result = sb.ToString().Trim();
        return result.Length <= maxLength ? result : result[..maxLength].Trim();
    }

    /// <summary>CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, không đảo bit, không XOR ra.</summary>
    public static string Crc16CcittFalse(string input)
    {
        ushort crc = 0xFFFF;
        foreach (var b in Encoding.UTF8.GetBytes(input))
        {
            crc ^= (ushort)(b << 8);
            for (var i = 0; i < 8; i++)
                crc = (crc & 0x8000) != 0 ? (ushort)((crc << 1) ^ 0x1021) : (ushort)(crc << 1);
        }
        return crc.ToString("X4", CultureInfo.InvariantCulture);
    }
}

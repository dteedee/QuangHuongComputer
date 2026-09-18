using System.Security.Cryptography;

namespace Payments.Domain;

/// <summary>
/// D04 mục 2 tầng 0b — mã thanh toán dùng làm NỘI DUNG CHUYỂN KHOẢN: `QH` + 8 ký tự A-Z0-9.
///
/// Vì sao không dùng 8 ký tự đầu của OrderId: GUID có `-` và chữ thường, nhiều app ngân hàng lọc
/// bỏ ký tự đặc biệt và người dùng gõ tay rất dễ sai. Bộ ký tự ở đây đã loại các cặp dễ nhầm
/// (O/0, I/1, S/5, B/8, Z/2) để nhân viên đọc qua điện thoại không gây khớp nhầm đơn.
/// Sinh bằng RandomNumberGenerator: mã đoán được = người khác "xác nhận" hộ đơn của bạn.
/// </summary>
public static class PaymentCodeGenerator
{
    public const string Prefix = "QH";

    /// <summary>10 chữ số + 26 chữ cái, trừ O I S B Z và 0 1 5 8 2 → 25 ký tự an toàn khi đọc/gõ.</summary>
    private const string Alphabet = "34679ACDEFGHJKLMNPQRTUVWXY";

    private const int BodyLength = 8;

    public static string Next()
    {
        Span<char> body = stackalloc char[BodyLength];
        for (var i = 0; i < BodyLength; i++)
            body[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        return Prefix + new string(body);
    }

    /// <summary>Hình dạng hợp lệ của một mã thanh toán (dùng khi đối chiếu nội dung chuyển khoản).</summary>
    public static bool IsWellFormed(string? code)
    {
        if (code is null) return false;
        var c = code.Trim().ToUpperInvariant();
        if (c.Length != Prefix.Length + BodyLength) return false;
        if (!c.StartsWith(Prefix, StringComparison.Ordinal)) return false;
        for (var i = Prefix.Length; i < c.Length; i++)
            if (!Alphabet.Contains(c[i], StringComparison.Ordinal)) return false;
        return true;
    }
}

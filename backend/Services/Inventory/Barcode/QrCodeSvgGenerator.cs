using QRCoder;

namespace InventoryModule.Barcode;

/// <summary>
/// Sinh mã QR thật (chuẩn ISO/IEC 18004) dạng SVG bằng thư viện QRCoder.
/// </summary>
public static class QrCodeSvgGenerator
{
    public static string ToSvg(string content)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(content, QRCodeGenerator.ECCLevel.M);
        var svgQr = new SvgQRCode(data);
        return svgQr.GetGraphic(5);
    }
}

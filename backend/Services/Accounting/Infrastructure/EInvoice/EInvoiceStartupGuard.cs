using Microsoft.Extensions.Configuration;

namespace Accounting.Infrastructure.EInvoice;

/// <summary>
/// Chốt an toàn lúc KHỞI ĐỘNG cho <c>EInvoice:Mode</c> (D07 §Yêu cầu phi chức năng).
///
/// Vì sao chặn ngay lúc khởi động chứ không lúc phát hành: một hoá đơn mô phỏng lọt ra ngoài là
/// rủi ro pháp lý (có thưởng tố giác hành vi gian lận hoá đơn), và lỗi phải nổ ở nơi người vận
/// hành nhìn thấy ngay — không phải giữa ca bán hàng.
/// </summary>
public static class EInvoiceStartupGuard
{
    /// <summary>Ném <see cref="InvalidOperationException"/> nếu cấu hình không được phép chạy.</summary>
    public static void Validate(EInvoiceOptions options, IConfiguration configuration)
    {
        if (options.Mode == EInvoiceMode.Sandbox
            && !options.AllowSandboxInProduction
            && IsProduction(configuration))
        {
            throw new InvalidOperationException(
                "EInvoice:Mode=Sandbox trên Production. Hoá đơn mô phỏng không có giá trị pháp lý. "
                + "Đặt EInvoice:Mode=External, hoặc bật EInvoice:AllowSandboxInProduction nếu đây là "
                + "môi trường diễn tập.");
        }

        // Live mà chưa có adapter nhà cung cấp thật thì DỪNG NGAY, thay vì để mỗi lần bán hàng lại
        // ném lỗi ở tận tầng phát hành.
        if (options.Mode == EInvoiceMode.Live)
        {
            throw new InvalidOperationException(
                "EInvoice:Mode=Live nhưng chưa có adapter nhà cung cấp nào được đăng ký. Dùng External "
                + "(lập hoá đơn nội bộ + hàng đợi chờ xuất) cho tới khi ký hợp đồng và bổ sung adapter thật.");
        }
    }

    /// <summary>
    /// Môi trường đến từ biến môi trường. Đọc cả ba nguồn vì host có thể nhận tên môi trường qua
    /// <c>ASPNETCORE_ENVIRONMENT</c>, <c>DOTNET_ENVIRONMENT</c> hoặc chỉ qua biến hệ thống.
    /// </summary>
    private static bool IsProduction(IConfiguration configuration)
    {
        var name = configuration["ASPNETCORE_ENVIRONMENT"]
            ?? configuration["DOTNET_ENVIRONMENT"]
            ?? configuration["ENVIRONMENT"]
            ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT");

        return string.Equals(name, "Production", StringComparison.OrdinalIgnoreCase);
    }
}

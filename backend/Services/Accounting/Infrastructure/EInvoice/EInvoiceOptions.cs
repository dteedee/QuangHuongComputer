namespace Accounting.Infrastructure.EInvoice;

/// <summary>
/// Chế độ vận hành hoá đơn điện tử (D07 §QUYẾT ĐỊNH.1).
/// </summary>
public enum EInvoiceMode
{
    /// <summary>Tắt hẳn — không lập hàng đợi, không phát hành.</summary>
    Off,

    /// <summary>Mô phỏng (mặc định Development). KHÔNG có giá trị pháp lý.</summary>
    Sandbox,

    /// <summary>
    /// Mặc định Production: hệ thống lập hoá đơn nội bộ + hàng đợi "Chờ xuất HĐĐT";
    /// kế toán xuất hoá đơn thật trên phần mềm nhà cung cấp rồi ghi nhận lại.
    /// </summary>
    External,

    /// <summary>Gọi thẳng nhà cung cấp thật — chỉ chạy được khi có adapter thật (chưa có).</summary>
    Live
}

/// <summary>Mốc phát hành HĐĐT (NĐ 254/2026 Đ.9.1 — lúc chuyển giao hàng, không phụ thuộc thu tiền).</summary>
public enum EInvoiceIssueTrigger
{
    /// <summary>Chỉ phát hành khi kế toán bấm nút.</summary>
    Manual,

    /// <summary>Tự phát hành khi nhận <c>InvoiceRequestedEvent</c> (mặc định).</summary>
    InvoiceRequested
}

/// <summary>Loại hoá đơn (D07 §QUYẾT ĐỊNH.2).</summary>
public enum EInvoiceKind
{
    /// <summary>Hoá đơn khởi tạo từ máy tính tiền (MTT) — bán lẻ tại quầy.</summary>
    CashRegister,

    /// <summary>Hoá đơn GTGT có mã của cơ quan thuế.</summary>
    Vat
}

/// <summary>Định dạng tải về của bản thể hoá đơn ở nhà cung cấp.</summary>
public enum EInvoiceDownloadFormat
{
    Pdf,
    Xml
}

/// <summary>
/// Section <c>EInvoice</c> trong cấu hình. Không chứa credential nào — khi có nhà cung cấp thật,
/// bí mật đến từ biến môi trường, không bao giờ từ database và không bao giờ trả ra API (D07 §Bảo mật).
/// </summary>
public sealed class EInvoiceOptions
{
    public const string SectionName = "EInvoice";

    /// <summary>Mặc định theo môi trường: Development = Sandbox, còn lại = External.</summary>
    public EInvoiceMode Mode { get; set; } = EInvoiceMode.External;

    /// <summary>Cho phép chạy Sandbox dưới Production (chỉ dùng cho buổi demo).</summary>
    public bool AllowSandboxInProduction { get; set; }

    public EInvoiceIssueTrigger IssueTrigger { get; set; } = EInvoiceIssueTrigger.InvoiceRequested;

    public EInvoiceKind Kind { get; set; } = EInvoiceKind.CashRegister;

    /// <summary>Ký hiệu hoá đơn do cơ quan thuế cấp. Rỗng ở Sandbox (ký hiệu mô phỏng được sinh ra).</summary>
    public string Series { get; set; } = string.Empty;

    /// <summary>Tiền tố bắt buộc của số hoá đơn mô phỏng — không bao giờ trùng dạng số hoá đơn thật.</summary>
    public string SandboxPrefix { get; set; } = "SBX-";

    /// <summary>Số ngày kể từ ngày lập mà hoá đơn chưa có HĐĐT bị coi là trễ (cảnh báo trên hàng đợi).</summary>
    public int QueueWarningDays { get; set; } = 1;

    public bool IsSandbox => Mode == EInvoiceMode.Sandbox;
}

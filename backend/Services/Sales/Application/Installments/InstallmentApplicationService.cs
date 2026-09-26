using BuildingBlocks.Configuration;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Time;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Orders;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Installments;

/// <summary>
/// W2-20 — nghiệp vụ hồ sơ trả góp lead-mode. Endpoint gọi vào đây, KHÔNG tự thao tác entity.
///
/// Danh sách đối tác + hạn giữ hàng đọc từ SystemConfig (D04 mục 5, D10 quy tắc 6): danh sách rỗng
/// = từ chối mọi nộp hồ sơ ngay từ tầng này (khớp việc <c>/payments/methods</c> đã ẩn `installment`
/// ở phía Payments - W2-4). "Duyệt" ở đây gọi luôn <see cref="OrderLifecycleService.RecordTenderAsync"/>
/// để đơn thành Paid với đúng số hợp đồng làm mã đối soát - không có bước "duyệt xong rồi mark-paid
/// riêng" nào khác trong hệ thống, tránh hồ sơ Approved mồ côi mà đơn vẫn Unpaid.
/// </summary>
public class InstallmentApplicationService
{
    // Khoá của BẢNG CẤU HÌNH ADMIN (config.Configurations), không phải đường dẫn appsettings:
    // IAppSettings tra thẳng theo tên khoá trong bảng đó. Hai hằng số cũ mang dạng
    // "Sales:Installment:Partners" nên không bao giờ khớp hàng nào -> ActivePartners() luôn rỗng,
    // tức trả góp bị tắt vĩnh viễn mà không ai chỉnh được từ back office. Giữ tên cũ làm khoá
    // dự phòng đọc từ appsettings (xem ReadPartnersRaw).
    public const string PartnersConfigKey = "INSTALLMENT_PARTNERS";
    public const string LeadHoldHoursConfigKey = "INSTALLMENT_LEAD_HOLD_HOURS";
    public const string LegacyPartnersConfigKey = "Sales:Installment:Partners";
    public const string LegacyLeadHoldHoursConfigKey = "Installment:LeadHoldHours";
    private const int DefaultLeadHoldHours = 72;

    private readonly SalesDbContext _db;
    private readonly IAppSettings _settings;
    private readonly IBusinessClock _clock;
    private readonly OrderLifecycleService _lifecycle;

    public InstallmentApplicationService(
        SalesDbContext db, IAppSettings settings, IBusinessClock clock, OrderLifecycleService lifecycle)
    {
        _db = db;
        _settings = settings;
        _clock = clock;
        _lifecycle = lifecycle;
    }

    /// <summary>Danh sách đối tác đang bật, đọc từ config phân tách bởi dấu phẩy. Rỗng = tắt trả góp.</summary>
    public IReadOnlyList<string> ActivePartners()
    {
        var raw = _settings.GetString(
            PartnersConfigKey,
            _settings.GetString(LegacyPartnersConfigKey, string.Empty));
        return raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }

    public int LeadHoldHours() => _settings.GetInt(
        LeadHoldHoursConfigKey,
        _settings.GetInt(LegacyLeadHoldHoursConfigKey, DefaultLeadHoldHours));

    public async Task<InstallmentApplication> ApplyAsync(
        Guid customerId, Guid orderId, string provider, int termMonths, decimal downPayment,
        bool consentGiven, CancellationToken ct)
    {
        var partners = ActivePartners();
        if (partners.Count == 0)
            throw new DomainException(
                "Trả góp hiện chưa khả dụng - cửa hàng chưa cấu hình đối tác tài chính.");
        if (!partners.Contains(provider, StringComparer.OrdinalIgnoreCase))
            throw new DomainException(
                $"Đối tác trả góp không hợp lệ. Đối tác đang hỗ trợ: {string.Join(", ", partners)}.");

        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == orderId && o.CustomerId == customerId, ct)
            ?? throw NotFoundException.For("đơn hàng", orderId);

        // D10 quy tắc 6 — mỗi khách tối đa MỘT hồ sơ đang mở (không phải mỗi đơn).
        var hasOpenApplication = await _db.InstallmentApplications
            .Where(i => i.Status == InstallmentStatus.PendingApproval)
            .Join(_db.Orders, i => i.OrderId, o => o.Id, (i, o) => new { i, o })
            .AnyAsync(x => x.o.CustomerId == customerId, ct);
        if (hasOpenApplication)
            throw new ConflictException("Bạn đang có một hồ sơ trả góp chờ duyệt - vui lòng chờ xử lý xong.");

        var now = _clock.UtcNow.UtcDateTime;
        InstallmentApplication app;
        try
        {
            app = InstallmentApplication.Create(
                orderId: orderId,
                provider: provider,
                termMonths: termMonths,
                downPayment: downPayment,
                orderTotal: order.TotalAmount,
                consentGiven: consentGiven,
                now: now,
                leadHoldHours: LeadHoldHours());
        }
        catch (ArgumentException ex)
        {
            throw new DomainException(ClientSafeError.Message(ex));
        }

        _db.InstallmentApplications.Add(app);
        await _db.SaveChangesAsync(ct);
        return app;
    }

    public async Task<IReadOnlyList<InstallmentApplication>> MineAsync(Guid customerId, CancellationToken ct)
    {
        var orderIds = await _db.Orders.Where(o => o.CustomerId == customerId).Select(o => o.Id).ToListAsync(ct);
        return await _db.InstallmentApplications
            .Where(i => orderIds.Contains(i.OrderId))
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(ct);
    }

    public Task<List<InstallmentApplication>> PendingAsync(CancellationToken ct) => _db.InstallmentApplications
        .Where(i => i.Status == InstallmentStatus.PendingApproval)
        .OrderBy(i => i.CreatedAt)
        .ToListAsync(ct);

    /// <summary>Duyệt + thu tiền đơn qua đường tender bình thường (biên lai/ca/sổ cái đều thấy).
    /// Bọc trong một transaction: nếu <c>RecordTenderAsync</c> ném lỗi (vd. đơn vừa bị
    /// expire-sweep huỷ đồng thời), Approve() ở trên cũng phải rollback - tránh trạng thái vỡ
    /// "hồ sơ Approved nhưng đơn Cancelled, chưa ghi nhận tender nào" (bug tìm thấy khi kiểm chứng
    /// đối kháng W2-20: bản trước SaveChanges cho Approve TRƯỚC khi gọi RecordTenderAsync, nên một
    /// race với expire-sweep có thể để lại đúng trạng thái vỡ đó).</summary>
    public async Task<InstallmentApplication> ApproveAsync(
        Guid id, string financeContractNumber, string approverName, CancellationToken ct)
    {
        var app = await _db.InstallmentApplications.FirstOrDefaultAsync(i => i.Id == id, ct)
            ?? throw NotFoundException.For("hồ sơ trả góp", id);

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        app.Approve(approverName, financeContractNumber, _clock.UtcNow.UtcDateTime);
        await _db.SaveChangesAsync(ct);

        var order = await _lifecycle.LoadAsync(app.OrderId, ct);
        var collected = await _lifecycle.CollectedAsync(app.OrderId, ct);
        var due = order.TotalAmount - collected;
        if (due > 0m)
        {
            await _lifecycle.RecordTenderAsync(
                app.OrderId, PaymentTenderMethod.Installment, due,
                reference: app.FinanceContractNumber!, actor: approverName,
                tenderedAmount: due, shiftId: null, ct: ct);
        }

        await tx.CommitAsync(ct);
        return app;
    }

    public async Task<InstallmentApplication> RejectAsync(
        Guid id, string reason, string reviewerName, CancellationToken ct)
    {
        var app = await _db.InstallmentApplications.FirstOrDefaultAsync(i => i.Id == id, ct)
            ?? throw NotFoundException.For("hồ sơ trả góp", id);

        app.Reject(reason, reviewerName, _clock.UtcNow.UtcDateTime);
        await _db.SaveChangesAsync(ct);

        await _lifecycle.CancelAsync(app.OrderId, $"Hồ sơ trả góp bị từ chối: {reason}", reviewerName, ct);
        return app;
    }
}

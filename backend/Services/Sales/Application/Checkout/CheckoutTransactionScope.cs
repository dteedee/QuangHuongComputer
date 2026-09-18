using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;

namespace Sales.Application.Checkout;

/// <summary>
/// MỘT giao dịch cho cả Sales + Inventory + Content.
///
/// Vì sao làm được: toàn hệ thống là modular monolith, mọi DbContext trỏ vào CÙNG một database
/// PostgreSQL. Nên chỉ cần ép các context dùng CHUNG một <c>DbConnection</c> rồi
/// <c>UseTransaction</c> là có tính nguyên tử thật sự giữa các module.
///
/// Vì sao cần: luồng chốt đơn ghi vào cả ba module — đơn hàng (Sales), trừ tồn kho (Inventory),
/// tăng lượt dùng coupon (Content). Bản cũ gọi <c>SaveChangesAsync</c> ba lần rời nhau; nếu lần
/// thứ hai hỏng thì tồn kho đã bị trừ cho một đơn KHÔNG tồn tại, và không có gì hoàn tác.
///
/// Nếu không chia sẻ được kết nối (context đã mở kết nối từ trước), scope KHÔNG im lặng chạy tiếp
/// ở chế độ không nguyên tử: <see cref="IsAtomic"/> = false và caller từ chối đơn. Trừ nhầm tồn kho
/// tệ hơn nhiều so với một lần checkout lỗi.
/// </summary>
internal sealed class CheckoutTransactionScope : IAsyncDisposable
{
    private readonly IDbContextTransaction? _transaction;
    private readonly List<DbContext> _enlisted = new();
    private bool _committed;

    public bool IsAtomic { get; }
    public string? FailureReason { get; }

    private CheckoutTransactionScope(IDbContextTransaction? transaction, bool isAtomic, string? failureReason)
    {
        _transaction = transaction;
        IsAtomic = isAtomic;
        FailureReason = failureReason;
    }

    /// <summary>
    /// Mở giao dịch trên <paramref name="owner"/> rồi kéo các context còn lại vào cùng kết nối.
    /// PHẢI gọi TRƯỚC khi truy vấn bất cứ thứ gì trên các context phụ.
    /// </summary>
    public static async Task<CheckoutTransactionScope> BeginAsync(
        DbContext owner,
        IReadOnlyList<DbContext> participants,
        ILogger logger,
        CancellationToken ct)
    {
        try
        {
            await owner.Database.OpenConnectionAsync(ct);
            var connection = owner.Database.GetDbConnection();
            var transaction = await owner.Database.BeginTransactionAsync(ct);
            var scope = new CheckoutTransactionScope(transaction, true, null);
            scope._enlisted.Add(owner);

            foreach (var participant in participants)
            {
                // Context phụ phải chưa mở kết nối riêng — nếu đã mở thì không thể gộp giao dịch.
                participant.Database.SetDbConnection(connection);
                await participant.Database.UseTransactionAsync(transaction.GetDbTransaction(), ct);
                scope._enlisted.Add(participant);
            }

            return scope;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Không gộp được giao dịch Sales/Inventory/Content — từ chối chốt đơn");
            return new CheckoutTransactionScope(null, false,
                "Hệ thống không mở được giao dịch an toàn cho đơn hàng. Vui lòng thử lại.");
        }
    }

    /// <summary>Lưu mọi context đã tham gia rồi commit. Một lỗi bất kỳ ⇒ rollback toàn bộ.</summary>
    public async Task SaveAndCommitAsync(CancellationToken ct)
    {
        if (_transaction == null)
            throw new InvalidOperationException("Không có giao dịch để commit");

        foreach (var context in _enlisted)
        {
            await context.SaveChangesAsync(ct);
        }

        await _transaction.CommitAsync(ct);
        _committed = true;
    }

    public async ValueTask DisposeAsync()
    {
        if (_transaction != null)
        {
            if (!_committed)
            {
                try { await _transaction.RollbackAsync(); }
                catch { /* kết nối có thể đã hỏng — rollback là nỗ lực tốt nhất */ }
            }

            await _transaction.DisposeAsync();
        }

        foreach (var context in _enlisted)
        {
            try { await context.Database.CloseConnectionAsync(); }
            catch { /* đóng kết nối không được phép làm hỏng kết quả đã commit */ }
        }
    }
}

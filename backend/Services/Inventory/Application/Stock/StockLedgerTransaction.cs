using BuildingBlocks.Endpoints;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InventoryModule.Application.Stock;

/// <summary>
/// Vỏ transaction của sổ cái: execution strategy (Npgsql bật EnableRetryOnFailure nên transaction
/// tường minh BẮT BUỘC phải nằm trong strategy), retry có giới hạn khi đụng độ token xmin, và
/// publish sự kiện chỉ sau khi commit.
/// </summary>
public sealed partial class StockLedgerService
{
    /// <summary>
    /// Transaction + execution strategy + retry khi đụng độ xmin. Nếu caller đã mở transaction
    /// (chuyển kho một bước, duyệt kiểm kê…) thì chạy thẳng trong transaction đó — nested
    /// transaction với Npgsql là một lời nói dối im lặng.
    /// </summary>
    /// <param name="allowRetry">
    /// Chỉ bật cho bút toán ĐƠN của chính sổ cái. Xem <see cref="InTransactionAsync{T}"/>.
    /// </param>
    private async Task<T> RunAsync<T>(Func<CancellationToken, Task<T>> body, CancellationToken ct, bool allowRetry = true)
    {
        if (_db.Database.CurrentTransaction is not null)
            return await body(ct);

        var maxAttempts = allowRetry ? MaxConcurrencyAttempts : 1;
        var strategy = _db.Database.CreateExecutionStrategy();
        var result = await strategy.ExecuteAsync(async () =>
        {
            for (var attempt = 1; ; attempt++)
            {
                _pending.Clear();
                await using var tx = await _db.Database.BeginTransactionAsync(ct);
                try
                {
                    var value = await body(ct);
                    await tx.CommitAsync(ct);
                    return value;
                }
                catch (DbUpdateConcurrencyException) when (attempt < maxAttempts)
                {
                    await tx.RollbackAsync(ct);
                    _db.ChangeTracker.Clear();
                    _logger.LogWarning("Sổ cái kho: đụng độ đồng thời, thử lại lần {Attempt}.", attempt + 1);
                    await Task.Delay(BackoffMilliseconds * attempt, ct);
                }
                catch (DbUpdateConcurrencyException)
                {
                    await tx.RollbackAsync(ct);
                    throw new ConflictException(
                        "Tồn kho vừa được người khác cập nhật. Vui lòng tải lại và thử lại.");
                }
            }
        });

        await FlushProjectionAsync(ct);
        return result;
    }
}

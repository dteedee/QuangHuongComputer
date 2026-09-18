namespace BuildingBlocks.TaxEngine;

/// <summary>
/// W1-15 / D06 §3 — nguồn tham số pháp luật theo NGÀY.
///
/// Implementation thật (<c>HrStatutoryParameterProvider</c>, W2-25) đọc bảng
/// <c>hr."StatutoryParameters"</c>, cache 10 phút, xoá cache khi ghi, và fallback về
/// <see cref="VietnamStatutoryDefaults"/> + log warning khi thiếu dòng.
/// BuildingBlocks chỉ giữ abstraction + bản mặc định để không phụ thuộc ngược vào module HR.
///
/// Ngày truyền vào PHẢI là ngày Việt Nam (<c>IBusinessClock.TodayVn</c>, ngày 01 của tháng lương,
/// hoặc <c>PayrollRun.PayDate</c>) — không bao giờ là <c>DateTime.UtcNow</c>.
/// </summary>
public interface IStatutoryParameterProvider
{
    Task<StatutoryParameterSet> ResolveAsync(DateOnly asOf, CancellationToken ct = default);
}

/// <summary>
/// Provider chỉ dùng mặc định biên dịch sẵn. Không I/O, không cache — dùng làm fallback,
/// dùng trong unit test, và dùng khi module HR chưa được nạp.
/// </summary>
public sealed class DefaultStatutoryParameterProvider : IStatutoryParameterProvider
{
    public static readonly DefaultStatutoryParameterProvider Instance = new();

    public Task<StatutoryParameterSet> ResolveAsync(DateOnly asOf, CancellationToken ct = default)
        => Task.FromResult(VietnamStatutoryDefaults.Resolve(asOf));
}

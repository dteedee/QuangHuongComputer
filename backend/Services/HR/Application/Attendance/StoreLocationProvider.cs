namespace HR.Application.Attendance;

/// <summary>
/// Cung cấp toạ độ + danh sách IP cho từng Store (chi nhánh).
/// Được inject để tránh phụ thuộc trực tiếp vào SystemConfigDbContext (cross-module).
/// </summary>
public interface IStoreLocationProvider
{
    Task<StoreLocationInfo?> GetAsync(Guid storeId, CancellationToken ct = default);
}

public record StoreLocationInfo(
    Guid StoreId,
    decimal? Latitude,
    decimal? Longitude,
    IReadOnlyCollection<string> AllowedIps);

/// <summary>Fallback in-memory nếu chưa cấu hình SystemConfig.</summary>
public class InMemoryStoreLocationProvider : IStoreLocationProvider
{
    private readonly Dictionary<Guid, StoreLocationInfo> _stores;
    public InMemoryStoreLocationProvider(Dictionary<Guid, StoreLocationInfo>? seed = null)
        => _stores = seed ?? new();
    public void Add(StoreLocationInfo info) => _stores[info.StoreId] = info;
    public Task<StoreLocationInfo?> GetAsync(Guid storeId, CancellationToken ct = default)
        => Task.FromResult(_stores.TryGetValue(storeId, out var info) ? info : null);
}

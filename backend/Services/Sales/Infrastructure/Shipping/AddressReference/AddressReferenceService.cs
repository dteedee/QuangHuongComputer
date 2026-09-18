using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;

namespace Sales.Infrastructure.Shipping.AddressReference;

public record ProvinceDto(string Code, string Name);
public record WardDto(string Code, string Name, string ProvinceCode);

public interface IVnAddressReferenceService
{
    /// <summary>Phiên bản bộ dữ liệu đang phục vụ (xem <see cref="VietnamAddressReferenceData2025.Version"/>).</summary>
    string Version { get; }

    IReadOnlyList<ProvinceDto> GetProvinces();

    /// <summary>Rỗng nếu mã tỉnh không tồn tại — không throw, để endpoint tự quyết định 404 hay [].</summary>
    IReadOnlyList<WardDto> GetWards(string provinceCode);

    bool ProvinceExists(string provinceCode);
}

/// <summary>
/// Đọc + cache dữ liệu tỉnh/xã-phường 2 cấp (2025) nhúng trong
/// <see cref="VietnamAddressReferenceData2025"/>. Parse JSON đúng một lần (singleton, dữ liệu tĩnh
/// theo build) rồi giữ trong bộ nhớ — không có DB, không có network call, nên không cần TTL.
/// </summary>
public sealed class VnAddressReferenceService : IVnAddressReferenceService
{
    private const string CacheKey = "shipping:vn-address:2025";
    private readonly IMemoryCache _cache;

    public VnAddressReferenceService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public string Version => VietnamAddressReferenceData2025.Version;

    public IReadOnlyList<ProvinceDto> GetProvinces() => Snapshot().Provinces;

    public IReadOnlyList<WardDto> GetWards(string provinceCode)
    {
        if (string.IsNullOrWhiteSpace(provinceCode)) return Array.Empty<WardDto>();
        var normalized = provinceCode.Trim();
        return Snapshot().WardsByProvince.TryGetValue(normalized, out var wards)
            ? wards
            : Array.Empty<WardDto>();
    }

    public bool ProvinceExists(string provinceCode)
        => !string.IsNullOrWhiteSpace(provinceCode)
           && Snapshot().WardsByProvince.ContainsKey(provinceCode.Trim());

    private sealed record Loaded(
        IReadOnlyList<ProvinceDto> Provinces,
        IReadOnlyDictionary<string, IReadOnlyList<WardDto>> WardsByProvince);

    private Loaded Snapshot()
    {
        if (_cache.TryGetValue(CacheKey, out Loaded? cached) && cached is not null) return cached;

        var rows = JsonSerializer.Deserialize<List<ProvinceRow>>(VietnamAddressReferenceData2025.RawJson)
            ?? new List<ProvinceRow>();

        var provinces = new List<ProvinceDto>(rows.Count);
        var wardsByProvince = new Dictionary<string, IReadOnlyList<WardDto>>(StringComparer.Ordinal);

        foreach (var row in rows)
        {
            provinces.Add(new ProvinceDto(row.C, row.N));
            wardsByProvince[row.C] = row.W
                .Select(w => new WardDto(w.C, w.N, row.C))
                .ToList();
        }

        var loaded = new Loaded(provinces, wardsByProvince);
        // Dữ liệu tĩnh nhúng trong assembly (không đổi khi chạy) — cache vô thời hạn tới khi app restart.
        _cache.Set(CacheKey, loaded, new MemoryCacheEntryOptions { Priority = CacheItemPriority.NeverRemove });
        return loaded;
    }

    private sealed class ProvinceRow
    {
        [JsonPropertyName("c")] public string C { get; set; } = "";
        [JsonPropertyName("n")] public string N { get; set; } = "";
        [JsonPropertyName("w")] public List<WardRow> W { get; set; } = new();
    }

    private sealed class WardRow
    {
        [JsonPropertyName("c")] public string C { get; set; } = "";
        [JsonPropertyName("n")] public string N { get; set; } = "";
    }
}

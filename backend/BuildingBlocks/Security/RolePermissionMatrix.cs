namespace BuildingBlocks.Security;

/// <summary>Một ô trong ma trận role -> permission, kèm phiên bản seed đã giới thiệu nó.</summary>
public sealed record RoleGrant(string Permission, int SinceVersion);

/// <summary>
/// MA TRẬN VAI TRÒ -> QUYỀN (W1-1). Đây là hợp đồng mà các wave sau dựa vào;
/// tài liệu sinh ra từ đây là <c>docs/permission-matrix.md</c>.
///
/// Nguyên tắc seed (xem <c>Identity/Services/RolePermissionSeeder.cs</c>):
/// <list type="number">
///   <item><description>CHỈ THÊM, không bao giờ thu hồi — admin gỡ tay quyền nào thì nó
///   phải sống sót qua mọi lần khởi động lại.</description></item>
///   <item><description>Mỗi role lưu một claim <see cref="SeedVersionClaimType"/>. Lần seed
///   sau chỉ cấp những quyền có <c>SinceVersion</c> lớn hơn phiên bản đã lưu.</description></item>
///   <item><description>Muốn trả role về mặc định thì dùng hành động "reset role" tường minh,
///   không dựa vào việc seeder tự cấp lại.</description></item>
/// </list>
///
/// <see cref="Roles.Admin"/> luôn có TOÀN BỘ quyền (break-glass) và cũng được
/// <see cref="PermissionAuthorizationHandler"/> bypass.
/// </summary>
public static class RolePermissionMatrix
{
    /// <summary>Tăng số này khi thêm quyền mới cho một role đã tồn tại.</summary>
    public const int CurrentVersion = 2;

    /// <summary>Loại claim lưu phiên bản seed trên từng role.</summary>
    public const string SeedVersionClaimType = "PermissionSeedVersion";

    private static readonly Dictionary<string, List<RoleGrant>> _matrix = RolePermissionMatrixData.Build();

    /// <summary>
    /// Quyền bị thu hồi khỏi Manager bởi W0-3 (cấp nhầm ở các bản seed cũ). Chỉ áp dụng
    /// một lần cho DB chưa có dấu phiên bản, để bản backup cũ khôi phục về cũng sạch.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, string[]> LegacyRevocations =
        new Dictionary<string, string[]>
        {
            [Roles.Manager] = new[] { Permissions.Users.Create, Permissions.Users.ManageRoles }
        };

    /// <summary>Các role có mặt trong ma trận (gồm cả Admin).</summary>
    public static IReadOnlyList<string> RoleNames() =>
        Roles.All.Where(r => r == Roles.Admin || _matrix.ContainsKey(r)).ToList();

    /// <summary>Toàn bộ quyền của một role. Admin = tất cả.</summary>
    public static IReadOnlyList<string> For(string role)
    {
        if (role == Roles.Admin) return Permissions.GetAllPermissions();
        return _matrix.TryGetValue(role, out var grants)
            ? grants.Select(g => g.Permission).Distinct(StringComparer.Ordinal).ToList()
            : Array.Empty<string>();
    }

    /// <summary>Quyền cần cấp thêm cho một role đang ở phiên bản <paramref name="storedVersion"/>.</summary>
    public static IReadOnlyList<string> GrantsSince(string role, int storedVersion)
    {
        if (role == Roles.Admin) return Permissions.GetAllPermissions();
        return _matrix.TryGetValue(role, out var grants)
            ? grants.Where(g => g.SinceVersion > storedVersion)
                    .Select(g => g.Permission)
                    .Distinct(StringComparer.Ordinal)
                    .ToList()
            : Array.Empty<string>();
    }

    /// <summary>Các role (không tính Admin) đang giữ một quyền — dùng để sinh bảng tài liệu.</summary>
    public static IReadOnlyList<string> RolesHolding(string permission) =>
        _matrix.Where(kv => kv.Value.Any(g => g.Permission == permission))
               .Select(kv => kv.Key)
               .OrderBy(r => Array.IndexOf(Roles.All, r))
               .ToList();

    /// <summary>Quyền khai báo trong ma trận nhưng không tồn tại trong danh mục (phải rỗng).</summary>
    public static IReadOnlyList<string> UnknownPermissions()
    {
        var catalog = Permissions.GetAllPermissions().ToHashSet(StringComparer.Ordinal);
        return _matrix.SelectMany(kv => kv.Value.Select(g => g.Permission))
                      .Where(p => !catalog.Contains(p))
                      .Distinct(StringComparer.Ordinal)
                      .OrderBy(p => p, StringComparer.Ordinal)
                      .ToList();
    }
}

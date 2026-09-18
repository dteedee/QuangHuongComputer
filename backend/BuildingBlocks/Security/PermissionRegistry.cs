namespace BuildingBlocks.Security;

public enum PermissionType { View, Create, Edit, Delete, Approve, Export, Manage }

/// <summary>Mô tả một quyền để hiển thị trên màn hình phân quyền của admin.</summary>
public class PermissionDefinition
{
    public string Key { get; set; } = "";
    public string Module { get; set; } = "";
    /// <summary>Tên module bằng tiếng Việt, dùng làm tiêu đề nhóm trên UI.</summary>
    public string ModuleDisplayName { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string Description { get; set; } = "";
    public PermissionType Type { get; set; }
    /// <summary>Quyền cha bắt buộc phải có kèm (thường là quyền View của module).</summary>
    public string? DependsOn { get; set; }
}

/// <summary>
/// Metadata tiếng Việt cho từng permission trong <see cref="Permissions"/>.
///
/// BẤT BIẾN (có unit test <c>PermissionRegistryTests</c> canh giữ): tập key của registry
/// PHẢI bằng đúng <see cref="Permissions.GetAllPermissions"/>. Thêm hằng số mới mà quên
/// mô tả ở đây thì test đỏ — đó là cách duy nhất giữ màn hình phân quyền không bị lệch.
/// </summary>
public static class PermissionRegistry
{
    private static readonly List<PermissionDefinition> _permissions = PermissionRegistryDefinitions.Build();

    private static readonly Dictionary<string, PermissionDefinition> _byKey =
        _permissions.ToDictionary(p => p.Key, StringComparer.Ordinal);

    public static List<PermissionDefinition> GetAll() => _permissions;

    public static List<string> GetAllKeys() => _permissions.Select(p => p.Key).ToList();

    public static PermissionDefinition? Find(string key) =>
        _byKey.TryGetValue(key, out var def) ? def : null;

    public static Dictionary<string, List<PermissionDefinition>> GetGroupedByModule() =>
        _permissions.GroupBy(p => p.Module).ToDictionary(g => g.Key, g => g.ToList());

    /// <summary>
    /// Loại bỏ quyền thiếu quyền cha. Lặp đến điểm bất động nên chuỗi phụ thuộc
    /// nhiều tầng (A -> B -> C) cũng bị cắt đúng, không chỉ một tầng.
    /// </summary>
    public static List<string> ValidatePermissions(List<string> requestedPermissions)
    {
        var validated = new List<string>(requestedPermissions.Distinct(StringComparer.Ordinal));
        bool removed;
        do
        {
            removed = false;
            foreach (var def in _permissions.Where(p => p.DependsOn != null))
            {
                if (validated.Contains(def.Key) && !validated.Contains(def.DependsOn!))
                {
                    validated.Remove(def.Key);
                    removed = true;
                }
            }
        } while (removed);

        return validated;
    }

    /// <summary>Quyền -> quyền cha còn thiếu (để UI gợi ý tick thêm).</summary>
    public static Dictionary<string, string> GetMissingDependencies(List<string> permissions)
    {
        var missing = new Dictionary<string, string>();
        foreach (var def in _permissions.Where(p => p.DependsOn != null))
        {
            if (permissions.Contains(def.DependsOn!)) continue;
            if (permissions.Contains(def.Key)) missing[def.Key] = def.DependsOn!;
        }
        return missing;
    }

    /// <summary>
    /// Bổ sung mọi quyền cha còn thiếu (ngược với <see cref="ValidatePermissions"/>:
    /// dùng khi seed ma trận role — thà cấp thêm quyền View còn hơn cấp một quyền chết).
    /// </summary>
    public static List<string> ExpandDependencies(IEnumerable<string> permissions)
    {
        var expanded = new HashSet<string>(permissions, StringComparer.Ordinal);
        bool added;
        do
        {
            added = false;
            foreach (var key in expanded.ToList())
            {
                var parent = Find(key)?.DependsOn;
                if (parent != null && expanded.Add(parent)) added = true;
            }
        } while (added);

        return expanded.OrderBy(p => p, StringComparer.Ordinal).ToList();
    }
}

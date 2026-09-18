using System.Reflection;

namespace BuildingBlocks.Security;

/// <summary>
/// Danh mục quyền (permission catalogue) — NGUỒN SỰ THẬT DUY NHẤT của hệ thống phân quyền.
///
/// Quy ước đặt tên: <c>Permissions.&lt;Module&gt;.&lt;Action&gt;</c> (W1-1, quyết định D01-D12).
/// Một vài module có nhóm con (ví dụ <c>Permissions.Sales.Quotations.View</c>) — vẫn giữ
/// nguyên tắc Module.Action, chỉ thêm một cấp nhóm cho dễ đọc.
///
/// Các hằng số được tách theo nhóm nghiệp vụ để giữ mỗi file dưới 200 dòng:
/// <list type="bullet">
///   <item><description><c>PermissionsCommerce.cs</c> — Catalog, Sales, Inventory, Payments</description></item>
///   <item><description><c>PermissionsOperations.cs</c> — Repair, Warranty, Content, CRM</description></item>
///   <item><description><c>PermissionsBackOffice.cs</c> — Accounting, HR, Users, Roles, Reporting, System</description></item>
/// </list>
///
/// KHÔNG xoá hằng số cũ: claim đã seed trong DB tham chiếu đúng chuỗi này.
/// Thêm quyền mới thì phải khai báo mô tả tiếng Việt trong <see cref="PermissionRegistry"/>
/// (có unit test chặn drift) và gán vào ma trận <see cref="RolePermissionMatrix"/>.
/// </summary>
public static partial class Permissions
{
    /// <summary>Loại claim chứa permission trong JWT / role claim.</summary>
    public const string PermissionType = "Permission";

    /// <summary>Tiền tố bắt buộc của mọi permission key.</summary>
    public const string Prefix = "Permissions.";

    private static List<string>? _all;

    /// <summary>
    /// Toàn bộ permission key khai báo trong lớp này (đệ quy qua các lớp lồng nhau,
    /// nên nhóm con như <c>Sales.Quotations</c> cũng được liệt kê). Kết quả được cache.
    /// </summary>
    public static List<string> GetAllPermissions()
    {
        if (_all is not null) return new List<string>(_all);

        var permissions = new List<string>();
        // Chỉ quét các lớp lồng nhau: hằng số ở lớp gốc (PermissionType, Prefix) là hạ tầng,
        // không phải quyền.
        foreach (var module in typeof(Permissions).GetNestedTypes(BindingFlags.Public))
        {
            Collect(module, permissions);
        }
        // Sắp xếp để thứ tự ổn định (docs + export JSON sinh ra deterministic).
        _all = permissions.Distinct().OrderBy(p => p, StringComparer.Ordinal).ToList();
        return new List<string>(_all);
    }

    private static void Collect(Type type, List<string> sink)
    {
        foreach (var field in type.GetFields(BindingFlags.Public | BindingFlags.Static))
        {
            if (!field.IsLiteral || field.IsInitOnly || field.FieldType != typeof(string)) continue;

            var value = field.GetValue(null) as string;
            if (!string.IsNullOrEmpty(value) && value.StartsWith(Prefix, StringComparison.Ordinal))
            {
                sink.Add(value);
            }
        }

        foreach (var nested in type.GetNestedTypes(BindingFlags.Public))
        {
            Collect(nested, sink);
        }
    }

    /// <summary>Module của một permission key ("Permissions.Sales.Quotations.View" -> "Sales").</summary>
    public static string ModuleOf(string permission)
    {
        var parts = permission.Split('.');
        return parts.Length >= 2 ? parts[1] : permission;
    }
}

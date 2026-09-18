using System.Text;
using System.Text.Json;

namespace BuildingBlocks.Security;

/// <summary>
/// Sinh tài liệu từ <see cref="PermissionRegistry"/> + <see cref="RolePermissionMatrix"/>.
/// Không chèn timestamp: đầu ra phải tất định để unit test phát hiện được drift.
/// </summary>
public static class PermissionCatalogExport
{
    private static readonly string[] DocRoles =
    {
        Roles.Admin, Roles.Manager, Roles.Sale, Roles.InventoryStaff, Roles.Accountant,
        Roles.HR, Roles.Marketing, Roles.TechnicianInShop, Roles.TechnicianOnSite,
        Roles.Customer, Roles.Supplier
    };

    private static readonly string[] DocRoleHeaders =
    {
        "Admin", "Manager", "Sale", "Kho", "KToán", "HR", "MKT", "KTV-Shop", "KTV-Site", "KH", "NCC"
    };

    public static string ToMarkdown()
    {
        var sb = new StringBuilder();
        var holders = DocRoles.ToDictionary(r => r, r => RolePermissionMatrix.For(r).ToHashSet(StringComparer.Ordinal));

        sb.AppendLine("# Ma trận phân quyền");
        sb.AppendLine();
        sb.AppendLine("> **FILE NÀY ĐƯỢC SINH TỰ ĐỘNG** từ `backend/BuildingBlocks/Security/` bởi");
        sb.AppendLine("> `UnitTests/Security/PermissionMatrixDocTests.cs`. Đừng sửa tay — sửa hằng số");
        sb.AppendLine("> trong `Permissions*.cs`, mô tả trong `PermissionRegistryDefinitions.cs`,");
        sb.AppendLine("> ma trận trong `RolePermissionMatrixData.cs` rồi chạy lại test.");
        sb.AppendLine();
        sb.AppendLine($"- Phiên bản seed hiện tại: **v{RolePermissionMatrix.CurrentVersion}**");
        sb.AppendLine($"- Tổng số quyền: **{PermissionRegistry.GetAll().Count}**");
        sb.AppendLine("- Admin luôn có toàn bộ quyền và được `PermissionAuthorizationHandler` bypass.");
        sb.AppendLine("- Seed chỉ THÊM quyền; quyền admin gỡ tay không bị cấp lại (xem `RolePermissionSeeder`).");
        sb.AppendLine();

        sb.AppendLine("## Tổng quan vai trò");
        sb.AppendLine();
        sb.AppendLine("| Vai trò | Số quyền | Phạm vi |");
        sb.AppendLine("|---|---:|---|");
        foreach (var role in DocRoles)
        {
            sb.AppendLine($"| `{role}` | {holders[role].Count} | {RoleScope(role)} |");
        }
        sb.AppendLine();

        sb.AppendLine("## Chi tiết theo module");
        sb.AppendLine();
        foreach (var group in PermissionRegistry.GetAll().GroupBy(p => p.Module))
        {
            var moduleDisplay = group.First().ModuleDisplayName;
            sb.AppendLine($"### {group.Key} — {moduleDisplay}");
            sb.AppendLine();
            sb.AppendLine("| Quyền | Mô tả | Loại | Phụ thuộc | " + string.Join(" | ", DocRoleHeaders) + " |");
            sb.AppendLine("|---|---|---|---|" + string.Concat(Enumerable.Repeat(":-:|", DocRoleHeaders.Length)));

            foreach (var def in group)
            {
                var marks = DocRoles.Select(r => holders[r].Contains(def.Key) ? "x" : "");
                var dependsOn = def.DependsOn is null ? "" : $"`{ShortKey(def.DependsOn)}`";
                sb.AppendLine($"| `{ShortKey(def.Key)}` | {def.DisplayName} | {def.Type} | {dependsOn} | "
                              + string.Join(" | ", marks) + " |");
            }
            sb.AppendLine();
        }

        sb.AppendLine("## Endpoint công khai (không cần đăng nhập)");
        sb.AppendLine();
        sb.AppendLine("Mọi endpoint KHÔNG nằm trong bảng này phải mang một policy permission.");
        sb.AppendLine($"Route chứa đoạn {string.Join(", ", PublicEndpointAllowList.NeverPublicSegments.Select(s => $"`{s}`"))} không bao giờ công khai.");
        sb.AppendLine();
        sb.AppendLine("| Route | Method | Lý do |");
        sb.AppendLine("|---|---|---|");
        foreach (var rule in PublicEndpointAllowList.Rules)
        {
            var methods = rule.Methods.Length == 0 ? "*" : string.Join("/", rule.Methods);
            sb.AppendLine($"| `{rule.Pattern}` | {methods} | {rule.Justification} |");
        }
        sb.AppendLine();

        return sb.ToString();
    }

    public static string ToJson()
    {
        var payload = new
        {
            seedVersion = RolePermissionMatrix.CurrentVersion,
            permissionType = Permissions.PermissionType,
            permissions = PermissionRegistry.GetAll().Select(p => new
            {
                key = p.Key,
                module = p.Module,
                moduleDisplayName = p.ModuleDisplayName,
                displayName = p.DisplayName,
                type = p.Type.ToString(),
                dependsOn = p.DependsOn,
                roles = DocRoles.Where(r => RolePermissionMatrix.For(r).Contains(p.Key)).ToArray()
            }).ToArray(),
            roles = DocRoles.ToDictionary(r => r, r => RolePermissionMatrix.For(r).OrderBy(x => x, StringComparer.Ordinal).ToArray()),
            publicEndpoints = PublicEndpointAllowList.Rules.Select(r => new
            {
                pattern = r.Pattern,
                methods = r.Methods,
                justification = r.Justification
            }).ToArray()
        };

        return JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        });
    }

    /// <summary>"Permissions.Sales.ViewAll" -> "Sales.ViewAll" cho gọn bảng.</summary>
    private static string ShortKey(string key) =>
        key.StartsWith(Permissions.Prefix, StringComparison.Ordinal) ? key[Permissions.Prefix.Length..] : key;

    private static string RoleScope(string role) => role switch
    {
        Roles.Admin => "Toàn quyền (break-glass).",
        Roles.Manager => "Quản lý cửa hàng: mọi nghiệp vụ trừ cấu hình hệ thống, tạo tài khoản và phân vai trò.",
        Roles.Sale => "Bán hàng: POS, đơn hàng, báo giá, khách hàng tiềm năng, thu COD.",
        Roles.InventoryStaff => "Kho: nhập/xuất/kiểm kê, lập đề nghị mua — không duyệt, không tài chính.",
        Roles.Accountant => "Kế toán: hoá đơn, công nợ, thanh toán, báo cáo tài chính, tham số lương/thuế (D06).",
        Roles.HR => "Nhân sự: hồ sơ, chấm công, nghỉ phép, bảng lương. Chỉ ĐỌC tham số luật.",
        Roles.Marketing => "Nội dung website + chiến dịch CRM.",
        Roles.TechnicianInShop => "Sửa chữa tại cửa hàng + xử lý bảo hành.",
        Roles.TechnicianOnSite => "Sửa chữa tại nhà khách.",
        Roles.Customer => "Khách hàng: đơn/bảo hành/sửa chữa của chính mình. Không có quyền nhân viên nào.",
        Roles.Supplier => "Nhà cung cấp: xem đơn mua liên quan.",
        _ => ""
    };
}

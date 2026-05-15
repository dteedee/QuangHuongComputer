namespace BuildingBlocks.Security;

public enum PermissionType { View, Create, Edit, Delete, Approve, Export, Manage }

public class PermissionDefinition
{
    public string Key { get; set; } = "";
    public string Module { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string Description { get; set; } = "";
    public PermissionType Type { get; set; }
    public string? DependsOn { get; set; }
}

public static class PermissionRegistry
{
    private static readonly List<PermissionDefinition> _permissions = new();

    static PermissionRegistry()
    {
        RegisterModule("Catalog", "Quản lý sản phẩm", new[] {
            ("View", "Xem danh sách sản phẩm", PermissionType.View),
            ("Create", "Thêm sản phẩm mới", PermissionType.Create),
            ("Edit", "Chỉnh sửa sản phẩm", PermissionType.Edit),
            ("Delete", "Xóa sản phẩm", PermissionType.Delete),
            ("Export", "Xuất file sản phẩm", PermissionType.Export),
        });

        RegisterModule("Sales", "Quản lý bán hàng", new[] {
            ("View", "Xem đơn hàng", PermissionType.View),
            ("Create", "Tạo đơn hàng", PermissionType.Create),
            ("Edit", "Chỉnh sửa đơn hàng", PermissionType.Edit),
            ("UpdateStatus", "Cập nhật trạng thái", PermissionType.Manage),
            ("Cancel", "Hủy đơn hàng", PermissionType.Delete),
            ("Export", "Xuất báo cáo bán hàng", PermissionType.Export),
        });

        RegisterModule("Inventory", "Quản lý kho", new[] {
            ("View", "Xem tồn kho", PermissionType.View),
            ("Adjust", "Điều chỉnh tồn kho", PermissionType.Edit),
            ("CreatePO", "Tạo đơn nhập hàng", PermissionType.Create),
            ("ApprovePO", "Duyệt đơn nhập hàng", PermissionType.Approve),
            ("ReceivePO", "Nhận hàng nhập kho", PermissionType.Manage),
            ("Stocktake", "Kiểm kê kho", PermissionType.Manage),
            ("Export", "Xuất báo cáo kho", PermissionType.Export),
        });

        RegisterModule("Accounting", "Kế toán", new[] {
            ("View", "Xem hóa đơn/sổ sách", PermissionType.View),
            ("CreateInvoice", "Tạo hóa đơn", PermissionType.Create),
            ("EditInvoice", "Sửa hóa đơn", PermissionType.Edit),
            ("ApproveDebt", "Duyệt công nợ", PermissionType.Approve),
            ("ManageExpense", "Quản lý chi phí", PermissionType.Manage),
            ("Export", "Xuất báo cáo tài chính", PermissionType.Export),
        });

        RegisterModule("HR", "Nhân sự", new[] {
            ("View", "Xem nhân viên", PermissionType.View),
            ("Create", "Thêm nhân viên", PermissionType.Create),
            ("Edit", "Sửa thông tin nhân viên", PermissionType.Edit),
            ("Delete", "Xóa nhân viên", PermissionType.Delete),
            ("ManagePayroll", "Quản lý lương", PermissionType.Manage),
            ("ApproveLeave", "Duyệt nghỉ phép", PermissionType.Approve),
            ("ManageTimesheet", "Quản lý chấm công", PermissionType.Manage),
        });

        RegisterModule("CRM", "Khách hàng", new[] {
            ("View", "Xem khách hàng/leads", PermissionType.View),
            ("Create", "Thêm leads", PermissionType.Create),
            ("Edit", "Sửa thông tin KH", PermissionType.Edit),
            ("ManageCampaigns", "Quản lý chiến dịch", PermissionType.Manage),
            ("ViewAnalytics", "Xem phân tích KH", PermissionType.View),
        });

        RegisterModule("Content", "Nội dung", new[] {
            ("View", "Xem bài viết/banner", PermissionType.View),
            ("ManagePosts", "Quản lý bài viết", PermissionType.Manage),
            ("ManageBanners", "Quản lý banner", PermissionType.Manage),
            ("ManagePages", "Quản lý trang", PermissionType.Manage),
            ("ManageMenus", "Quản lý menu", PermissionType.Manage),
        });

        RegisterModule("Warranty", "Bảo hành", new[] {
            ("View", "Xem bảo hành", PermissionType.View),
            ("Process", "Xử lý bảo hành", PermissionType.Manage),
            ("Approve", "Duyệt bảo hành", PermissionType.Approve),
        });

        RegisterModule("Repair", "Sửa chữa", new[] {
            ("View", "Xem phiếu sửa chữa", PermissionType.View),
            ("Create", "Tạo phiếu sửa chữa", PermissionType.Create),
            ("Edit", "Cập nhật tiến độ", PermissionType.Edit),
            ("Approve", "Duyệt báo giá", PermissionType.Approve),
            ("Complete", "Hoàn thành sửa chữa", PermissionType.Manage),
        });

        RegisterModule("Users", "Người dùng", new[] {
            ("View", "Xem danh sách users", PermissionType.View),
            ("Create", "Tạo user mới", PermissionType.Create),
            ("Edit", "Sửa thông tin user", PermissionType.Edit),
            ("Delete", "Xóa user", PermissionType.Delete),
            ("ManageRoles", "Phân quyền user", PermissionType.Manage),
        });

        RegisterModule("Roles", "Vai trò", new[] {
            ("View", "Xem danh sách roles", PermissionType.View),
            ("Create", "Tạo role mới", PermissionType.Create),
            ("Edit", "Sửa role/phân quyền", PermissionType.Edit),
            ("Delete", "Xóa role", PermissionType.Delete),
        });

        RegisterModule("Reporting", "Báo cáo", new[] {
            ("View", "Xem báo cáo", PermissionType.View),
            ("ViewFinancial", "Xem báo cáo tài chính", PermissionType.View),
            ("Export", "Xuất báo cáo", PermissionType.Export),
        });

        RegisterModule("System", "Hệ thống", new[] {
            ("View", "Xem cấu hình", PermissionType.View),
            ("Config", "Thay đổi cấu hình", PermissionType.Manage),
        });
    }

    private static void RegisterModule(
        string module,
        string moduleDisplayName,
        (string action, string description, PermissionType type)[] actions)
    {
        foreach (var (action, description, type) in actions)
        {
            _permissions.Add(new PermissionDefinition
            {
                Key = $"Permissions.{module}.{action}",
                Module = module,
                DisplayName = description,
                Description = $"{moduleDisplayName} - {description}",
                Type = type,
                DependsOn = type == PermissionType.View ? null : $"Permissions.{module}.View"
            });
        }
    }

    public static List<PermissionDefinition> GetAll() => _permissions;

    public static List<string> GetAllKeys() => _permissions.Select(p => p.Key).ToList();

    public static Dictionary<string, List<PermissionDefinition>> GetGroupedByModule() =>
        _permissions.GroupBy(p => p.Module).ToDictionary(g => g.Key, g => g.ToList());

    /// <summary>Validate: action permissions require their View dependency</summary>
    public static List<string> ValidatePermissions(List<string> requestedPermissions)
    {
        var validated = new List<string>(requestedPermissions);
        foreach (var perm in _permissions.Where(p => p.DependsOn != null))
        {
            if (validated.Contains(perm.Key) && !validated.Contains(perm.DependsOn!))
                validated.Remove(perm.Key);
        }
        return validated;
    }

    /// <summary>Get missing dependencies for a permission set</summary>
    public static Dictionary<string, string> GetMissingDependencies(List<string> permissions)
    {
        var missing = new Dictionary<string, string>();
        foreach (var perm in _permissions.Where(p => p.DependsOn != null))
        {
            if (permissions.Contains(perm.Key) && !permissions.Contains(perm.DependsOn!))
                missing[perm.Key] = perm.DependsOn!;
        }
        return missing;
    }
}

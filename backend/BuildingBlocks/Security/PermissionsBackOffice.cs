namespace BuildingBlocks.Security;

/// <summary>Nhóm quyền hậu cần/quản trị: Accounting, HR, Users, Roles, Reporting, System.</summary>
public static partial class Permissions
{
    public static class Accounting
    {
        public const string ViewInvoices = "Permissions.Accounting.ViewInvoices";
        public const string CreateInvoice = "Permissions.Accounting.CreateInvoice";
        public const string EditInvoice = "Permissions.Accounting.EditInvoice";
        public const string DeleteInvoice = "Permissions.Accounting.DeleteInvoice";
        public const string ApproveCredit = "Permissions.Accounting.ApproveCredit";
        public const string ViewReports = "Permissions.Accounting.ViewReports";
        public const string ManageDebt = "Permissions.Accounting.ManageDebt";
        /// <summary>Gộp toàn bộ vòng đời hoá đơn (tạo/sửa/huỷ/phát hành HĐĐT theo D07).</summary>
        public const string ManageInvoices = "Permissions.Accounting.ManageInvoices";
        public const string ManageExpense = "Permissions.Accounting.ManageExpense";
        public const string Export = "Permissions.Accounting.Export";
    }

    public static class HR
    {
        public const string ViewEmployees = "Permissions.HR.ViewEmployees";
        public const string ManageEmployees = "Permissions.HR.ManageEmployees";
        public const string ViewAttendance = "Permissions.HR.ViewAttendance";
        public const string ManageAttendance = "Permissions.HR.ManageAttendance";
        public const string ViewPayroll = "Permissions.HR.ViewPayroll";
        public const string ManagePayroll = "Permissions.HR.ManagePayroll";
        public const string ApproveLeave = "Permissions.HR.ApproveLeave";
        /// <summary>
        /// D06: sửa tham số luật (mức lương tối thiểu vùng, trần BHXH, bậc thuế TNCN).
        /// Mặc định CHỈ Admin + Accountant có quyền ghi; HR chỉ đọc qua
        /// <see cref="ViewPayroll"/>.
        /// </summary>
        public const string ManageStatutoryParameters = "Permissions.HR.ManageStatutoryParameters";
    }

    public static class Users
    {
        public const string View = "Permissions.Users.View";
        public const string Create = "Permissions.Users.Create";
        public const string Edit = "Permissions.Users.Edit";
        public const string Delete = "Permissions.Users.Delete";
        public const string ManageRoles = "Permissions.Users.ManageRoles";
    }

    public static class Roles
    {
        public const string View = "Permissions.Roles.View";
        public const string Create = "Permissions.Roles.Create";
        public const string Edit = "Permissions.Roles.Edit";
        public const string Delete = "Permissions.Roles.Delete";
    }

    public static class Reporting
    {
        public const string ViewSales = "Permissions.Reporting.ViewSales";
        public const string ViewInventory = "Permissions.Reporting.ViewInventory";
        public const string ViewFinancial = "Permissions.Reporting.ViewFinancial";
        public const string ViewRepair = "Permissions.Reporting.ViewRepair";
        public const string ViewHR = "Permissions.Reporting.ViewHR";
        public const string ExportReports = "Permissions.Reporting.ExportReports";
    }

    public static class System
    {
        public const string ViewConfig = "Permissions.System.ViewConfig";
        public const string ManageConfig = "Permissions.System.ManageConfig";
        public const string ViewLogs = "Permissions.System.ViewLogs";
        public const string ManageLogs = "Permissions.System.ManageLogs";
        public const string ManageBackups = "Permissions.System.ManageBackups";
    }
}

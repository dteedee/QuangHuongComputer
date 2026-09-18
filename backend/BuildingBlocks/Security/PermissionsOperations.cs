namespace BuildingBlocks.Security;

/// <summary>Nhóm quyền vận hành: Repair, Warranty, Content, CRM.</summary>
public static partial class Permissions
{
    public static class Repair
    {
        public const string Book = "Permissions.Repair.Book";
        public const string ViewOwn = "Permissions.Repair.ViewOwn";
        public const string ViewAll = "Permissions.Repair.ViewAll";
        public const string UpdateStatus = "Permissions.Repair.UpdateStatus";
        public const string AssignTechnician = "Permissions.Repair.AssignTechnician";
        public const string CreateQuote = "Permissions.Repair.CreateQuote";
        public const string ApproveQuote = "Permissions.Repair.ApproveQuote";
        public const string Complete = "Permissions.Repair.Complete";
    }

    public static class Warranty
    {
        public const string SubmitClaim = "Permissions.Warranty.SubmitClaim";
        public const string ViewOwn = "Permissions.Warranty.ViewOwn";
        public const string ViewAll = "Permissions.Warranty.ViewAll";
        public const string ReviewClaim = "Permissions.Warranty.ReviewClaim";
        public const string ApproveClaim = "Permissions.Warranty.ApproveClaim";
        /// <summary>Kiểm duyệt nội dung khách gửi kèm (ảnh, mô tả) trong yêu cầu bảo hành.</summary>
        public const string Moderate = "Permissions.Warranty.Moderate";
    }

    public static class Content
    {
        public const string ViewPages = "Permissions.Content.ViewPages";
        public const string ManagePages = "Permissions.Content.ManagePages";
        public const string ViewPosts = "Permissions.Content.ViewPosts";
        public const string ManagePosts = "Permissions.Content.ManagePosts";
        public const string ViewCoupons = "Permissions.Content.ViewCoupons";
        public const string ManageCoupons = "Permissions.Content.ManageCoupons";
        public const string ViewBanners = "Permissions.Content.ViewBanners";
        public const string ManageBanners = "Permissions.Content.ManageBanners";
        public const string ManageMedia = "Permissions.Content.ManageMedia";
        public const string ManageMenus = "Permissions.Content.ManageMenus";
        /// <summary>D10: hộp thư liên hệ từ storefront.</summary>
        public const string ManageContacts = "Permissions.Content.ManageContacts";
    }

    public static class CRM
    {
        public const string ViewCustomers = "Permissions.CRM.ViewCustomers";
        public const string ManageCustomers = "Permissions.CRM.ManageCustomers";
        public const string ViewLeads = "Permissions.CRM.ViewLeads";
        public const string ManageLeads = "Permissions.CRM.ManageLeads";
        public const string ViewSegments = "Permissions.CRM.ViewSegments";
        public const string ManageSegments = "Permissions.CRM.ManageSegments";
        public const string ViewAnalytics = "Permissions.CRM.ViewAnalytics";
        public const string ManageTasks = "Permissions.CRM.ManageTasks";
        public const string ViewCampaigns = "Permissions.CRM.ViewCampaigns";
        public const string ManageCampaigns = "Permissions.CRM.ManageCampaigns";
        /// <summary>Bấm nút gửi chiến dịch thật (email/SMS) — tách khỏi quyền soạn chiến dịch.</summary>
        public const string SendCampaigns = "Permissions.CRM.SendCampaigns";
    }
}

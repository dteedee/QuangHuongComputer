using BuildingBlocks.SharedKernel;
namespace Identity.Domain;

public class TwoFactorConfig : Entity<Guid>
{
    public string UserId { get; set; } = "";
    public string TotpSecret { get; set; } = "";
    public bool IsEnabled { get; set; }
    public DateTime? EnabledDate { get; set; }
    public string BackupCodes { get; set; } = ""; // JSON array of hashed codes
}

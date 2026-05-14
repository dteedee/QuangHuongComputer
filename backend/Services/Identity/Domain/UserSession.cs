using BuildingBlocks.SharedKernel;
namespace Identity.Domain;

public class UserSession : Entity<Guid>
{
    public string UserId { get; set; } = "";
    public string DeviceInfo { get; set; } = "";
    public string IpAddress { get; set; } = "";
    public string UserAgent { get; set; } = "";
    public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;
    public bool IsRevoked { get; set; }
    public string? RefreshTokenId { get; set; }
}

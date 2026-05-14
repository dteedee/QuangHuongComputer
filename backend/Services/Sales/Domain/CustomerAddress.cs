using BuildingBlocks.SharedKernel;
namespace Sales.Domain;

public class CustomerAddress : Entity<Guid>
{
    public Guid UserId { get; set; }
    public string Label { get; set; } = "Nhà";
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Province { get; set; } = "";
    public string District { get; set; } = "";
    public string Ward { get; set; } = "";
    public string StreetAddress { get; set; } = "";
    public bool IsDefault { get; set; }
}

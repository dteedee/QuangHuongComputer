using BuildingBlocks.SharedKernel;

namespace Repair.Domain;

public class Technician : Entity<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string Specialty { get; private set; } = string.Empty;
    public bool IsAvailable { get; private set; }
    public decimal HourlyRate { get; private set; }

    /// <summary>
    /// Identity user id of the account that logs in as this technician (nullable,
    /// filtered-unique index — see RepairDbContext). W0-11: technician endpoints
    /// used to compare WorkOrder.TechnicianId (this row's Id) directly against
    /// the caller's Identity user id, a different id space entirely, so every
    /// technician got 403/empty lists. This is the link that makes resolution
    /// possible. Technician CRUD/workspace proper is W2-13.
    /// </summary>
    public Guid? UserId { get; private set; }

    public Technician(string name, string specialty, decimal hourlyRate = 50.0m)
    {
        Id = Guid.NewGuid();
        Name = name;
        Specialty = specialty;
        HourlyRate = hourlyRate;
        IsAvailable = true;
    }

    protected Technician() { }

    public void UpdateAvailability(bool isAvailable)
    {
        IsAvailable = isAvailable;
    }

    /// <summary>Links (or re-links) this technician row to an Identity user.</summary>
    public void LinkUser(Guid userId)
    {
        UserId = userId;
        UpdatedAt = DateTime.UtcNow;
    }
}

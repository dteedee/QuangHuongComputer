using BuildingBlocks.SharedKernel;

namespace Repair.Domain;

public class Technician : Entity<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string Specialty { get; private set; } = string.Empty;
    public bool IsAvailable { get; private set; }
    public decimal HourlyRate { get; private set; }

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
}

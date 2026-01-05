using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

public class Supplier : Entity<Guid>
{
    public string Name { get; private set; }
    public string ContactPerson { get; private set; }
    public string Email { get; private set; }
    public string Phone { get; private set; }
    public string Address { get; private set; }

    public Supplier(string name, string contactPerson, string email, string phone, string address)
    {
        Id = Guid.NewGuid();
        Name = name;
        ContactPerson = contactPerson;
        Email = email;
        Phone = phone;
        Address = address;
    }

    protected Supplier() { }
}

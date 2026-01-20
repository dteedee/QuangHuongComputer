using BuildingBlocks;
using BuildingBlocks.Validation;

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

    public void UpdateDetails(string name, string contactPerson, string email, string phone, string address)
    {
        Name = name;
        ContactPerson = contactPerson;
        Email = email;
        Phone = phone;
        Address = address;
    }

    public ValidationResult Validate()
    {
        var result = new ValidationResult();

        if (!CommonValidators.IsNotEmpty(Name))
        {
            result.AddError(nameof(Name), "Name is required");
        }

        if (!CommonValidators.IsNotEmpty(ContactPerson))
        {
            result.AddError(nameof(ContactPerson), "Contact person is required");
        }

        if (!CommonValidators.IsValidEmail(Email))
        {
            result.AddError(nameof(Email), "Invalid email format");
        }

        if (!CommonValidators.IsValidPhone(Phone))
        {
            result.AddError(nameof(Phone), "Invalid phone format");
        }

        if (!CommonValidators.IsNotEmpty(Address))
        {
            result.AddError(nameof(Address), "Address is required");
        }

        return result;
    }
}

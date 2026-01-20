namespace Sales.Domain.ValueObjects;

public record Address(
    string FullName,
    string PhoneNumber,
    string AddressLine1,
    string? AddressLine2,
    string City,
    string District,
    string Ward,
    string PostalCode
)
{
    public static Address Create(
        string fullName,
        string phoneNumber,
        string addressLine1,
        string? addressLine2,
        string city,
        string district,
        string ward,
        string postalCode)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            throw new ArgumentException("Full name is required", nameof(fullName));

        if (string.IsNullOrWhiteSpace(phoneNumber))
            throw new ArgumentException("Phone number is required", nameof(phoneNumber));

        if (string.IsNullOrWhiteSpace(addressLine1))
            throw new ArgumentException("Address line 1 is required", nameof(addressLine1));

        if (string.IsNullOrWhiteSpace(city))
            throw new ArgumentException("City is required", nameof(city));

        if (string.IsNullOrWhiteSpace(district))
            throw new ArgumentException("District is required", nameof(district));

        return new Address(fullName, phoneNumber, addressLine1, addressLine2, city, district, ward, postalCode);
    }

    public override string ToString()
    {
        var address = AddressLine2 != null
            ? $"{AddressLine1}, {AddressLine2}, {Ward}, {District}, {City}, {PostalCode}"
            : $"{AddressLine1}, {Ward}, {District}, {City}, {PostalCode}";
        return $"{FullName} - {PhoneNumber}\n{address}";
    }
}

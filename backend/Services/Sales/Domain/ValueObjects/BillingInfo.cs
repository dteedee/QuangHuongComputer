namespace Sales.Domain.ValueObjects;

public record BillingInfo(
    CustomerType Type,
    string? CompanyName,
    string? TaxCode,
    Address BillingAddress
)
{
    public static BillingInfo Create(
        CustomerType type,
        string? companyName,
        string? taxCode,
        Address billingAddress)
    {
        if (type == CustomerType.Organization)
        {
            if (string.IsNullOrWhiteSpace(companyName))
                throw new ArgumentException("Company name is required for organizations", nameof(companyName));

            if (string.IsNullOrWhiteSpace(taxCode))
                throw new ArgumentException("Tax code is required for organizations", nameof(taxCode));
        }

        return new BillingInfo(type, companyName, taxCode, billingAddress);
    }
}

public enum CustomerType
{
    Personal,
    Organization
}

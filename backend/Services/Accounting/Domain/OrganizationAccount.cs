using BuildingBlocks.SharedKernel;

namespace Accounting.Domain;

public class OrganizationAccount : Entity<Guid>
{
    public string Name { get; private set; }
    public decimal Balance { get; private set; }
    public decimal CreditLimit { get; private set; }
    public List<LedgerEntry> Entries { get; private set; } = new();

    public OrganizationAccount(string name, decimal creditLimit)
    {
        Id = Guid.NewGuid();
        Name = name;
        CreditLimit = creditLimit;
        Balance = 0;
    }

    protected OrganizationAccount() { }

    public void RecordTransaction(decimal amount, TransactionType type, string description, Currency currency, decimal exchangeRate = 1)
    {
        var amountInBase = currency == Currency.VND ? amount : amount * exchangeRate;
        
        if (type == TransactionType.Debit && (Balance + amountInBase) > CreditLimit)
            throw new InvalidOperationException("Credit limit exceeded");

        Balance += (type == TransactionType.Debit ? amountInBase : -amountInBase);
        
        Entries.Add(new LedgerEntry(amount, type, description, currency, exchangeRate));
    }
}

public class LedgerEntry
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public DateTime Date { get; private set; } = DateTime.UtcNow;
    public decimal Amount { get; private set; }
    public TransactionType Type { get; private set; }
    public string Description { get; private set; }
    public Currency Currency { get; private set; }
    public decimal ExchangeRate { get; private set; }

    public LedgerEntry(decimal amount, TransactionType type, string description, Currency currency, decimal exchangeRate)
    {
        Amount = amount;
        Type = type;
        Description = description;
        Currency = currency;
        ExchangeRate = exchangeRate;
    }

    protected LedgerEntry() { }
}

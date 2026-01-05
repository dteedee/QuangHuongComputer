namespace Accounting.Domain;

public enum Currency
{
    USD,
    VND
}

public enum TransactionType
{
    Debit,  // Outgoing / Increase Debt
    Credit  // Incoming / Payment
}

public enum InvoiceStatus
{
    Draft,
    Issued,
    PartiallyPaid,
    Paid,
    Overdue,
    Cancelled
}

public enum InvoiceType
{
    Receivable, // AR - Customer owes us
    Payable     // AP - We owe supplier
}

public enum PaymentMethod
{
    Cash,
    BankTransfer,
    CreditCard,
    Momo,
    ZaloPay,
    VnPay
}

public enum AgingBucket
{
    None,
    Current,      // Not yet due
    Days1To30,    // 1-30 days overdue
    Days31To60,   // 31-60 days overdue
    Days61To90,   // 61-90 days overdue
    Over90Days    // 90+ days overdue
}


using Accounting.Domain;

namespace Accounting.DTOs;

public record CreateCashVoucherRequest(
    CashVoucherKind Kind,
    string FundCode,
    decimal Amount,
    string Description,
    string? CounterpartyName = null,
    DateTime? VoucherDate = null,
    Guid? ShiftSessionId = null,
    Guid? ExpenseId = null,
    Guid? InvoiceId = null,
    Guid? OrderId = null);

public record CashVoucherDto(
    Guid Id,
    string VoucherNumber,
    CashVoucherKind Kind,
    string FundCode,
    decimal Amount,
    decimal SignedAmount,
    DateTime VoucherDate,
    DateOnly BusinessDate,
    string Description,
    string? CounterpartyName,
    CashVoucherSource Source,
    Guid? ShiftSessionId,
    Guid? ExpenseId,
    Guid? InvoiceId,
    Guid? OrderId);

/// <summary>Một dòng sổ quỹ kèm số dư luỹ kế — số dư được tính khi đọc, không lưu.</summary>
public record CashBookEntryDto(CashVoucherDto Voucher, decimal RunningBalance);

public record CashBookDto(
    string FundCode,
    DateTime? From,
    DateTime? To,
    decimal OpeningBalance,
    decimal TotalIn,
    decimal TotalOut,
    decimal ClosingBalance,
    List<CashBookEntryDto> Entries);

public record CreditNoteDto(
    Guid Id,
    string CreditNoteNumber,
    CreditNoteType Type,
    CreditNoteStatus Status,
    CreditNoteReason ReasonCode,
    string Reason,
    decimal Amount,
    decimal NetAmount,
    decimal VatAmount,
    decimal VatRate,
    DateTime IssueDate,
    DateOnly? BusinessDate,
    Guid? OriginalInvoiceId,
    string? OriginalInvoiceNumber,
    Guid? OrderId,
    Guid? CustomerId);

public record CreateCreditNoteRequest(
    Guid OriginalInvoiceId,
    decimal Amount,
    CreditNoteReason ReasonCode,
    string Reason);

public record CancelCreditNoteRequest(string Reason);

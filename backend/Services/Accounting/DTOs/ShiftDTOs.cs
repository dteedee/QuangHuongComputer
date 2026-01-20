using Accounting.Domain;

namespace Accounting.DTOs;

/// <summary>
/// DTOs for Shift Management operations
/// </summary>

public record ShiftSessionDto(
    Guid Id,
    Guid CashierId,
    Guid WarehouseId,
    DateTime OpenedAt,
    DateTime? ClosedAt,
    decimal OpeningBalance,
    decimal? ClosingBalance,
    ShiftStatus Status,
    decimal? CashVariance,
    TimeSpan? Duration,
    List<ShiftTransactionDto> Transactions);

public record ShiftSessionListDto(
    Guid Id,
    Guid CashierId,
    Guid WarehouseId,
    DateTime OpenedAt,
    DateTime? ClosedAt,
    decimal OpeningBalance,
    decimal? ClosingBalance,
    ShiftStatus Status,
    decimal? CashVariance,
    TimeSpan? Duration);

public record OpenShiftRequest(
    Guid CashierId,
    Guid WarehouseId,
    decimal OpeningBalance);

public record CloseShiftRequest(
    decimal ActualCash);

public record RecordShiftTransactionRequest(
    string Description,
    decimal Amount,
    TransactionType Type,
    string? Reference = null);

public record ShiftTransactionDto(
    Guid Id,
    string Description,
    decimal Amount,
    TransactionType Type,
    DateTime Timestamp,
    string? Reference);

public record ShiftSummaryDto(
    int TotalShifts,
    int OpenShifts,
    int ClosedShifts,
    decimal TotalCashVariance,
    decimal AverageCashVariance);

public record CashierShiftHistoryDto(
    Guid CashierId,
    string CashierName,
    List<ShiftSessionListDto> Shifts,
    decimal TotalCashHandled,
    decimal AverageVariance);

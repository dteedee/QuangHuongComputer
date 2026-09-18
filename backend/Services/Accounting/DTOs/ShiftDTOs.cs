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
    decimal CashIn,
    decimal CashOut,
    decimal ExpectedCash,
    decimal? Variance,
    string? VarianceReason,
    Guid? VarianceApprovedBy,
    DateTime? VarianceApprovedAt,
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
    decimal? ExpectedCash,
    decimal? Variance,
    ShiftStatus Status);

/// <summary>
/// Mở ca. KHÔNG có <c>CashierId</c>: thu ngân luôn là người đang đăng nhập (lấy từ JWT).
/// Nhận id thu ngân từ body nghĩa là ai cũng mở được ca đứng tên người khác.
/// </summary>
public record OpenShiftRequest(
    Guid WarehouseId,
    decimal OpeningBalance);

/// <param name="ActualCash">Tiền mặt đếm được trong két.</param>
/// <param name="VarianceReason">Bắt buộc khi có chênh lệch so với số lẽ ra phải có.</param>
public record CloseShiftRequest(
    decimal ActualCash,
    string? VarianceReason = null);

public record ApproveShiftVarianceRequest(string? Note = null);

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
    ShiftTransactionSource Source,
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

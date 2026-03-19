using Accounting.Domain;

namespace Accounting.DTOs;

/// <summary>
/// DTOs for Expense Management operations
/// </summary>

// Expense Category DTOs
public record ExpenseCategoryDto(
    Guid Id,
    string Name,
    string Code,
    string? Description,
    bool IsActive);

public record CreateExpenseCategoryRequest(
    string Name,
    string Code,
    string? Description);

public record UpdateExpenseCategoryRequest(
    string Name,
    string? Description);

// Expense DTOs
public record ExpenseListDto(
    Guid Id,
    string ExpenseNumber,
    Guid CategoryId,
    string CategoryName,
    string Description,
    decimal Amount,
    decimal VatAmount,
    decimal TotalAmount,
    Currency Currency,
    DateTime ExpenseDate,
    ExpenseStatus Status,
    Guid? SupplierId,
    Guid? EmployeeId,
    DateTime CreatedAt);

public record ExpenseDetailDto(
    Guid Id,
    string ExpenseNumber,
    Guid CategoryId,
    string CategoryName,
    string Description,
    decimal Amount,
    decimal VatAmount,
    decimal TotalAmount,
    Currency Currency,
    DateTime ExpenseDate,
    ExpenseStatus Status,
    PaymentMethod? PaymentMethod,
    Guid? SupplierId,
    Guid? EmployeeId,
    Guid CreatedBy,
    Guid? ApprovedBy,
    DateTime? ApprovedAt,
    DateTime? PaidAt,
    string? RejectionReason,
    string? Notes,
    string? ReceiptUrl,
    DateTime CreatedAt);

public record CreateExpenseRequest(
    Guid CategoryId,
    string Description,
    decimal Amount,
    decimal VatRate,
    string Currency,
    DateTime ExpenseDate,
    Guid? SupplierId,
    Guid? EmployeeId,
    string? Notes,
    string? ReceiptUrl);

public record UpdateExpenseRequest(
    Guid CategoryId,
    string Description,
    decimal Amount,
    decimal VatRate,
    DateTime ExpenseDate,
    Guid? SupplierId,
    Guid? EmployeeId,
    string? Notes,
    string? ReceiptUrl);

public record ApproveExpenseRequest(
    string? Notes);

public record RejectExpenseRequest(
    string Reason);

public record PayExpenseRequest(
    string PaymentMethod);

public record ExpenseSummaryDto(
    decimal TotalExpenses,
    decimal PendingAmount,
    decimal ApprovedAmount,
    decimal PaidAmount,
    int PendingCount,
    int ApprovedCount,
    int PaidCount,
    List<CategoryExpenseSummary> ByCategory);

public record CategoryExpenseSummary(
    Guid CategoryId,
    string CategoryName,
    string CategoryCode,
    decimal TotalAmount,
    int ExpenseCount);

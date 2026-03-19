using Accounting.Domain;
using Accounting.Infrastructure;
using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Accounting.Application.Consumers;

/// <summary>
/// Consumes PayrollPaidIntegrationEvent from HR module to automatically create
/// expense records when payroll is paid
/// </summary>
public class PayrollPaidConsumer : IConsumer<PayrollPaidIntegrationEvent>
{
    private readonly AccountingDbContext _dbContext;
    private readonly ILogger<PayrollPaidConsumer> _logger;
    private const string SALARY_CATEGORY_CODE = "SALARY";

    public PayrollPaidConsumer(AccountingDbContext dbContext, ILogger<PayrollPaidConsumer> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PayrollPaidIntegrationEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation(
            "Recording salary expense for Payroll {PayrollId}, Employee: {EmployeeName}, Amount: {Amount}",
            msg.PayrollId, msg.EmployeeName, msg.NetPay);

        // Find or create salary expense category
        var category = await _dbContext.ExpenseCategories
            .FirstOrDefaultAsync(c => c.Code == SALARY_CATEGORY_CODE);

        if (category == null)
        {
            _logger.LogInformation("Creating SALARY expense category");
            category = ExpenseCategory.Create("Lương nhân viên", SALARY_CATEGORY_CODE, "Chi phí lương và phụ cấp");
            _dbContext.ExpenseCategories.Add(category);
            await _dbContext.SaveChangesAsync();
        }

        // Create expense record
        var expense = Expense.Create(
            categoryId: category.Id,
            description: $"Lương tháng {msg.Month}/{msg.Year} - {msg.EmployeeName}",
            amount: msg.GrossPay,
            vatRate: 0, // No VAT on salary
            currency: Currency.VND,
            expenseDate: msg.PaidAt,
            createdBy: Guid.Empty, // System-created
            employeeId: msg.EmployeeId,
            notes: $"PayrollId: {msg.PayrollId}, NetPay: {msg.NetPay:N0} VND"
        );

        // Auto-approve and mark as paid since payroll was already paid
        expense.Approve(Guid.Empty);
        expense.MarkAsPaid(PaymentMethod.BankTransfer);

        _dbContext.Expenses.Add(expense);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Salary expense {ExpenseNumber} created for employee {EmployeeName}",
            expense.ExpenseNumber, msg.EmployeeName);
    }
}

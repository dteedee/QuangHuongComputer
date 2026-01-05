using MediatR;
using Microsoft.EntityFrameworkCore;
using Accounting.Infrastructure;

namespace Accounting.Application.Accounts.Commands.RecordTransaction;

public class RecordTransactionCommandHandler : IRequestHandler<RecordTransactionCommand, Unit>
{
    private readonly AccountingDbContext _context;

    public RecordTransactionCommandHandler(AccountingDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(RecordTransactionCommand request, CancellationToken cancellationToken)
    {
        var account = await _context.Accounts.FindAsync(new object[] { request.AccountId }, cancellationToken);
        if (account == null) throw new Exception("Account not found");

        account.RecordTransaction(request.Amount, request.Type, request.Description, request.Currency, request.ExchangeRate);
        
        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}

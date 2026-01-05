using MediatR;
using Accounting.Domain;

namespace Accounting.Application.Accounts.Commands.RecordTransaction;

public record RecordTransactionCommand(
    Guid AccountId,
    decimal Amount,
    TransactionType Type,
    string Description,
    Currency Currency = Currency.VND,
    decimal ExchangeRate = 1
) : IRequest<Unit>;

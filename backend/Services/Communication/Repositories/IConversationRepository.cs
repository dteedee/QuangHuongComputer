using Communication.Domain;

namespace Communication.Repositories;

public interface IConversationRepository
{
    Task<Conversation?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Conversation?> GetActiveConversationForCustomerAsync(string customerId, CancellationToken ct = default);
    Task<List<Conversation>> GetConversationsForUserAsync(string userId, string[] userRoles, CancellationToken ct = default);
    Task<List<Conversation>> GetUnassignedConversationsAsync(CancellationToken ct = default);
    Task AddAsync(Conversation conversation, CancellationToken ct = default);
    Task UpdateAsync(Conversation conversation, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}

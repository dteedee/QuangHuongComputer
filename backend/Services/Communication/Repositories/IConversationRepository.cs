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

    /// <summary>
    /// Appends a new message to an already-tracked conversation and explicitly stages the
    /// message row as Added. Do NOT call Update(conversation) for this - the message has a
    /// client-generated (non-default) Guid key, so EF's Update() graph walk marks it Modified
    /// and issues an UPDATE for a row that does not exist yet (DbUpdateConcurrencyException).
    /// </summary>
    Task AddMessageAsync(Conversation conversation, ChatMessage message, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}

using Communication.Domain;
using Communication.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Communication.Repositories;

public class ConversationRepository : IConversationRepository
{
    private readonly CommunicationDbContext _context;

    public ConversationRepository(CommunicationDbContext context)
    {
        _context = context;
    }

    public async Task<Conversation?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _context.Conversations
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.Id == id, ct);
    }

    public async Task<Conversation?> GetActiveConversationForCustomerAsync(string customerId, CancellationToken ct = default)
    {
        return await _context.Conversations
            .Include(c => c.Messages.OrderBy(m => m.CreatedAt))
            .Where(c => c.CustomerId == customerId && c.Status == ConversationStatus.Open)
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<List<Conversation>> GetConversationsForUserAsync(string userId, string[] userRoles, CancellationToken ct = default)
    {
        var query = _context.Conversations
            .Include(c => c.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
            .AsQueryable();

        // Admin sees all
        if (userRoles.Contains(BuildingBlocks.Security.Roles.Admin))
        {
            return await query
                .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
                .ToListAsync(ct);
        }

        // Sales only see assigned or unassigned
        if (userRoles.Contains(BuildingBlocks.Security.Roles.Sale))
        {
            query = query.Where(c => c.AssignedToUserId == null || c.AssignedToUserId == userId);
            return await query
                .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
                .ToListAsync(ct);
        }

        // Default-deny: every other caller (customer, or any staff role with no explicit
        // grant above, e.g. Manager/Accountant/HR/Marketing/InventoryStaff/Technician*) only
        // ever sees conversations they own. Was previously unfiltered for these roles, which
        // let any authenticated non-Admin/Sale staff account read every customer conversation.
        query = query.Where(c => c.CustomerId == userId);

        return await query
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<List<Conversation>> GetUnassignedConversationsAsync(CancellationToken ct = default)
    {
        return await _context.Conversations
            .Include(c => c.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
            .Where(c => c.AssignedToUserId == null && c.Status == ConversationStatus.Open)
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task AddAsync(Conversation conversation, CancellationToken ct = default)
    {
        await _context.Conversations.AddAsync(conversation, ct);
    }

    public async Task UpdateAsync(Conversation conversation, CancellationToken ct = default)
    {
        _context.Conversations.Update(conversation);
        await Task.CompletedTask;
    }

    public async Task AddMessageAsync(Conversation conversation, ChatMessage message, CancellationToken ct = default)
    {
        // conversation is already tracked (loaded via GetByIdAsync), so mutating it in place
        // is enough for EF to pick up the LastMessageAt/UpdatedAt changes - no Update() needed.
        conversation.AddMessage(message);
        // Explicitly stage the new message as Added. Relying on graph discovery via
        // Conversations.Update(conversation) is what caused the original bug: the message's
        // Guid key is already non-default when Update() walks the graph, so EF marks it
        // Modified instead of Added and issues an UPDATE for a row that was never inserted.
        _context.ChatMessages.Add(message);
        await Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await _context.SaveChangesAsync(ct);
    }
}

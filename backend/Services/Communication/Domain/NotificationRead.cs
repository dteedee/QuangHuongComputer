namespace Communication.Domain;

using BuildingBlocks.SharedKernel;

/// <summary>
/// Per-user read state for a <see cref="NotificationLog"/>.
///
/// W2-15: role-targeted notifications (TargetRoles set, UserId = Guid.Empty) are ONE row shared
/// by every caller whose role matches. Before this table, "read" lived on that shared row
/// (NotificationLog.IsRead), so one Sale user opening a notification marked it read for every
/// other Sale/Admin/Manager who could see it. This table makes read state per (notification, user)
/// so direct and role-targeted notifications behave the same way.
/// </summary>
public class NotificationRead : Entity<Guid>
{
    public Guid NotificationLogId { get; private set; }
    public Guid UserId { get; private set; }
    public DateTime ReadAt { get; private set; }

    public NotificationRead(Guid notificationLogId, Guid userId)
    {
        Id = Guid.NewGuid();
        NotificationLogId = notificationLogId;
        UserId = userId;
        ReadAt = DateTime.UtcNow;
        CreatedAt = ReadAt;
    }

    protected NotificationRead() { }
}

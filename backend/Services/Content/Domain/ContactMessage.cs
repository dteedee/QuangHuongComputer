using BuildingBlocks.SharedKernel;

namespace Content.Domain;

public class ContactMessage : Entity<Guid>
{
    public string FullName { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public string Subject { get; private set; } = string.Empty;
    public string Message { get; private set; } = string.Empty;
    public ContactMessageStatus Status { get; private set; }
    public string? AdminNotes { get; private set; }
    public string? RepliedBy { get; private set; }
    public DateTime? RepliedAt { get; private set; }
    public string? IpAddress { get; private set; }

    protected ContactMessage() { }

    public ContactMessage(
        string fullName,
        string phone,
        string? email,
        string subject,
        string message,
        string? ipAddress = null)
    {
        Id = Guid.NewGuid();
        FullName = fullName;
        Phone = phone;
        Email = email;
        Subject = subject;
        Message = message;
        Status = ContactMessageStatus.New;
        IpAddress = ipAddress;
        CreatedAt = DateTime.UtcNow;
    }

    public void MarkAsRead()
    {
        if (Status == ContactMessageStatus.New)
        {
            Status = ContactMessageStatus.Read;
            UpdatedAt = DateTime.UtcNow;
        }
    }

    public void MarkAsReplied(string repliedBy, string? notes = null)
    {
        Status = ContactMessageStatus.Replied;
        RepliedBy = repliedBy;
        RepliedAt = DateTime.UtcNow;
        if (notes != null) AdminNotes = notes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void AddNotes(string notes)
    {
        AdminNotes = notes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Archive()
    {
        Status = ContactMessageStatus.Archived;
        UpdatedAt = DateTime.UtcNow;
    }
}

public enum ContactMessageStatus
{
    New = 0,
    Read = 1,
    Replied = 2,
    Archived = 3
}

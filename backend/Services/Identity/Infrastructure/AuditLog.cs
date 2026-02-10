using System;

namespace Identity.Infrastructure;

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = string.Empty; // User performing the action
    public string Action { get; set; } = string.Empty; // Create, Update, Delete, Login, etc.
    public string EntityName { get; set; } = string.Empty; // User, Role, etc.
    public string EntityId { get; set; } = string.Empty; // ID of the affected entity
    public string Details { get; set; } = string.Empty; // JSON or text description of changes
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? RequestPath { get; set; }
    public string? RequestMethod { get; set; }
}

using BuildingBlocks.SharedKernel;

namespace CRM.Domain;

/// <summary>
/// Tasks related to customers or leads
/// </summary>
public class CustomerTask : Entity<Guid>
{
    /// <summary>
    /// CustomerAnalytics ID (if task for existing customer)
    /// </summary>
    public Guid? CustomerAnalyticsId { get; private set; }
    public CustomerAnalytics? CustomerAnalytics { get; private set; }

    /// <summary>
    /// Lead ID (if task for a lead)
    /// </summary>
    public Guid? LeadId { get; private set; }
    public Lead? Lead { get; private set; }

    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }

    public TaskPriority Priority { get; private set; } = TaskPriority.Medium;
    public TaskStatus Status { get; private set; } = TaskStatus.Pending;

    /// <summary>
    /// User assigned to complete this task
    /// </summary>
    public Guid? AssignedToUserId { get; private set; }
    public string? AssignedToUserName { get; private set; }

    /// <summary>
    /// Due date for the task
    /// </summary>
    public DateTime? DueDate { get; private set; }

    /// <summary>
    /// When was task completed
    /// </summary>
    public DateTime? CompletedAt { get; private set; }
    public Guid? CompletedByUserId { get; private set; }

    /// <summary>
    /// Reminder datetime
    /// </summary>
    public DateTime? ReminderAt { get; private set; }
    public bool ReminderSent { get; private set; }

    public CustomerTask(string title, Guid? customerAnalyticsId = null, Guid? leadId = null)
    {
        Id = Guid.NewGuid();
        Title = title;
        CustomerAnalyticsId = customerAnalyticsId;
        LeadId = leadId;
    }

    protected CustomerTask() { }

    public void Update(string title, string? description, TaskPriority priority, DateTime? dueDate)
    {
        Title = title;
        Description = description;
        Priority = priority;
        DueDate = dueDate;
        UpdatedAt = DateTime.UtcNow;
    }

    public void AssignTo(Guid userId, string userName)
    {
        AssignedToUserId = userId;
        AssignedToUserName = userName;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Unassign()
    {
        AssignedToUserId = null;
        AssignedToUserName = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Start()
    {
        if (Status == TaskStatus.Pending)
        {
            Status = TaskStatus.InProgress;
            UpdatedAt = DateTime.UtcNow;
        }
    }

    public void Complete(Guid userId)
    {
        Status = TaskStatus.Completed;
        CompletedAt = DateTime.UtcNow;
        CompletedByUserId = userId;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        Status = TaskStatus.Cancelled;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reopen()
    {
        if (Status == TaskStatus.Completed || Status == TaskStatus.Cancelled)
        {
            Status = TaskStatus.Pending;
            CompletedAt = null;
            CompletedByUserId = null;
            UpdatedAt = DateTime.UtcNow;
        }
    }

    public void SetReminder(DateTime reminderAt)
    {
        ReminderAt = reminderAt;
        ReminderSent = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkReminderSent()
    {
        ReminderSent = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ClearReminder()
    {
        ReminderAt = null;
        ReminderSent = false;
        UpdatedAt = DateTime.UtcNow;
    }
}

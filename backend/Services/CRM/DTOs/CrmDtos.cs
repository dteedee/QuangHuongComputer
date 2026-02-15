using CRM.Domain;

namespace CRM.DTOs;

// Customer Analytics DTOs
public record CustomerAnalyticsDto(
    Guid Id,
    Guid UserId,
    string? UserName,
    string? Email,
    int RecencyScore,
    int FrequencyScore,
    int MonetaryScore,
    int TotalRfmScore,
    int TotalOrderCount,
    decimal TotalSpent,
    decimal AverageOrderValue,
    DateTime? FirstPurchaseDate,
    DateTime? LastPurchaseDate,
    int DaysSinceLastPurchase,
    LifecycleStage LifecycleStage,
    string LifecycleStageName,
    DateTime CreatedAt,
    List<string> Segments
);

public record CustomerDetailDto(
    Guid Id,
    Guid UserId,
    string? UserName,
    string? Email,
    string? Phone,
    string? Address,
    int RecencyScore,
    int FrequencyScore,
    int MonetaryScore,
    int TotalRfmScore,
    int TotalOrderCount,
    decimal TotalSpent,
    decimal AverageOrderValue,
    DateTime? FirstPurchaseDate,
    DateTime? LastPurchaseDate,
    LifecycleStage LifecycleStage,
    string LifecycleStageName,
    int EmailOpenCount,
    int EmailClickCount,
    DateTime? LastEmailOpenedAt,
    DateTime? LastInteractionAt,
    string? InternalNotes,
    List<SegmentDto> Segments,
    List<InteractionDto> RecentInteractions,
    List<TaskDto> PendingTasks
);

// Segment DTOs
public record SegmentDto(
    Guid Id,
    string Name,
    string Code,
    string? Description,
    string Color,
    bool IsAutoAssign,
    int SortOrder,
    int CustomerCount,
    DateTime CreatedAt
);

public record CreateSegmentDto(
    string Name,
    string Code,
    string? Description,
    string Color,
    int SortOrder
);

public record UpdateSegmentDto(
    string Name,
    string? Description,
    string Color,
    int SortOrder
);

public record SetSegmentRulesDto(string RuleDefinition);

// Lead DTOs
public record LeadDto(
    Guid Id,
    string FullName,
    string Email,
    string? Phone,
    string? Company,
    string? JobTitle,
    LeadSource Source,
    string SourceName,
    LeadStatus Status,
    string StatusName,
    Guid? PipelineStageId,
    string? PipelineStageName,
    string? AssignedToUserName,
    decimal? EstimatedValue,
    DateTime? NextFollowUpAt,
    bool IsConverted,
    DateTime CreatedAt
);

public record LeadDetailDto(
    Guid Id,
    string FullName,
    string Email,
    string? Phone,
    string? Company,
    string? JobTitle,
    LeadSource Source,
    string SourceName,
    string? SourceDetail,
    LeadStatus Status,
    string StatusName,
    Guid? PipelineStageId,
    string? PipelineStageName,
    Guid? AssignedToUserId,
    string? AssignedToUserName,
    decimal? EstimatedValue,
    string? Currency,
    DateTime? NextFollowUpAt,
    string? NextFollowUpNote,
    bool IsConverted,
    Guid? ConvertedCustomerId,
    DateTime? ConvertedAt,
    string? LossReason,
    string? Notes,
    string? Address,
    string? City,
    string? District,
    string? InterestedProducts,
    List<InteractionDto> Interactions,
    DateTime CreatedAt
);

public record CreateLeadDto(
    string FullName,
    string Email,
    string? Phone,
    string? Company,
    string? JobTitle,
    LeadSource Source,
    string? SourceDetail,
    decimal? EstimatedValue,
    string? Notes,
    string? Address,
    string? City,
    string? District
);

public record UpdateLeadDto(
    string FullName,
    string? Phone,
    string? Company,
    string? JobTitle,
    decimal? EstimatedValue,
    string? Notes,
    string? Address,
    string? City,
    string? District
);

public record AssignLeadDto(Guid UserId, string UserName);

public record MoveLeadStageDto(Guid StageId);

public record SetFollowUpDto(DateTime FollowUpDate, string? Note);

public record ConvertLeadDto(string? Notes);

public record MarkLeadLostDto(string Reason);

// Pipeline Stage DTOs
public record PipelineStageDto(
    Guid Id,
    string Name,
    string? Description,
    string Color,
    int SortOrder,
    int WinProbability,
    bool IsFinalStage,
    bool IsWonStage,
    int LeadCount,
    decimal TotalEstimatedValue
);

public record CreatePipelineStageDto(
    string Name,
    string? Description,
    string Color,
    int SortOrder,
    int WinProbability
);

public record UpdatePipelineStageDto(
    string Name,
    string? Description,
    string Color,
    int SortOrder,
    int WinProbability
);

// Interaction DTOs
public record InteractionDto(
    Guid Id,
    InteractionType Type,
    string TypeName,
    string Subject,
    string? Content,
    string PerformedByUserName,
    DateTime PerformedAt,
    int? DurationMinutes,
    string? CallOutcome,
    string? MeetingLocation,
    DateTime? FollowUpDate,
    string? FollowUpNote,
    string? Sentiment
);

public record CreateInteractionDto(
    InteractionType Type,
    string Subject,
    string? Content,
    DateTime? PerformedAt,
    int? DurationMinutes,
    string? CallOutcome,
    string? MeetingLocation,
    DateTime? FollowUpDate,
    string? FollowUpNote,
    string? Sentiment
);

// Task DTOs
public record TaskDto(
    Guid Id,
    string Title,
    string? Description,
    TaskPriority Priority,
    string PriorityName,
    Domain.TaskStatus Status,
    string StatusName,
    Guid? AssignedToUserId,
    string? AssignedToUserName,
    DateTime? DueDate,
    DateTime? CompletedAt,
    DateTime? ReminderAt,
    Guid? CustomerAnalyticsId,
    Guid? LeadId,
    DateTime CreatedAt
);

public record CreateTaskDto(
    string Title,
    string? Description,
    TaskPriority Priority,
    DateTime? DueDate,
    Guid? AssignedToUserId,
    string? AssignedToUserName,
    DateTime? ReminderAt
);

public record UpdateTaskDto(
    string Title,
    string? Description,
    TaskPriority Priority,
    DateTime? DueDate
);

// Campaign DTOs
public record CampaignDto(
    Guid Id,
    string Name,
    string Subject,
    CampaignStatus Status,
    string StatusName,
    Guid? TargetSegmentId,
    string? TargetSegmentName,
    DateTime? ScheduledAt,
    DateTime? SentAt,
    int TotalRecipients,
    int OpenedCount,
    int ClickedCount,
    decimal OpenRate,
    decimal ClickRate,
    DateTime CreatedAt
);

public record CampaignDetailDto(
    Guid Id,
    string Name,
    string Subject,
    string? PreviewText,
    string HtmlContent,
    string? PlainTextContent,
    CampaignStatus Status,
    string StatusName,
    Guid? TargetSegmentId,
    string? TargetSegmentName,
    string? TargetLifecycleStages,
    int? MinRfmScore,
    string? FromEmail,
    string? FromName,
    string? ReplyToEmail,
    DateTime? ScheduledAt,
    DateTime? SentAt,
    DateTime? CompletedAt,
    int TotalRecipients,
    int SentCount,
    int DeliveredCount,
    int OpenedCount,
    int ClickedCount,
    int BouncedCount,
    int UnsubscribedCount,
    decimal OpenRate,
    decimal ClickRate,
    decimal BounceRate,
    DateTime CreatedAt
);

public record CreateCampaignDto(
    string Name,
    string Subject,
    string? PreviewText,
    string HtmlContent,
    string? PlainTextContent,
    Guid? TargetSegmentId,
    string? TargetLifecycleStages,
    int? MinRfmScore,
    string? FromEmail,
    string? FromName,
    string? ReplyToEmail
);

public record UpdateCampaignDto(
    string Name,
    string Subject,
    string? PreviewText,
    string HtmlContent,
    string? PlainTextContent,
    Guid? TargetSegmentId,
    string? TargetLifecycleStages,
    int? MinRfmScore,
    string? FromEmail,
    string? FromName,
    string? ReplyToEmail
);

public record ScheduleCampaignDto(DateTime SendAt);

// Dashboard DTOs
public record CrmDashboardDto(
    int TotalCustomers,
    int NewCustomersThisMonth,
    int ActiveCustomers,
    int AtRiskCustomers,
    int ChurnedCustomers,
    int VipCustomers,
    int ChampionCustomers,
    decimal TotalRevenue,
    decimal AverageOrderValue,
    int TotalLeads,
    int NewLeadsThisMonth,
    int QualifiedLeads,
    int ConvertedLeadsThisMonth,
    decimal LeadConversionRate,
    decimal TotalPipelineValue,
    int PendingTasks,
    int OverdueTasks
);

public record RfmDistributionDto(
    List<RfmSegmentCountDto> RecencyDistribution,
    List<RfmSegmentCountDto> FrequencyDistribution,
    List<RfmSegmentCountDto> MonetaryDistribution,
    List<LifecycleStageCountDto> LifecycleDistribution
);

public record RfmSegmentCountDto(int Score, int Count);

public record LifecycleStageCountDto(LifecycleStage Stage, string StageName, int Count);

// Query Parameters
public class CustomerQueryParams
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public LifecycleStage? LifecycleStage { get; set; }
    public Guid? SegmentId { get; set; }
    public int? MinRfmScore { get; set; }
    public int? MaxRfmScore { get; set; }
    public string? SortBy { get; set; } = "createdAt";
    public bool SortDesc { get; set; } = true;
    public int Skip => (Page - 1) * PageSize;
}

public class LeadQueryParams
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public LeadStatus? Status { get; set; }
    public LeadSource? Source { get; set; }
    public Guid? PipelineStageId { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public bool? HasFollowUpToday { get; set; }
    public string? SortBy { get; set; } = "createdAt";
    public bool SortDesc { get; set; } = true;
    public int Skip => (Page - 1) * PageSize;
}

public class CampaignQueryParams
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public CampaignStatus? Status { get; set; }
    public string? SortBy { get; set; } = "createdAt";
    public bool SortDesc { get; set; } = true;
    public int Skip => (Page - 1) * PageSize;
}

// Paged Result
public record PagedResult<T>(
    List<T> Items,
    int Total,
    int Page,
    int PageSize
);

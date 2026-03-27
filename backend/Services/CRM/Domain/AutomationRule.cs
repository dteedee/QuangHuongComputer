namespace CRM.Domain;

using BuildingBlocks.SharedKernel;

public class AutomationRule : Entity<Guid>
{
    public string Name { get; private set; }
    public string Description { get; private set; }
    public AutomationTrigger Trigger { get; private set; }
    public int TriggerDelayMinutes { get; private set; }
    public AutomationAction Action { get; private set; }
    public string? ActionTemplateId { get; private set; } // e.g. Email Template ID, SMS Template ID, or Segment ID
    public string? ParameterJson { get; private set; } // Additional parameters like Voucher Value
    public bool IsActive { get; private set; }
    public DateTime? LastRunAt { get; private set; }

    protected AutomationRule() { }

    public AutomationRule(string name, string description, AutomationTrigger trigger, int triggerDelayMinutes, AutomationAction action, string? actionTemplateId, string? parameterJson = null)
    {
        Id = Guid.NewGuid();
        Name = name;
        Description = description;
        Trigger = trigger;
        TriggerDelayMinutes = triggerDelayMinutes;
        Action = action;
        ActionTemplateId = actionTemplateId;
        ParameterJson = parameterJson;
        IsActive = true;
    }

    public void UpdateDetails(string name, string description, AutomationTrigger trigger, int triggerDelayMinutes, AutomationAction action, string? actionTemplateId, string? parameterJson)
    {
        Name = name;
        Description = description;
        Trigger = trigger;
        TriggerDelayMinutes = triggerDelayMinutes;
        Action = action;
        ActionTemplateId = actionTemplateId;
        ParameterJson = parameterJson;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkRun(DateTime runTime)
    {
        LastRunAt = runTime;
        UpdatedAt = runTime;
    }
}

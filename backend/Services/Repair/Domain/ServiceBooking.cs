using BuildingBlocks.SharedKernel;

namespace Repair.Domain;

public class ServiceBooking : Entity<Guid>
{
    public Guid CustomerId { get; private set; }
    public Guid? OrganizationId { get; private set; }

    // Service Details
    public ServiceType ServiceType { get; private set; }
    public string DeviceModel { get; private set; } = string.Empty;
    public string? SerialNumber { get; private set; }
    public string IssueDescription { get; private set; } = string.Empty;

    // Media
    public List<string> ImageUrls { get; private set; } = new();
    public List<string> VideoUrls { get; private set; } = new();

    // Scheduling
    public DateTime PreferredDate { get; private set; }
    public TimeSlot PreferredTimeSlot { get; private set; }

    // Location (for OnSite)
    public string? ServiceAddress { get; private set; }
    public ServiceLocation? LocationType { get; private set; }
    public string? LocationNotes { get; private set; }

    // Fees
    public decimal EstimatedCost { get; private set; }
    public decimal OnSiteFee { get; private set; }

    // Policy Acceptance
    public bool AcceptedTerms { get; private set; }
    public DateTime? TermsAcceptedAt { get; private set; }

    // Status
    public BookingStatus Status { get; private set; }

    // Linked Work Order
    public Guid? WorkOrderId { get; private set; }

    // Payment Terms (for Organizations)
    public bool AllowPayLater { get; private set; }

    // Customer contact info
    public string CustomerName { get; private set; } = string.Empty;
    public string CustomerPhone { get; private set; } = string.Empty;
    public string CustomerEmail { get; private set; } = string.Empty;

    protected ServiceBooking() { }

    public ServiceBooking(
        Guid customerId,
        ServiceType serviceType,
        string deviceModel,
        string issueDescription,
        DateTime preferredDate,
        TimeSlot timeSlot,
        bool acceptedTerms,
        string customerName,
        string customerPhone,
        string customerEmail)
    {
        Id = Guid.NewGuid();
        CustomerId = customerId;
        ServiceType = serviceType;
        DeviceModel = deviceModel;
        IssueDescription = issueDescription;
        PreferredDate = preferredDate;
        PreferredTimeSlot = timeSlot;
        AcceptedTerms = acceptedTerms;
        TermsAcceptedAt = acceptedTerms ? DateTime.UtcNow : null;
        Status = BookingStatus.Pending;
        OnSiteFee = serviceType == ServiceType.OnSite ? 50.0m : 0m; // Default fee
        CustomerName = customerName;
        CustomerPhone = customerPhone;
        CustomerEmail = customerEmail;
        CreatedAt = DateTime.UtcNow;
    }

    public void SetOnSiteDetails(string address, ServiceLocation locationType, string? notes)
    {
        if (ServiceType != ServiceType.OnSite)
            throw new InvalidOperationException("Cannot set location for in-shop service");

        ServiceAddress = address;
        LocationType = locationType;
        LocationNotes = notes;
    }

    public void AddMedia(List<string> imageUrls, List<string> videoUrls)
    {
        if (imageUrls != null && imageUrls.Any())
            ImageUrls.AddRange(imageUrls);
        if (videoUrls != null && videoUrls.Any())
            VideoUrls.AddRange(videoUrls);
    }

    public void SetSerialNumber(string? serialNumber)
    {
        SerialNumber = serialNumber;
    }

    public void LinkOrganization(Guid orgId, bool allowPayLater)
    {
        OrganizationId = orgId;
        AllowPayLater = allowPayLater;
    }

    public void Approve()
    {
        if (Status != BookingStatus.Pending)
            throw new InvalidOperationException($"Cannot approve booking in {Status} status");

        Status = BookingStatus.Approved;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reject(string reason)
    {
        if (Status != BookingStatus.Pending)
            throw new InvalidOperationException($"Cannot reject booking in {Status} status");

        Status = BookingStatus.Rejected;
        UpdatedAt = DateTime.UtcNow;
    }

    public void LinkWorkOrder(Guid workOrderId)
    {
        WorkOrderId = workOrderId;
        Status = BookingStatus.Converted;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetEstimatedCost(decimal cost)
    {
        EstimatedCost = cost;
    }

    public void ValidateBooking()
    {
        if (string.IsNullOrWhiteSpace(DeviceModel))
            throw new InvalidOperationException("Device model is required");

        if (string.IsNullOrWhiteSpace(IssueDescription))
            throw new InvalidOperationException("Issue description is required");

        if (PreferredDate < DateTime.UtcNow.Date)
            throw new InvalidOperationException("Preferred date cannot be in the past");

        if (!AcceptedTerms)
            throw new InvalidOperationException("Terms and conditions must be accepted");

        if (ServiceType == ServiceType.OnSite && string.IsNullOrWhiteSpace(ServiceAddress))
            throw new InvalidOperationException("Service address is required for on-site service");

        if (string.IsNullOrWhiteSpace(CustomerName) || string.IsNullOrWhiteSpace(CustomerPhone))
            throw new InvalidOperationException("Customer contact information is required");
    }
}

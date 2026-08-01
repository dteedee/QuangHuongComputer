using Microsoft.EntityFrameworkCore;
using Warranty.Domain;
using Warranty.Infrastructure;

namespace Warranty.Application;

/// <summary>
/// Phase 07: sinh dữ liệu phiếu tiếp nhận bảo hành.
/// KHÔNG import PDF lib — trả JSON payload; frontend tự render + in.
/// Endpoint gọi generator sẽ trả JSON để in bên client.
/// </summary>
public class WarrantyReceiptGenerator
{
    private readonly WarrantyDbContext _db;

    public WarrantyReceiptGenerator(WarrantyDbContext db) { _db = db; }

    public async Task<WarrantyReceiptDto?> BuildAsync(Guid claimId, string qrBaseUrl, CancellationToken ct = default)
    {
        var claim = await _db.Claims.FirstOrDefaultAsync(c => c.Id == claimId, ct);
        if (claim == null) return null;

        var warranty = await _db.ProductWarranties
            .FirstOrDefaultAsync(w => w.SerialNumber == claim.SerialNumber, ct);

        return new WarrantyReceiptDto(
            ReceiptNumber: $"BH-{DateTime.UtcNow:yyyyMMdd}-{claim.Id.ToString()[..6].ToUpperInvariant()}",
            IssuedAt: DateTime.UtcNow,
            CustomerId: claim.CustomerId,
            SerialNumber: claim.SerialNumber,
            ProductId: warranty?.ProductId,
            IssueDescription: claim.IssueDescription,
            AttachmentUrls: claim.AttachmentUrls,
            PreferredResolution: claim.PreferredResolution.ToString(),
            ClaimType: claim.ClaimType?.ToString(),
            WarrantyExpiresAt: warranty?.ExpirationDate,
            Provider: warranty?.Provider.ToString(),
            QrTrackingUrl: $"{qrBaseUrl.TrimEnd('/')}/warranty/claim/{claim.Id}",
            SlaDeadline: claim.SlaDeadline,
            Notes: claim.ResolutionNotes);
    }
}

public record WarrantyReceiptDto(
    string ReceiptNumber,
    DateTime IssuedAt,
    Guid CustomerId,
    string SerialNumber,
    Guid? ProductId,
    string IssueDescription,
    List<string> AttachmentUrls,
    string PreferredResolution,
    string? ClaimType,
    DateTime? WarrantyExpiresAt,
    string? Provider,
    string QrTrackingUrl,
    DateTime? SlaDeadline,
    string? Notes);

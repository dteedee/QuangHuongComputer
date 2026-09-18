using System.Text.Json;
using Warranty.Domain;

namespace Warranty;

/// <summary>
/// W2-6: DTOs + entity-to-wire mapping for <see cref="WarrantyRma"/>. Split out of
/// rma-endpoints.cs (was 221 lines, over the 200-line/file rule) - endpoints stay in that file,
/// wire shapes and the JSON-blob-to-rows mapping live here.
/// </summary>
public static class RmaDtoMapping
{
    public static readonly JsonSerializerOptions ItemsJsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>Entity -> wire DTO. Never return WarrantyRma directly (its ItemsJson is a raw
    /// JSON string, not the Items[] shape the frontend reads - see class doc on WarrantyRmaEndpoints).</summary>
    public static RmaDto ToDto(WarrantyRma rma) => new(
        rma.Id,
        rma.RmaNumber,
        rma.SupplierId,
        rma.ExternalRmaCode,
        rma.Status,
        rma.Result,
        rma.SentDate,
        rma.ExpectedReturnDate,
        rma.ActualReturnDate,
        rma.Notes,
        rma.IsOverdue(),
        ParseItems(rma.ItemsJson),
        rma.CreatedAt);

    /// <summary>Never throws - malformed/empty ItemsJson (pre-fix rows, hand
    /// edits) degrades to an empty list rather than a 500.</summary>
    private static List<RmaItemDto> ParseItems(string? itemsJson)
    {
        if (string.IsNullOrWhiteSpace(itemsJson)) return new List<RmaItemDto>();
        try
        {
            return JsonSerializer.Deserialize<List<RmaItemDto>>(itemsJson, ItemsJsonOptions) ?? new List<RmaItemDto>();
        }
        catch (JsonException)
        {
            return new List<RmaItemDto>();
        }
    }
}

public record CreateRmaDto(
    Guid SupplierId,
    List<RmaItemDto>? Items,
    string? RmaNumber,
    DateTime? ExpectedReturnDate,
    string? ExternalRmaCode,
    string? Notes);

public record SendRmaDto(string? ExternalRmaCode);
public record ReceiveRmaDto(string Result, string? Notes);

/// <summary>One serial + its issue inside an RMA. Matches
/// frontend/src/api/warranty.ts RmaItem.</summary>
public record RmaItemDto(
    string? Id,
    string SerialNumber,
    string? ProductName,
    string Issue,
    string? WarrantyClaimId);

/// <summary>Wire shape for a WarrantyRma. Matches
/// frontend/src/api/warranty.ts WarrantyRma (SupplierName omitted - Warranty
/// does not import Inventory.Domain to resolve it; the page already falls
/// back to the supplier id when absent).</summary>
public record RmaDto(
    Guid Id,
    string Code,
    Guid SupplierId,
    string? ExternalRmaCode,
    RmaStatus Status,
    string? Result,
    DateTime SentDate,
    DateTime? ExpectedReturnDate,
    DateTime? ActualReturnDate,
    string? Notes,
    bool IsOverdue,
    List<RmaItemDto> Items,
    DateTime CreatedAt);

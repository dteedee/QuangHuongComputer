using System.Security.Claims;
using BuildingBlocks.Configuration;
using BuildingBlocks.Documents;
using BuildingBlocks.Time;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Pricing;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Quotations;

/// <summary>
/// CRUD + state machine cho báo giá B2B (Implementation Steps #1-#4). Static — theo đúng cách
/// <c>CheckoutOrderFactory</c>/<c>OrderInvoicePayloadBuilder</c> đã làm trong module này, để
/// endpoint chỉ cần các service đã ĐĂNG KÝ SẴN trong DI (SalesDbContext, CatalogDbContext,
/// IDocumentNumberService, IAppSettings, IBusinessClock, LineVatProfileResolver) — không cần
/// đăng ký thêm gì trong <c>DependencyInjection.cs</c> (ngoài phạm vi sở hữu của track này).
/// </summary>
internal static class QuotationService
{
    private const string DefaultValidityDaysKey = "Sales:Quotations:DefaultValidityDays";
    private const int DefaultValidityDays = 7;

    public static async Task<(SalesQuotation? Quotation, string? Error)> CreateAsync(
        SalesDbContext salesDb,
        CatalogDbContext catalogDb,
        LineVatProfileResolver vatResolver,
        IDocumentNumberService documentNumbers,
        IAppSettings settings,
        IBusinessClock clock,
        ClaimsPrincipal user,
        UpsertQuotationRequest req,
        CancellationToken ct)
    {
        if (!Enum.TryParse<BuyerType>(req.BuyerType, ignoreCase: true, out var buyerType))
            return (null, $"BuyerType không hợp lệ: {req.BuyerType}");

        var listPrices = await QuotationLineFactory.LoadListPricesAsync(catalogDb, req.Lines, ct);
        var approvalError = QuotationDiscountApprovalPolicy.Validate(settings, user, req.Lines, listPrices);
        if (approvalError != null) return (null, approvalError);

        var (lines, lineError) = await QuotationLineFactory.BuildAsync(
            catalogDb, vatResolver, req.Lines, Guid.Empty, clock.TodayVn, ct);
        if (lineError != null) return (null, lineError);

        // timestamptz đòi Kind=Utc (Npgsql) — clock.NowVn cố ý Kind=Unspecified (BuildingBlocks/Time),
        // nên hạn mặc định phải tính từ UtcNow, không phải NowVn.
        var validUntil = req.ValidUntil ?? clock.UtcNow.UtcDateTime.AddDays(settings.GetInt(DefaultValidityDaysKey, DefaultValidityDays));
        var quotationNumber = await documentNumbers.NextAsync(DocumentNumberTypes.Quotation, ct);
        var createdBy = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.Identity?.Name;

        SalesQuotation quotation;
        try
        {
            quotation = new SalesQuotation(
                quotationNumber, req.CustomerId, req.CustomerName, req.CustomerPhone, req.CustomerEmail,
                buyerType, req.BuyerLegalName, req.BuyerTaxCode, req.BuyerBudgetUnitCode, req.BuyerAddress,
                validUntil, req.PaymentTermDays, req.TermsText, req.Notes, createdBy);
        }
        catch (ArgumentException ex) { return (null, ex.Message); }

        // Dòng được dựng với QuotationId rỗng ở BuildAsync (chưa có Id lúc đó) — gán lại đúng.
        var reboundLines = lines.Select(l => new SalesQuotationLine(
            quotation.Id, l.Sequence, l.ProductId, l.VariantId, l.ProductName, l.ProductSku, l.UnitName,
            l.Quantity, l.UnitPrice, l.LineDiscount, l.VatStatutoryRate, l.VatReductionEligible, l.VatRate, l.Notes)).ToList();

        try { quotation.ReplaceLines(reboundLines); }
        catch (InvalidOperationException ex) { return (null, ex.Message); }

        salesDb.Set<SalesQuotation>().Add(quotation);
        await salesDb.SaveChangesAsync(ct);
        return (quotation, null);
    }

    public static async Task<(SalesQuotation? Quotation, string? Error)> UpdateAsync(
        SalesDbContext salesDb,
        CatalogDbContext catalogDb,
        LineVatProfileResolver vatResolver,
        IAppSettings settings,
        IBusinessClock clock,
        ClaimsPrincipal user,
        Guid id,
        UpsertQuotationRequest req,
        CancellationToken ct)
    {
        var quotation = await LoadAsync(salesDb, id, ct);
        if (quotation == null) return (null, "Không tìm thấy báo giá");

        if (!Enum.TryParse<BuyerType>(req.BuyerType, ignoreCase: true, out var buyerType))
            return (null, $"BuyerType không hợp lệ: {req.BuyerType}");

        var listPrices = await QuotationLineFactory.LoadListPricesAsync(catalogDb, req.Lines, ct);
        var approvalError = QuotationDiscountApprovalPolicy.Validate(settings, user, req.Lines, listPrices);
        if (approvalError != null) return (null, approvalError);

        var (lines, lineError) = await QuotationLineFactory.BuildAsync(
            catalogDb, vatResolver, req.Lines, quotation.Id, clock.TodayVn, ct);
        if (lineError != null) return (null, lineError);

        var validUntil = req.ValidUntil ?? clock.UtcNow.UtcDateTime.AddDays(settings.GetInt(DefaultValidityDaysKey, DefaultValidityDays));

        try
        {
            quotation.UpdateBuyerAndTerms(
                req.CustomerId, req.CustomerName, req.CustomerPhone, req.CustomerEmail,
                buyerType, req.BuyerLegalName, req.BuyerTaxCode, req.BuyerBudgetUnitCode, req.BuyerAddress,
                validUntil, req.PaymentTermDays, req.TermsText, req.Notes);
            quotation.ReplaceLines(lines);
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException) { return (null, ex.Message); }

        await salesDb.SaveChangesAsync(ct);
        return (quotation, null);
    }

    public static Task<SalesQuotation?> LoadAsync(SalesDbContext salesDb, Guid id, CancellationToken ct)
        => salesDb.Set<SalesQuotation>().Include(q => q.Lines).FirstOrDefaultAsync(q => q.Id == id, ct);

    public static async Task<QuotationListResult> ListAsync(
        SalesDbContext salesDb,
        string? status, Guid? customerId, DateTime? validAfter, DateTime? validBefore, string? createdBy,
        int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = salesDb.Set<SalesQuotation>().AsNoTracking().Where(q => q.IsActive);
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<QuotationStatus>(status, true, out var st))
            query = query.Where(q => q.Status == st);
        if (customerId.HasValue) query = query.Where(q => q.CustomerId == customerId.Value);
        if (validAfter.HasValue) query = query.Where(q => q.ValidUntil >= validAfter.Value);
        if (validBefore.HasValue) query = query.Where(q => q.ValidUntil <= validBefore.Value);
        if (!string.IsNullOrWhiteSpace(createdBy)) query = query.Where(q => q.CreatedBy == createdBy);

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(q => q.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(q => new QuotationListItemDto(
                q.Id, q.QuotationNumber, q.Status.ToString(), q.CustomerName, q.ValidUntil,
                q.TotalAmount, q.CreatedBy, q.CreatedAt))
            .ToListAsync(ct);

        return new QuotationListResult(items, total, page, pageSize);
    }

    public static QuotationDto ToDto(SalesQuotation q) => new(
        q.Id, q.QuotationNumber, q.Status.ToString(), q.CustomerId, q.CustomerName, q.CustomerPhone, q.CustomerEmail,
        q.BuyerType.ToString(), q.BuyerLegalName, q.BuyerTaxCode, q.BuyerBudgetUnitCode, q.BuyerAddress,
        q.SubtotalAmount, q.DiscountAmount, q.TaxAmount, q.TotalAmount, q.PaymentTermDays,
        q.ValidUntil, q.AcceptedAt, q.ConvertedAt, q.ConvertedOrderId, q.TermsText, q.Notes,
        q.CreatedBy, q.CreatedAt, q.UpdatedAt,
        q.Lines.OrderBy(l => l.Sequence).Select(ToLineDto).ToList());

    private static QuotationLineDto ToLineDto(SalesQuotationLine l) => new(
        l.Id, l.Sequence, l.ProductId, l.VariantId, l.ProductName, l.ProductSku, l.UnitName,
        l.Quantity, l.UnitPrice, l.LineDiscount, l.VatRate, l.NetAmount, l.VatAmount, l.LineTotal, l.Notes);
}

using BuildingBlocks.Configuration;
using Sales.Domain;

namespace Sales.Application.Quotations;

/// <summary>Khối công ty trên phiếu in — LUÔN từ SystemConfig (D09), không bao giờ hardcode.</summary>
public sealed record QuotationPrintCompanyDto(
    string Name, string? LegalName, string? TaxCode, string? Address, string? Representative,
    string? Phone, string? Email, string? BankAccount);

public sealed record QuotationPrintVatBreakdownDto(decimal VatRate, decimal NetAmount, decimal VatAmount);

public sealed record QuotationPrintPayloadDto(
    QuotationPrintCompanyDto Company,
    QuotationDto Quotation,
    IReadOnlyList<QuotationPrintVatBreakdownDto> VatBreakdown,
    string TermsText);

/// <summary>Implementation Steps #6 — phiếu in báo giá.</summary>
internal static class QuotationPrintPayloadBuilder
{
    private const string DefaultTermsKey = "Sales:Quotations:DefaultTermsText";
    private const string DefaultTermsText =
        "Báo giá có giá trị trong thời hạn hiệu lực nêu trên. Giá đã bao gồm thuế GTGT. " +
        "Thanh toán theo điều khoản công nợ (nếu có) hoặc thanh toán trước khi giao hàng.";

    public static QuotationPrintPayloadDto Build(SalesQuotation quotation, IAppSettings settings)
    {
        var company = new QuotationPrintCompanyDto(
            Name: settings.GetString("COMPANY_NAME", "Công ty Máy tính Quang Hưởng"),
            LegalName: settings.GetString("COMPANY_LEGAL_NAME", ""),
            TaxCode: settings.GetString("COMPANY_TAX_CODE", ""),
            Address: settings.GetString("COMPANY_ADDRESS", ""),
            Representative: settings.GetString("COMPANY_REPRESENTATIVE", ""),
            Phone: settings.GetString("COMPANY_PHONE", ""),
            Email: settings.GetString("COMPANY_EMAIL", ""),
            BankAccount: settings.GetString("COMPANY_BANK_ACCOUNT", ""));

        // D01 — thuế tách riêng theo TỪNG thuế suất xuất hiện trên báo giá (đa thuế suất, Luật GTGT Đ.9.4).
        var breakdown = quotation.Lines
            .GroupBy(l => l.VatRate)
            .OrderBy(g => g.Key)
            .Select(g => new QuotationPrintVatBreakdownDto(
                VatRate: g.Key,
                NetAmount: g.Sum(l => l.NetAmount),
                VatAmount: g.Sum(l => l.VatAmount)))
            .ToList();

        var termsText = !string.IsNullOrWhiteSpace(quotation.TermsText)
            ? quotation.TermsText!
            : settings.GetString(DefaultTermsKey, DefaultTermsText);

        return new QuotationPrintPayloadDto(company, QuotationService.ToDto(quotation), breakdown, termsText);
    }
}

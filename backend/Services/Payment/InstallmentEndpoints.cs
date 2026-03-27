using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;

namespace Payment;

public static class InstallmentEndpoints
{
    public static void MapInstallmentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/payment/installments");

        // 1. Calculate EMI (Equated Monthly Installment)
        group.MapPost("/calculate", ([FromBody] InstallmentCalculationRequest request) =>
        {
            if (request.TotalAmount <= 0) return Results.BadRequest("Total amount must be greater than 0");
            if (request.TermMonths <= 0) return Results.BadRequest("Term months must be > 0");
            if (request.DownPaymentPercent < 0 || request.DownPaymentPercent > 100) return Results.BadRequest("Down payment must be between 0 and 100");

            // Calculate Principal
            decimal downPaymentAmount = request.TotalAmount * request.DownPaymentPercent / 100;
            decimal principal = request.TotalAmount - downPaymentAmount;
            
            if (principal <= 0) return Results.BadRequest("Principal <= 0. Down payment may be too high.");

            decimal monthlyInterestRate = (request.AnnualInterestRate / 100) / 12;
            decimal monthlyPayment;
            decimal totalPayment;

            // Optional Fees (Handling fee + Collection fee/month)
            decimal processingFee = request.ProcessingFee ?? 0;
            decimal monthlyCollectionFee = request.MonthlyCollectionFee ?? 12000; // Default 12,000VND/month for Finance Companies

            if (monthlyInterestRate == 0)
            {
                // 0% Interest (Trả góp 0%)
                monthlyPayment = (principal / request.TermMonths) + monthlyCollectionFee;
                totalPayment = downPaymentAmount + principal + processingFee + (monthlyCollectionFee * request.TermMonths);
            }
            else
            {
                // Standard EMI formula: P * r * (1+r)^n / ((1+r)^n - 1)
                double p = (double)principal;
                double r = (double)monthlyInterestRate;
                int n = request.TermMonths;

                double mathFactor = Math.Pow(1 + r, n);
                double emi = (p * r * mathFactor) / (mathFactor - 1);

                monthlyPayment = (decimal)emi + monthlyCollectionFee;
                totalPayment = downPaymentAmount + (monthlyPayment * n) + processingFee;
            }

            var result = new InstallmentCalculationResponse(
                Principal: principal,
                DownPaymentAmount: downPaymentAmount,
                MonthlyPayment: Math.Round(monthlyPayment, 0),
                TotalPayment: Math.Round(totalPayment, 0),
                Difference: Math.Round(totalPayment - request.TotalAmount, 0),
                TermMonths: request.TermMonths,
                InterestRate: request.AnnualInterestRate
            );

            return Results.Ok(result);
        });

        // 2. Lookup standard partner rates (e.g. HomeCredit, HDSaison, Alepay/CreditCard)
        group.MapGet("/providers", () =>
        {
            var providers = new List<InstallmentProvider>
            {
                new("CreditCard_0Percent", "Trả góp qua thẻ tín dụng (0%)", "CreditCard", true, 0, new[] { 3, 6, 9, 12 }, 0, 5, 0), // 5% fee initially usually
                new("HomeCredit_0Percent", "Home Credit (0% Lãi suất)", "FinanceCompany", true, 0, new[] { 4, 6 }, 30, 0, 12000), // Min 30% down
                new("HomeCredit_Standard", "Home Credit (Lãi suất tiêu chuẩn)", "FinanceCompany", false, 35, new[] { 6, 9, 12, 15, 18 }, 20, 0, 12000),
                new("HDSaison_0Percent", "HD Saison (0% Lãi suất)", "FinanceCompany", true, 0, new[] { 6 }, 40, 0, 12000),
                new("Mcredit_Standard", "Mcredit (Tiêu chuẩn)", "FinanceCompany", false, 40, new[] { 6, 9, 12, 18, 24 }, 10, 0, 12000)
            };

            return Results.Ok(providers);
        });
    }
}

public record InstallmentCalculationRequest(
    decimal TotalAmount,
    int TermMonths,
    decimal DownPaymentPercent,
    decimal AnnualInterestRate = 0, // 0 for "0% Trả Góp"
    decimal? ProcessingFee = 0,
    decimal? MonthlyCollectionFee = 12000 // Common for VN finance companies
);

public record InstallmentCalculationResponse(
    decimal Principal,
    decimal DownPaymentAmount,
    decimal MonthlyPayment,
    decimal TotalPayment,
    decimal Difference, // Chênh lệch so với mua thẳng
    int TermMonths,
    decimal InterestRate
);

public record InstallmentProvider(
    string Code,
    string Name,
    string Type, // CreditCard, FinanceCompany
    bool IsZeroPercent,
    decimal AnnualInterestRate,
    int[] SupportedTerms,
    decimal MinDownPaymentPercent, // required downpayment
    decimal ProcessingFeePercent, // Usually mapped to merchant fee for credit cards
    decimal MonthlyCollectionFee
);

using Ai.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Ai.Application;

public record RetrievedProduct(string Name, string? Description, decimal Price, string? Specifications);

/// <summary>
/// W2-15: SQL-side product retrieval for the chatbot's RAG context. The old code ran
/// `SELECT "Id", "Name" FROM public."Products" WHERE "IsActive" = true` with NO limit - every
/// active product loaded into C# memory on every question - then scored matches in a loop.
/// Every query here filters and orders in Postgres and only ever fetches the rows it returns
/// (<= 5), using the same unaccent+ILIKE approach as Catalog's product search
/// (`qh_unaccent_immutable`, W0-5) so "laptop" still matches "Laptop" and "may tinh" still
/// matches "máy tính".
/// </summary>
public interface IProductRetrievalService
{
    Task<IReadOnlyList<RetrievedProduct>> FindRelevantAsync(string question, IReadOnlyList<string> keywords, CancellationToken ct);
}

public class ProductRetrievalService : IProductRetrievalService
{
    private const string SelectColumns = "\"Name\", \"Description\", \"Price\", \"Specifications\"::text";
    private const int MaxKeywords = 5;
    private const int MaxResults = 5;

    private readonly AiDbContext _db;
    private readonly ILogger<ProductRetrievalService> _logger;

    public ProductRetrievalService(AiDbContext db, ILogger<ProductRetrievalService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<IReadOnlyList<RetrievedProduct>> FindRelevantAsync(
        string question, IReadOnlyList<string> keywords, CancellationToken ct)
    {
        var conn = _db.Database.GetDbConnection();
        var wasOpen = conn.State == System.Data.ConnectionState.Open;
        if (!wasOpen) await conn.OpenAsync(ct);

        try
        {
            var isMostExpensive = question.Contains("đắt nhất", StringComparison.OrdinalIgnoreCase)
                || question.Contains("cao nhất", StringComparison.OrdinalIgnoreCase);
            var isCheapest = question.Contains("rẻ nhất", StringComparison.OrdinalIgnoreCase)
                || question.Contains("thấp nhất", StringComparison.OrdinalIgnoreCase);

            if (isMostExpensive || isCheapest)
            {
                var order = isMostExpensive ? "DESC" : "ASC";
                using var cmd = conn.CreateCommand();
                cmd.CommandText = $"SELECT {SelectColumns} FROM public.\"Products\" WHERE \"IsActive\" = true ORDER BY \"Price\" {order} LIMIT {MaxResults};";
                return await ReadProductsAsync(cmd, ct);
            }

            if (keywords.Count == 0) return Array.Empty<RetrievedProduct>();

            using var scoredCmd = conn.CreateCommand();
            var terms = keywords.Take(MaxKeywords).ToArray();
            var orConditions = new List<string>();
            var scoreExpr = new List<string>();

            for (var i = 0; i < terms.Length; i++)
            {
                var pName = $"kw{i}";
                orConditions.Add(
                    $"(public.qh_unaccent_immutable(\"Name\") ILIKE public.qh_unaccent_immutable(@{pName}) " +
                    $"OR public.qh_unaccent_immutable(\"Description\") ILIKE public.qh_unaccent_immutable(@{pName}))");
                scoreExpr.Add(
                    $"(CASE WHEN public.qh_unaccent_immutable(\"Name\") ILIKE public.qh_unaccent_immutable(@{pName}) THEN 2 ELSE 0 END " +
                    $"+ CASE WHEN public.qh_unaccent_immutable(\"Description\") ILIKE public.qh_unaccent_immutable(@{pName}) THEN 1 ELSE 0 END)");

                var p = scoredCmd.CreateParameter();
                p.ParameterName = pName;
                p.Value = $"%{terms[i]}%";
                scoredCmd.Parameters.Add(p);
            }

            scoredCmd.CommandText =
                $"SELECT {SelectColumns} FROM public.\"Products\" " +
                $"WHERE \"IsActive\" = true AND ({string.Join(" OR ", orConditions)}) " +
                $"ORDER BY ({string.Join(" + ", scoreExpr)}) DESC " +
                $"LIMIT {MaxResults};";

            return await ReadProductsAsync(scoredCmd, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to query live Products table for AI retrieval");
            return Array.Empty<RetrievedProduct>();
        }
        finally
        {
            if (!wasOpen) await conn.CloseAsync();
        }
    }

    private static async Task<IReadOnlyList<RetrievedProduct>> ReadProductsAsync(
        System.Data.Common.DbCommand cmd, CancellationToken ct)
    {
        var results = new List<RetrievedProduct>();
        using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            var name = reader.GetString(0);
            var desc = reader.IsDBNull(1) ? null : reader.GetString(1);
            var price = reader.GetDecimal(2);
            var specs = reader.FieldCount > 3 && !reader.IsDBNull(3) ? reader.GetString(3) : null;

            if (desc?.Length > 250) desc = desc[..250] + "...";
            if (specs?.Length > 250) specs = specs[..250] + "...";

            results.Add(new RetrievedProduct(name, desc, price, specs));
        }
        return results;
    }
}

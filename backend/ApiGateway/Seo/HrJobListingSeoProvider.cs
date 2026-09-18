using System.Text.RegularExpressions;
using BuildingBlocks.Seo;
using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace ApiGateway.Seo;

/// <summary>
/// `/tuyen-dung`, `/tuyen-dung/{id}` (D11 assigns these to "Content/Seo", but the data is
/// `HR.Domain.JobListing` — `Content.csproj` has no reference to `HR.csproj` and adding one is a
/// module-boundary change outside this track's ownership. `ApiGateway.csproj` already references
/// BOTH, being the host, so this lives here instead — same public contract, same read-only
/// DbContext access pattern as every other provider. Filed as a note in the report, not an
/// integration request: no other file needs to change for this to work.
/// </summary>
public sealed class HrJobListingSeoProvider : ISeoPageProvider
{
    private static readonly Regex DetailPattern = new(@"^/tuyen-dung/(?<id>[0-9a-fA-F-]{36})$", RegexOptions.Compiled);
    private readonly HRDbContext _db;

    public HrJobListingSeoProvider(HRDbContext db) => _db = db;

    public bool TryMatch(string path) => path == "/tuyen-dung" || DetailPattern.IsMatch(path);

    public async Task<SeoPage?> ResolveAsync(string path, string query, CancellationToken ct)
    {
        if (path == "/tuyen-dung")
        {
            var count = await _db.JobListings.CountAsync(j => j.Status == JobStatus.Active, ct);
            return new SeoPage
            {
                Status = 200,
                Title = "Tuyển dụng - Quang Hưởng Computer",
                Description = $"Quang Hưởng Computer đang tuyển {count} vị trí. Ứng tuyển ngay để làm việc trong môi trường chuyên nghiệp, chế độ đãi ngộ tốt.",
                CanonicalPath = "/tuyen-dung",
                Robots = "index,follow",
                JsonLd = new object[]
                {
                    SeoJsonLdBuilders.BreadcrumbList(new[] { ("Trang chủ", (string?)"/"), ("Tuyển dụng", (string?)null) }),
                },
            };
        }

        var match = DetailPattern.Match(path);
        if (!match.Success || !Guid.TryParse(match.Groups["id"].Value, out var id)) return null;

        var job = await _db.JobListings.FirstOrDefaultAsync(j => j.Id == id && j.Status == JobStatus.Active, ct);
        if (job is null) return SeoPage.NotFound(path);

        var description = job.Description.Length > 160 ? job.Description[..157] + "..." : job.Description;
        return new SeoPage
        {
            Status = 200,
            Title = $"{job.Title} - Tuyển dụng - Quang Hưởng Computer",
            Description = description,
            CanonicalPath = path,
            Robots = "index,follow",
            JsonLd = new object[]
            {
                SeoJsonLdBuilders.BreadcrumbList(new[] { ("Trang chủ", (string?)"/"), ("Tuyển dụng", (string?)"/tuyen-dung"), (job.Title, (string?)null) }),
            },
        };
    }

    public async IAsyncEnumerable<SitemapEntry> EnumerateAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        yield return new SitemapEntry("/tuyen-dung", null, "weekly", 0.6m);

        var jobs = _db.JobListings.Where(j => j.Status == JobStatus.Active).Select(j => new { j.Id, j.UpdatedAt });
        await foreach (var job in jobs.AsAsyncEnumerable().WithCancellation(ct))
        {
            yield return new SitemapEntry($"/tuyen-dung/{job.Id}", job.UpdatedAt, "weekly", 0.5m);
        }
    }
}

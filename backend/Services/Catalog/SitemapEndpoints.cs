using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Catalog.Infrastructure;
using System.Text;

namespace Catalog;

public static class SitemapEndpoints
{
    public static void MapSitemapEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/sitemap.xml", async (CatalogDbContext db, IConfiguration config) =>
        {
            var baseUrl = config["App:BaseUrl"] ?? "https://quanghuongcomputer.com";
            var sb = new StringBuilder();
            sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
            sb.AppendLine("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");

            // Static pages
            var staticPages = new[] { "", "/gioi-thieu", "/lien-he", "/bao-hanh", "/sua-chua", "/tuyen-dung" };
            foreach (var page in staticPages)
            {
                sb.AppendLine($"  <url><loc>{baseUrl}{page}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>");
            }

            // Products
            var products = await db.Products
                .Where(p => p.IsActive)
                .Select(p => new { p.Slug, p.UpdatedAt })
                .ToListAsync();

            foreach (var p in products)
            {
                if (string.IsNullOrEmpty(p.Slug)) continue;
                var lastMod = p.UpdatedAt?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.ToString("yyyy-MM-dd");
                sb.AppendLine($"  <url><loc>{baseUrl}/san-pham/{p.Slug}</loc><lastmod>{lastMod}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>");
            }

            // Categories
            var categories = await db.Categories
                .Select(c => new { c.Slug, c.UpdatedAt })
                .ToListAsync();

            foreach (var c in categories)
            {
                if (string.IsNullOrEmpty(c.Slug)) continue;
                var lastMod = c.UpdatedAt?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.ToString("yyyy-MM-dd");
                sb.AppendLine($"  <url><loc>{baseUrl}/danh-muc/{c.Slug}</loc><lastmod>{lastMod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>");
            }

            sb.AppendLine("</urlset>");
            return Results.Content(sb.ToString(), "application/xml");
        });

        app.MapGet("/robots.txt", (IConfiguration config) =>
        {
            var baseUrl = config["App:BaseUrl"] ?? "https://quanghuongcomputer.com";
            var content = $@"User-agent: *
Allow: /
Disallow: /backoffice/
Disallow: /admin/
Disallow: /api/
Disallow: /dang-nhap
Disallow: /dang-ky

Sitemap: {baseUrl}/sitemap.xml";

            return Results.Content(content, "text/plain");
        });
    }
}

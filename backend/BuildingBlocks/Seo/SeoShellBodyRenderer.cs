using System.Text;

namespace BuildingBlocks.Seo;

/// <summary>
/// Turns a <see cref="SeoBodyFragment"/> into the markup spliced between `&lt;!-- seo:body --&gt;` and
/// `&lt;!-- /seo:body --&gt;` inside `#root`. Every string goes through <see cref="SeoHtmlSanitizer.Encode"/>;
/// links are emitted only for root-relative paths (never `//host`, never a scheme), so a provider
/// cannot smuggle `javascript:` in through a slug. Lives in BuildingBlocks (pure function, no host
/// dependency) so it is unit-tested in the default suite; the shell endpoint in ApiGateway calls it. The only pre-built HTML is
/// <see cref="SeoBodyFragment.Article"/>, whose type can only come out of the allow-list sanitizer.
///
/// Styling: the `.seo-snapshot` rules in `frontend/index.html`'s inline `&lt;style&gt;` (no inline
/// `style=` attributes, no scripts — CSP). The SPA mounts with `createRoot` (not `hydrateRoot`), so
/// React throws this whole block away on first render; markup never has to match React's.
/// </summary>
public static class SeoShellBodyRenderer
{
    public static string Render(SeoBodyFragment body)
    {
        var sb = new StringBuilder(1024);
        sb.Append("<main class=\"seo-snapshot\">");

        if (body.Breadcrumbs.Count > 0)
        {
            sb.Append("<nav class=\"seo-crumbs\" aria-label=\"Breadcrumb\">");
            for (var i = 0; i < body.Breadcrumbs.Count; i++)
            {
                if (i > 0) sb.Append(" › ");
                AppendLink(sb, body.Breadcrumbs[i]);
            }
            sb.Append("</nav>");
        }

        sb.Append("<h1>").Append(E(body.Heading)).Append("</h1>");

        foreach (var fact in body.Facts)
        {
            sb.Append("<p><strong>").Append(E(fact.Label)).Append(":</strong> ").Append(E(fact.Value)).Append("</p>");
        }

        if (body.Specs.Count > 0)
        {
            sb.Append("<h2>Thông số chính</h2><ul>");
            foreach (var spec in body.Specs)
            {
                sb.Append("<li><strong>").Append(E(spec.Label)).Append(":</strong> ").Append(E(spec.Value)).Append("</li>");
            }
            sb.Append("</ul>");
        }

        if (!string.IsNullOrWhiteSpace(body.Summary))
        {
            sb.Append("<p>").Append(E(body.Summary)).Append("</p>");
        }

        if (body.Items.Count > 0)
        {
            if (!string.IsNullOrWhiteSpace(body.ItemsHeading)) sb.Append("<h2>").Append(E(body.ItemsHeading)).Append("</h2>");
            sb.Append("<ul>");
            foreach (var item in body.Items)
            {
                sb.Append("<li>");
                AppendLink(sb, new SeoLink(item.Text, item.Href));
                if (!string.IsNullOrWhiteSpace(item.Detail)) sb.Append(" — ").Append(E(item.Detail));
                sb.Append("</li>");
            }
            sb.Append("</ul>");
        }

        if (body.PreviousPage is not null || body.NextPage is not null)
        {
            sb.Append("<nav class=\"seo-pager\" aria-label=\"Phân trang\">");
            if (body.PreviousPage is { } prev) AppendLink(sb, prev, "prev");
            if (body.PreviousPage is not null && body.NextPage is not null) sb.Append(" · ");
            if (body.NextPage is { } next) AppendLink(sb, next, "next");
            sb.Append("</nav>");
        }

        if (body.Article is not null)
        {
            sb.Append("<article>").Append(body.Article.Value).Append("</article>");
        }

        sb.Append("</main>");
        return sb.ToString();
    }

    private static string E(string? value) => SeoHtmlSanitizer.Encode(value);

    private static void AppendLink(StringBuilder sb, SeoLink link, string? rel = null)
    {
        if (link.Href is null || !IsRootRelative(link.Href))
        {
            sb.Append("<span>").Append(E(link.Text)).Append("</span>");
            return;
        }
        sb.Append("<a href=\"").Append(E(link.Href)).Append('"');
        if (rel is not null) sb.Append(" rel=\"").Append(rel).Append('"');
        sb.Append('>').Append(E(link.Text)).Append("</a>");
    }

    private static bool IsRootRelative(string href) =>
        href.StartsWith('/') && !href.StartsWith("//") && !href.StartsWith("/\\") && !href.Any(char.IsControl);
}

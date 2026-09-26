using Microsoft.AspNetCore.Http;

namespace Identity.Services;

/// <summary>
/// CSRF guard for the two routes the refresh cookie authenticates (refresh-token, logout).
///
/// Layer 1 is <c>SameSite=Strict</c> on the cookie. This is layer 2: the request must carry
/// <c>X-Requested-With: XMLHttpRequest</c>. A plain HTML form or an <c>&lt;img&gt;</c> cannot set a
/// custom header, and a cross-origin <c>fetch</c> that sets one triggers a CORS preflight, which
/// the API only answers for its configured origins. So even a browser that ignored SameSite
/// could not be driven into rotating or revoking someone's session from another site.
/// </summary>
public sealed class RequireAjaxHeaderFilter : IEndpointFilter
{
    public const string HeaderName = "X-Requested-With";
    public const string HeaderValue = "XMLHttpRequest";

    public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var value = context.HttpContext.Request.Headers[HeaderName].ToString();
        if (!string.Equals(value, HeaderValue, StringComparison.OrdinalIgnoreCase))
        {
            return ValueTask.FromResult<object?>(Results.BadRequest(new
            {
                Error = $"Thiếu header {HeaderName}: {HeaderValue}."
            }));
        }

        return next(context);
    }
}

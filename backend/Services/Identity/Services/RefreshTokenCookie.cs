using Identity.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Identity.Services;

/// <summary>
/// The refresh token's only transport to the browser: an <c>HttpOnly</c> cookie.
///
/// Before this, login answered <c>{ token, refreshToken }</c> and the SPA kept both in
/// localStorage, so a single XSS anywhere on the site (storefront or back office) was a full,
/// long-lived account takeover. Now:
///   · <c>HttpOnly</c>  — no script can read it, an injected one included;
///   · <c>SameSite=Strict</c> — never attached to a request another site starts (the CSRF answer,
///     together with <see cref="RequireAjaxHeaderFilter"/>). Google sign-in is an XHR that posts the
///     id_token, not a redirect back to us, so Strict does not break it;
///   · <c>Path=/api/auth</c> — only refresh-token/logout (and the login routes that set it) ever
///     receive it; every other API call carries just the short-lived bearer token;
///   · <c>Secure</c> — always, except a Development host reached over plain HTTP (LAN testing on
///     <c>http://192.168.x.x:5174</c> would otherwise silently drop it). Browsers accept Secure
///     cookies from <c>http://localhost</c>, so the local prod-like stack keeps working.
/// </summary>
public static class RefreshTokenCookie
{
    public const string Name = "qh_rt";
    public const string CookiePath = "/api/auth";

    /// <summary>Writes the cookie for <paramref name="response"/> and returns the JSON body (no refresh token in it).</summary>
    public static IResult SignIn(HttpContext httpContext, LoginResponseDto response)
    {
        Write(httpContext, response.RefreshToken, response.RefreshTokenExpiresAt);
        return Results.Ok(response);
    }

    public static void Write(HttpContext httpContext, string token, DateTime expiresAtUtc)
    {
        var options = BaseOptions(httpContext);
        options.Expires = new DateTimeOffset(DateTime.SpecifyKind(expiresAtUtc, DateTimeKind.Utc));
        httpContext.Response.Cookies.Append(Name, token, options);
    }

    /// <summary>Expires the cookie. Same Path/SameSite/Secure as <see cref="Write"/>, or the browser keeps it.</summary>
    public static void Clear(HttpContext httpContext) =>
        httpContext.Response.Cookies.Delete(Name, BaseOptions(httpContext));

    public static string? Read(HttpContext httpContext) =>
        httpContext.Request.Cookies.TryGetValue(Name, out var value) && !string.IsNullOrWhiteSpace(value)
            ? value
            : null;

    private static CookieOptions BaseOptions(HttpContext httpContext) => new()
    {
        HttpOnly = true,
        IsEssential = true,
        SameSite = SameSiteMode.Strict,
        Secure = RequiresSecure(httpContext),
        Path = CookiePath,
    };

    private static bool RequiresSecure(HttpContext httpContext)
    {
        if (httpContext.Request.IsHttps) return true;
        var env = httpContext.RequestServices?.GetService<IHostEnvironment>();
        return env is null || !env.IsDevelopment();
    }
}

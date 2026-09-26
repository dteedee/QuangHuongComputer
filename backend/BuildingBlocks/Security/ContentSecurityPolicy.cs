namespace BuildingBlocks.Security;

/// <summary>
/// The one Content-Security-Policy for the whole site. The API sends it (SecurityHeadersMiddleware,
/// which also covers the SEO-shell HTML it renders) and <c>deploy/Caddyfile</c> sends the SAME
/// string for everything Caddy serves itself (static index.html fallback, assets). A unit test
/// (ContentSecurityPolicyTests) fails when the two drift apart.
///
/// <c>script-src</c> has NO <c>'unsafe-inline'</c>: the built SPA is one module script plus
/// external third-party loaders, the only inline <c>&lt;script&gt;</c> the shell emits is
/// <c>type="application/ld+json"</c> (data, never executed, not governed by script-src), and
/// the one inline script the SPA used to inject (Facebook Pixel bootstrap) is now plain bundled code.
/// With it gone, an HTML-injection bug can no longer run script.
///
/// <c>style-src</c> keeps <c>'unsafe-inline'</c>: React <c>style=</c> props, framer-motion and the
/// shell's inline snapshot <c>&lt;style&gt;</c> need it, and CSS injection cannot read tokens
/// (the refresh token is an HttpOnly cookie and the access token lives only in JS memory).
///
/// Third parties allowed, and why:
///   · Google Sign-In (accounts.google.com, gsi client + iframe + style), reCAPTCHA v3
///     (www.google.com, www.gstatic.com, recaptcha.google.com), GA4 (googletagmanager, google-analytics),
///     Facebook Pixel (connect.facebook.net, www.facebook.com);
///   · YouTube product videos and Google Maps store embeds (frame-src), warranty-receipt QR (img-src);
///   · payment gateways: checkout leaves via <c>window.location</c> to the gateway's paymentUrl, a
///     top-level navigation CSP does not restrict, and returns to our own /payment/* route, so no
///     gateway host is needed here; form-action lists VNPay/MoMo anyway in case a gateway flow posts a form.
/// </summary>
public static class ContentSecurityPolicy
{
    private static readonly string[] Directives =
    {
        "default-src 'self'",
        "script-src 'self' https://accounts.google.com https://apis.google.com https://www.gstatic.com https://www.google.com https://www.googletagmanager.com https://connect.facebook.net",
        "frame-src 'self' https://accounts.google.com https://www.google.com https://recaptcha.google.com https://www.youtube.com https://www.youtube-nocookie.com https://maps.google.com https://www.facebook.com",
        "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://www.google.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://graph.facebook.com https://www.facebook.com wss: ws:",
        "style-src 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com",
        "img-src 'self' data: blob: https://lh3.googleusercontent.com https://www.google.com https://i.ytimg.com https://api.qrserver.com https://*.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://platform-lookaside.fbsbx.com https://res.cloudinary.com https://*.cloudinary.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'self'",
        "form-action 'self' https://accounts.google.com https://www.facebook.com https://sandbox.vnpayment.vn https://pay.vnpay.vn https://test-payment.momo.vn https://payment.momo.vn",
    };

    /// <summary>
    /// The policy header value. <paramref name="upgradeInsecureRequests"/> is added by the API outside
    /// Development; Caddy leaves it out (HSTS already covers the real domain, and the local
    /// <c>http://localhost:8080</c> stack must not be upgraded to an HTTPS port nothing listens on).
    /// </summary>
    public static string Build(bool upgradeInsecureRequests)
    {
        var directives = upgradeInsecureRequests
            ? Directives.Append("upgrade-insecure-requests")
            : Directives;
        return string.Join("; ", directives);
    }
}

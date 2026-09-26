using System.Net.Http.Headers;

namespace IntegrationTests.Infrastructure;

/// <summary>
/// Refresh token đi bằng cookie HttpOnly <c>qh_rt</c> (không còn trong body). HttpClient của
/// WebApplicationFactory không giữ cookie giữa các request, nên test tự đọc Set-Cookie và tự gửi
/// header Cookie — tường minh hơn, và kiểm được luôn từng thuộc tính của cookie.
/// </summary>
public static class RefreshCookieRequests
{
    public const string CookieName = "qh_rt";

    /// <summary>Header Set-Cookie của <c>qh_rt</c> trong phản hồi (nguyên văn), hoặc null.</summary>
    public static string? SetCookieHeader(HttpResponseMessage response) =>
        response.Headers.TryGetValues("Set-Cookie", out var values)
            ? values.FirstOrDefault(v => v.StartsWith(CookieName + "=", StringComparison.Ordinal))
            : null;

    /// <summary>Giá trị refresh token mà phản hồi vừa đặt vào cookie; null nếu không đặt/đã xoá.</summary>
    public static string? TokenFrom(HttpResponseMessage response)
    {
        var header = SetCookieHeader(response);
        if (header is null) return null;
        var value = header[(CookieName.Length + 1)..].Split(';')[0];
        return string.IsNullOrEmpty(value) ? null : Uri.UnescapeDataString(value);
    }

    /// <summary>POST tới route cookie (refresh-token/logout) như SPA gửi: cookie + header chống CSRF.</summary>
    public static Task<HttpResponseMessage> PostAsync(
        HttpClient client, string path, string? refreshToken, bool withCsrfHeader = true)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = new StringContent("{}", MediaTypeHeaderValue.Parse("application/json")),
        };
        if (refreshToken != null) request.Headers.Add("Cookie", $"{CookieName}={Uri.EscapeDataString(refreshToken)}");
        if (withCsrfHeader) request.Headers.Add("X-Requested-With", "XMLHttpRequest");
        return client.SendAsync(request);
    }

    public static Task<HttpResponseMessage> RefreshAsync(HttpClient client, string? refreshToken, bool withCsrfHeader = true) =>
        PostAsync(client, "/api/auth/refresh-token", refreshToken, withCsrfHeader);

    public static Task<HttpResponseMessage> LogoutAsync(HttpClient client, string? refreshToken) =>
        PostAsync(client, "/api/auth/logout", refreshToken);
}

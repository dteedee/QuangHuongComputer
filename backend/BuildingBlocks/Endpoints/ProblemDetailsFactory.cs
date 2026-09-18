using System.Diagnostics;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace BuildingBlocks.Endpoints;

/// <summary>
/// The single place that builds an error body. Every 4xx/5xx the API emits goes through here, so
/// there is exactly ONE shape to learn and ONE place to change it.
///
/// Wire shape (RFC 9457 <c>application/problem+json</c>) - FROZEN by W1-3, see
/// <c>docs/api-conventions.md</c>:
/// <code>
/// {
///   "type":    "https://httpstatuses.io/400",
///   "title":   "Validation Failed",              // stable English, for logs/devs
///   "status":  400,
///   "code":    "VALIDATION_FAILED",              // stable machine code, branch on this
///   "instance":"/api/catalog/products",
///   "traceId": "00-abc...-01",                   // quote this in a bug report
///   "error":   "Dữ liệu gửi lên không hợp lệ.",  // legacy key, 73 SPA call sites read it
///   "message": "Dữ liệu gửi lên không hợp lệ.",  // legacy key, 26 SPA call sites read it
///   "errors":  [ { "field": "email", "code": "NotEmptyValidator", "message": "..." } ]
/// }
/// </code>
/// <c>errors</c> is omitted when empty. <c>detail</c> (raw exception text) is added in Development
/// only - outside Development the body must never carry SQL, schema names or stack traces.
/// </summary>
public static class ProblemDetailsFactory
{
    public const string ContentType = "application/problem+json";

    /// <summary>Web defaults = camelCase, which is what every other response in this API uses.</summary>
    public static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Builds the body as an ordered dictionary. A dictionary (rather than a typed record) keeps the
    /// legacy <c>error</c>/<c>message</c> keys and the optional <c>errors</c>/<c>detail</c> keys in
    /// one object without inventing a class per status code.
    /// </summary>
    public static Dictionary<string, object?> Build(
        HttpContext context,
        int status,
        string title,
        string code,
        string message,
        IReadOnlyList<ApiFieldError>? errors = null,
        string? detail = null)
    {
        var body = new Dictionary<string, object?>
        {
            ["type"] = $"https://httpstatuses.io/{status}",
            ["title"] = title,
            ["status"] = status,
            ["code"] = code,
            ["instance"] = context.Request.Path.Value,
            ["traceId"] = TraceId(context),
            // Legacy keys the SPA already reads. Same text, no new shape to learn.
            ["error"] = message,
            ["message"] = message
        };

        if (errors is { Count: > 0 })
        {
            body["errors"] = errors;
        }

        if (!string.IsNullOrEmpty(detail))
        {
            body["detail"] = detail;
        }

        return body;
    }

    /// <summary>
    /// Writes the body onto the response. Callers must check <c>Response.HasStarted</c> first - this
    /// method sets the status code and cannot recover once headers are on the wire.
    /// </summary>
    public static Task WriteAsync(
        HttpContext context,
        int status,
        string title,
        string code,
        string message,
        IReadOnlyList<ApiFieldError>? errors = null,
        string? detail = null)
    {
        context.Response.StatusCode = status;
        context.Response.ContentType = ContentType;
        var body = Build(context, status, title, code, message, errors, detail);
        return context.Response.WriteAsync(JsonSerializer.Serialize(body, SerializerOptions));
    }

    /// <summary>
    /// The id the caller quotes in a bug report and the one Serilog stamps on the log line.
    /// <c>Activity.Current?.Id</c> is the W3C trace id when tracing is on; otherwise ASP.NET Core's
    /// per-connection <c>TraceIdentifier</c>, which is still unique within the process.
    /// </summary>
    public static string TraceId(HttpContext context)
        => Activity.Current?.Id ?? context.TraceIdentifier;

    /// <summary>
    /// FluentValidation reports nested paths as <c>Address.Street</c> and collection paths as
    /// <c>Items[0].Sku</c>. The JSON the client sent is camelCase, so each SEGMENT is lower-cased
    /// individually; the indexer and the dots are preserved so the SPA can map the error straight
    /// onto its react-hook-form field name.
    /// </summary>
    public static string ToCamelCasePath(string? propertyPath)
    {
        if (string.IsNullOrEmpty(propertyPath)) return string.Empty;

        var segments = propertyPath.Split('.');
        for (var i = 0; i < segments.Length; i++)
        {
            var segment = segments[i];
            if (segment.Length == 0 || !char.IsUpper(segment[0])) continue;
            segments[i] = char.ToLowerInvariant(segment[0]) + segment[1..];
        }
        return string.Join('.', segments);
    }
}

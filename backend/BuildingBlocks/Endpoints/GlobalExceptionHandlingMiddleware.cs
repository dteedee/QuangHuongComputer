using System.Diagnostics;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.Endpoints;

/// <summary>
/// Standard error response format for the entire system. Kept as a type for callers that build one
/// by hand; the middleware writes the same fields plus the RFC 7807 ProblemDetails ones.
/// </summary>
public class ErrorResponse
{
    public string Message { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public string? Instance { get; set; }
    public int StatusCode { get; set; }
    public string? TraceId { get; set; }
}

/// <summary>
/// Catches every unhandled exception and returns one shape: RFC 7807 ProblemDetails
/// (<c>application/problem+json</c>) carrying a <c>traceId</c>, plus the legacy <c>error</c> /
/// <c>message</c> keys the frontend already reads (73 call sites read <c>data.error</c>,
/// 26 read <c>data.message</c>) so no page has to change.
///
/// Two hard rules:
/// 1. A database CONSTRAINT violation is a client error, not a 500 — see <see cref="DatabaseExceptionMapper"/>.
/// 2. Outside Development the body never contains exception text, stack traces, SQL or schema names.
///    The full exception goes to the log, and the caller gets the <c>traceId</c> to quote.
/// </summary>
public class GlobalExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    public GlobalExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionHandlingMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            // The client hung up. Nothing to write to, and it is not a fault worth an error log.
            if (context.RequestAborted.IsCancellationRequested && ex is OperationCanceledException)
            {
                _logger.LogDebug("Request aborted by the client at {Path}", context.Request.Path);
                return;
            }

            if (context.Response.HasStarted)
            {
                _logger.LogError(ex, "Response already started; cannot convert the exception at {Path} into a response",
                    context.Request.Path);
                return;
            }

            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (status, title, message) = Classify(exception);

        // 5xx is a fault we must fix; 4xx is the caller's problem and must not flood the error log.
        if (status >= 500)
        {
            _logger.LogError(exception, "Unhandled exception at {Method} {Path} -> {Status}",
                context.Request.Method, context.Request.Path, status);
        }
        else
        {
            _logger.LogWarning(exception, "Request rejected at {Method} {Path} -> {Status}: {Title}",
                context.Request.Method, context.Request.Path, status, title);
        }

        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";

        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;
        var body = new Dictionary<string, object?>
        {
            ["type"] = $"https://httpstatuses.io/{status}",
            ["title"] = title,
            ["status"] = status,
            ["instance"] = context.Request.Path.Value,
            ["traceId"] = traceId,
            // Legacy keys the SPA already reads. Same text, no new shape to learn.
            ["error"] = message,
            ["message"] = message
        };

        // Exception text is a Development-only affordance: it can carry SQL, table names and paths.
        if (_env.IsDevelopment())
        {
            body["detail"] = exception.ToString();
        }

        await context.Response.WriteAsync(JsonSerializer.Serialize(body, SerializerOptions));
    }

    private (int Status, string Title, string Message) Classify(Exception exception)
    {
        // 1. Database constraint violations are client errors (409/400), never 500.
        var dbMapping = DatabaseExceptionMapper.Map(exception);
        if (dbMapping is not null)
        {
            return (dbMapping.Value.StatusCode, dbMapping.Value.Title, dbMapping.Value.Message);
        }

        switch (exception)
        {
            // Malformed JSON body / missing required query parameter — the caller's mistake.
            case BadHttpRequestException badRequest:
                return (badRequest.StatusCode, "Bad Request",
                    "Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại định dạng.");

            case UnauthorizedAccessException:
                return ((int)HttpStatusCode.Unauthorized, "Unauthorized", "Bạn không có quyền truy cập.");

            case KeyNotFoundException:
                return ((int)HttpStatusCode.NotFound, "Not Found", "Không tìm thấy dữ liệu yêu cầu.");

            // Thrown deliberately by validators and guard clauses; the message is written for the user.
            case ArgumentException argument:
                return ((int)HttpStatusCode.BadRequest, "Invalid Argument", argument.Message);

            // ObjectDisposedException derives from InvalidOperationException but is always our bug
            // (a scoped service used after the request ended) — it must stay a loud 500.
            case ObjectDisposedException:
                return ((int)HttpStatusCode.InternalServerError, "Internal Server Error",
                    "Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.");

            // InvalidOperationException also comes out of EF and other libraries, where the message
            // can name tables and expressions — so it is only surfaced in Development.
            case InvalidOperationException invalidOperation:
                return ((int)HttpStatusCode.BadRequest, "Invalid Operation",
                    _env.IsDevelopment() ? invalidOperation.Message : "Yêu cầu không thực hiện được ở trạng thái hiện tại.");

            case TimeoutException:
                return ((int)HttpStatusCode.GatewayTimeout, "Timeout", "Hệ thống phản hồi quá chậm. Vui lòng thử lại.");

            default:
                return ((int)HttpStatusCode.InternalServerError, "Internal Server Error",
                    _env.IsDevelopment()
                        ? exception.Message
                        : "Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.");
        }
    }
}

/// <summary>
/// Extension method to register global exception handling middleware
/// </summary>
public static class GlobalExceptionHandlingMiddlewareExtensions
{
    public static IApplicationBuilder UseGlobalExceptionHandling(this IApplicationBuilder app)
    {
        return app.UseMiddleware<GlobalExceptionHandlingMiddleware>();
    }
}

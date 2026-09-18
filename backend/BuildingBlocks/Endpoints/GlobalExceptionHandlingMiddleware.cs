using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.Endpoints;

/// <summary>
/// Legacy hand-rolled error shape. Superseded by <see cref="ProblemDetailsFactory"/>, which is now
/// the ONE place an error body is built (W1-3). Kept only so a call site written before this track
/// still compiles; it has zero references in the backend today.
/// </summary>
[Obsolete("Throw a DomainException (or one of its subtypes) and let the middleware build the body via ProblemDetailsFactory.")]
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
        var classified = Classify(exception);

        // 5xx is a fault we must fix; 4xx is the caller's problem and must not flood the error log.
        if (classified.Status >= 500)
        {
            _logger.LogError(exception, "Unhandled exception at {Method} {Path} -> {Status}",
                context.Request.Method, context.Request.Path, classified.Status);
        }
        else
        {
            _logger.LogWarning(exception, "Request rejected at {Method} {Path} -> {Status}: {Title}",
                context.Request.Method, context.Request.Path, classified.Status, classified.Title);
        }

        // Exception text is a Development-only affordance: it can carry SQL, table names and paths.
        var detail = _env.IsDevelopment() ? exception.ToString() : null;

        await ProblemDetailsFactory.WriteAsync(
            context,
            classified.Status,
            classified.Title,
            classified.Code,
            classified.Message,
            classified.Errors,
            detail);
    }

    private readonly record struct ClassifiedError(
        int Status,
        string Title,
        string Code,
        string Message,
        IReadOnlyList<ApiFieldError>? Errors = null);

    private ClassifiedError Classify(Exception exception)
    {
        // 1. Raised on purpose by a handler / service / aggregate. Its message IS user copy and is
        //    shown in every environment, so it must never be built from exception or SQL text.
        if (exception is DomainException domain)
        {
            return new ClassifiedError(domain.StatusCode, TitleForStatus(domain.StatusCode),
                domain.Code, domain.Message, domain.Errors);
        }

        // 2. Database constraint violations are client errors (409/400), never 500.
        var dbMapping = DatabaseExceptionMapper.Map(exception);
        if (dbMapping is not null)
        {
            return new ClassifiedError(dbMapping.Value.StatusCode, dbMapping.Value.Title,
                dbMapping.Value.Code, dbMapping.Value.Message);
        }

        switch (exception)
        {
            // Malformed JSON body / missing required query parameter — the caller's mistake.
            case BadHttpRequestException badRequest:
                return new ClassifiedError(badRequest.StatusCode, "Bad Request", ApiErrorCodes.BadRequest,
                    "Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại định dạng.");

            case UnauthorizedAccessException:
                return new ClassifiedError((int)HttpStatusCode.Unauthorized, "Unauthorized",
                    ApiErrorCodes.Unauthorized, "Bạn không có quyền truy cập.");

            case KeyNotFoundException:
                return new ClassifiedError((int)HttpStatusCode.NotFound, "Not Found",
                    ApiErrorCodes.NotFound, "Không tìm thấy dữ liệu yêu cầu.");

            // Thrown deliberately by validators and guard clauses; the message is written for the user.
            case ArgumentException argument:
                return new ClassifiedError((int)HttpStatusCode.BadRequest, "Invalid Argument",
                    ApiErrorCodes.ValidationFailed, argument.Message,
                    string.IsNullOrEmpty(argument.ParamName)
                        ? null
                        : new[]
                        {
                            new ApiFieldError(
                                ProblemDetailsFactory.ToCamelCasePath(argument.ParamName),
                                ApiErrorCodes.InvalidValue,
                                argument.Message)
                        });

            // ObjectDisposedException derives from InvalidOperationException but is always our bug
            // (a scoped service used after the request ended) — it must stay a loud 500.
            case ObjectDisposedException:
                return new ClassifiedError((int)HttpStatusCode.InternalServerError, "Internal Server Error",
                    ApiErrorCodes.InternalError, "Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.");

            // InvalidOperationException also comes out of EF and other libraries, where the message
            // can name tables and expressions — so it is only surfaced in Development.
            case InvalidOperationException invalidOperation:
                return new ClassifiedError((int)HttpStatusCode.BadRequest, "Invalid Operation",
                    ApiErrorCodes.DomainRule,
                    _env.IsDevelopment() ? invalidOperation.Message : "Yêu cầu không thực hiện được ở trạng thái hiện tại.");

            case TimeoutException:
                return new ClassifiedError((int)HttpStatusCode.GatewayTimeout, "Timeout",
                    ApiErrorCodes.Timeout, "Hệ thống phản hồi quá chậm. Vui lòng thử lại.");

            default:
                return new ClassifiedError((int)HttpStatusCode.InternalServerError, "Internal Server Error",
                    ApiErrorCodes.InternalError,
                    _env.IsDevelopment()
                        ? exception.Message
                        : "Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.");
        }
    }

    /// <summary>Stable English title for a <see cref="DomainException"/>, derived from its status.</summary>
    private static string TitleForStatus(int status) => status switch
    {
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        409 => "Conflict",
        422 => "Unprocessable Entity",
        _ => "Request Failed"
    };
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

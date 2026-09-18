using System.Net;

namespace BuildingBlocks.Endpoints;

/// <summary>
/// One field-level error as it appears on the wire inside <c>errors[]</c>.
/// Frozen by W1-3 and documented in <c>docs/api-conventions.md</c>; the frontend
/// (<c>normalizeApiError</c>, W1-9/W1-13) parses exactly these three keys.
/// </summary>
/// <param name="Field">camelCase JSON path of the offending property, e.g. <c>address.street</c>.
/// Empty string for an error that belongs to the request as a whole.</param>
/// <param name="Code">Stable machine-readable code. Never localised, never displayed raw.</param>
/// <param name="Message">Vietnamese sentence written for the end user.</param>
public sealed record ApiFieldError(string Field, string Code, string Message);

/// <summary>
/// Stable <c>code</c> values carried by every error body. The HTTP status says "what class of
/// failure"; the code says "which failure", so the SPA can branch on it without string-matching a
/// Vietnamese sentence. Add to this list, never rename a member - wave-2/3 code branches on them.
/// </summary>
public static class ApiErrorCodes
{
    public const string ValidationFailed = "VALIDATION_FAILED";
    public const string BadRequest = "BAD_REQUEST";
    public const string DomainRule = "DOMAIN_RULE";
    public const string Unauthorized = "UNAUTHORIZED";
    public const string Forbidden = "FORBIDDEN";
    public const string NotFound = "NOT_FOUND";
    public const string Conflict = "CONFLICT";
    public const string DuplicateValue = "DUPLICATE_VALUE";
    public const string ConcurrencyConflict = "CONCURRENCY_CONFLICT";
    public const string InvalidReference = "INVALID_REFERENCE";
    public const string MissingRequiredField = "MISSING_REQUIRED_FIELD";
    public const string InvalidValue = "INVALID_VALUE";
    public const string ValueTooLong = "VALUE_TOO_LONG";
    public const string Timeout = "TIMEOUT";
    public const string InternalError = "INTERNAL_ERROR";
}

/// <summary>
/// Base class for every failure a handler raises ON PURPOSE. The global middleware turns these into
/// the documented 4xx bodies verbatim - a <see cref="DomainException"/> message IS user-facing copy
/// in every environment, unlike a raw exception message, which is only shown in Development.
///
/// Why a hierarchy rather than <c>Results.BadRequest(...)</c> everywhere: a business rule is usually
/// broken deep inside a service or an aggregate, far from the endpoint. Before this, those layers
/// threw <c>InvalidOperationException</c>, which the middleware could not distinguish from an EF
/// bug, so the message was suppressed outside Development and the caller got a useless 400.
/// </summary>
public class DomainException : Exception
{
    protected DomainException(
        string message,
        int statusCode,
        string code,
        IReadOnlyList<ApiFieldError>? errors = null)
        : base(message)
    {
        StatusCode = statusCode;
        Code = code;
        Errors = errors ?? Array.Empty<ApiFieldError>();
    }

    /// <summary>Thrown directly for a business-rule violation that has no more specific subtype.</summary>
    public DomainException(string message, IReadOnlyList<ApiFieldError>? errors = null)
        : this(message, (int)HttpStatusCode.BadRequest, ApiErrorCodes.DomainRule, errors)
    {
    }

    public int StatusCode { get; }

    public string Code { get; }

    /// <summary>Field-level detail; empty for a request-level rule.</summary>
    public IReadOnlyList<ApiFieldError> Errors { get; }
}

/// <summary>The addressed resource does not exist (or the caller may not know that it does). 404.</summary>
public sealed class NotFoundException : DomainException
{
    public NotFoundException(string message = "Không tìm thấy dữ liệu yêu cầu.")
        : base(message, (int)HttpStatusCode.NotFound, ApiErrorCodes.NotFound)
    {
    }

    /// <summary>"Không tìm thấy đơn hàng (mã: 42)." - no table or column name leaks out.</summary>
    public static NotFoundException For(string resourceVietnameseName, object id)
        => new($"Không tìm thấy {resourceVietnameseName} (mã: {id}).");
}

/// <summary>The request conflicts with current state: duplicate key, wrong status, already used. 409.</summary>
public sealed class ConflictException : DomainException
{
    public ConflictException(string message, IReadOnlyList<ApiFieldError>? errors = null)
        : base(message, (int)HttpStatusCode.Conflict, ApiErrorCodes.Conflict, errors)
    {
    }
}

/// <summary>
/// The caller is authenticated but not allowed. 403.
/// Authorization itself is enforced by the permission policies (W1-1/W1-10); this exists for the
/// rules a policy cannot express, e.g. "this order belongs to another customer".
/// </summary>
public sealed class ForbiddenException : DomainException
{
    public ForbiddenException(string message = "Bạn không có quyền thực hiện thao tác này.")
        : base(message, (int)HttpStatusCode.Forbidden, ApiErrorCodes.Forbidden)
    {
    }
}

/// <summary>
/// Input rejected outside the FluentValidation filter - a rule that needs the database
/// (e.g. "mã SKU đã tồn tại") or cross-field state the DTO validator cannot see. 400, same body
/// shape as the filter produces, so the SPA has one code path for both.
/// </summary>
public sealed class RequestValidationException : DomainException
{
    public RequestValidationException(IReadOnlyList<ApiFieldError> errors, string? message = null)
        : base(message ?? "Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.",
               (int)HttpStatusCode.BadRequest, ApiErrorCodes.ValidationFailed, errors)
    {
    }

    public RequestValidationException(string field, string message)
        : this(new[] { new ApiFieldError(field, ApiErrorCodes.InvalidValue, message) })
    {
    }
}

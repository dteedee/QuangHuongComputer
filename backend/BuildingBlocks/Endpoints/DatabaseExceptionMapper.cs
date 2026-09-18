using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace BuildingBlocks.Endpoints;

/// <summary>What a database failure should look like on the wire.</summary>
/// <param name="StatusCode">HTTP status to return.</param>
/// <param name="Title">Short, stable English title for the ProblemDetails <c>title</c> field.</param>
/// <param name="Message">User-facing Vietnamese message. Never contains schema or SQL text.</param>
/// <param name="Code">Stable machine code for the body's <c>code</c> field (see <see cref="ApiErrorCodes"/>).
/// Optional so the three-argument constructor existing callers use keeps compiling.</param>
public readonly record struct DatabaseErrorMapping(
    int StatusCode,
    string Title,
    string Message,
    string Code = ApiErrorCodes.BadRequest);

/// <summary>
/// Maps PostgreSQL constraint violations onto 4xx.
///
/// Before this, any violated constraint bubbled up as a raw <c>DbUpdateException</c> and the global
/// handler returned 500 — so "slug already taken" and "the database is down" were indistinguishable
/// to the client, and (audit rt-admin-12) a duplicate category name produced a 500 with a stack trace.
/// A constraint violation is a CLIENT error: the caller sent data the schema refuses.
///
/// SQLSTATE classes handled (PostgreSQL appendix A, class 23 = integrity constraint violation):
///   23505 unique_violation       -> 409 Conflict
///   23P01 exclusion_violation    -> 409 Conflict
///   23503 foreign_key_violation  -> 400 Bad Request (a referenced row does not exist / is still in use)
///   23502 not_null_violation     -> 400 Bad Request
///   23514 check_violation        -> 400 Bad Request
///   22001 string_too_long        -> 400 Bad Request
/// Everything else stays a 500 — an unmapped SQLSTATE is a real server fault and must stay loud.
/// </summary>
public static class DatabaseExceptionMapper
{
    /// <summary>Returns null when the exception is not a database error this mapper recognises.</summary>
    public static DatabaseErrorMapping? Map(Exception exception)
    {
        // Optimistic concurrency: somebody else changed the row first. Not a server fault.
        if (exception is DbUpdateConcurrencyException)
        {
            return new DatabaseErrorMapping(409, "Concurrency Conflict",
                "Dữ liệu đã được người khác thay đổi. Vui lòng tải lại và thử lại.",
                ApiErrorCodes.ConcurrencyConflict);
        }

        var pg = FindPostgresException(exception);
        if (pg is null) return null;

        return pg.SqlState switch
        {
            PostgresErrorCodes.UniqueViolation => new DatabaseErrorMapping(409, "Duplicate Value",
                "Giá trị này đã tồn tại. Vui lòng dùng giá trị khác.", ApiErrorCodes.DuplicateValue),
            PostgresErrorCodes.ExclusionViolation => new DatabaseErrorMapping(409, "Conflicting Value",
                "Giá trị này xung đột với một bản ghi đã có.", ApiErrorCodes.Conflict),
            PostgresErrorCodes.ForeignKeyViolation => new DatabaseErrorMapping(400, "Invalid Reference",
                "Dữ liệu tham chiếu không hợp lệ hoặc đang được sử dụng ở nơi khác.", ApiErrorCodes.InvalidReference),
            PostgresErrorCodes.NotNullViolation => new DatabaseErrorMapping(400, "Missing Required Field",
                "Thiếu thông tin bắt buộc. Vui lòng kiểm tra lại biểu mẫu.", ApiErrorCodes.MissingRequiredField),
            PostgresErrorCodes.CheckViolation => new DatabaseErrorMapping(400, "Invalid Value",
                "Giá trị gửi lên không hợp lệ.", ApiErrorCodes.InvalidValue),
            PostgresErrorCodes.StringDataRightTruncation => new DatabaseErrorMapping(400, "Value Too Long",
                "Nội dung quá dài so với giới hạn cho phép.", ApiErrorCodes.ValueTooLong),
            _ => null
        };
    }

    /// <summary>
    /// EF wraps the provider exception: <c>DbUpdateException -&gt; PostgresException</c>. Npgsql itself
    /// sometimes wraps again, so walk the whole inner chain instead of checking one level.
    /// </summary>
    private static PostgresException? FindPostgresException(Exception? exception)
    {
        for (var current = exception; current is not null; current = current.InnerException)
        {
            if (current is PostgresException pg) return pg;
        }
        return null;
    }
}

using BuildingBlocks.Endpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace BuildingBlocks.Validation;

/// <summary>
/// Endpoint filter chạy FluentValidation cho request DTO kiểu <typeparamref name="TRequest"/>.
///
/// Trả về ĐÚNG một hình dạng lỗi duy nhất của hệ thống (W1-3, xem <c>docs/api-conventions.md</c>):
/// 400 <c>application/problem+json</c> với <c>code = VALIDATION_FAILED</c> và
/// <c>errors[{ field, code, message }]</c>. Trước đây filter trả <c>{ errors: [{field,message}] }</c>
/// - thiếu <c>code</c> nên frontend không thể phân biệt "bỏ trống" với "sai định dạng", và thiếu
/// <c>status/traceId</c> nên không khớp với body mà middleware sinh ra.
///
/// Nếu không có validator cho <typeparamref name="TRequest"/>, filter cho request đi tiếp; việc đó
/// bị chặn NGAY LÚC KHỞI ĐỘNG bởi <see cref="ValidatorRegistrationGuard"/>, không phải lúc chạy.
/// </summary>
public sealed class ValidationEndpointFilter<TRequest> : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var argument = context.Arguments.OfType<TRequest>().FirstOrDefault();
        if (argument is null)
        {
            return await next(context);
        }

        var validator = context.HttpContext.RequestServices.GetService<global::FluentValidation.IValidator<TRequest>>();
        if (validator is null)
        {
            return await next(context);
        }

        var result = await validator.ValidateAsync(argument, context.HttpContext.RequestAborted);
        if (result.IsValid)
        {
            return await next(context);
        }

        var errors = result.Errors
            .Select(e => new ApiFieldError(
                ProblemDetailsFactory.ToCamelCasePath(e.PropertyName),
                // FluentValidation's rule name ("NotEmptyValidator", "EmailValidator", ...) is the
                // stable machine code; a custom rule can override it with .WithErrorCode("...").
                string.IsNullOrEmpty(e.ErrorCode) ? ApiErrorCodes.InvalidValue : e.ErrorCode,
                e.ErrorMessage))
            .ToList();

        var body = ProblemDetailsFactory.Build(
            context.HttpContext,
            StatusCodes.Status400BadRequest,
            "Validation Failed",
            ApiErrorCodes.ValidationFailed,
            "Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.",
            errors);

        context.HttpContext.Response.ContentType = ProblemDetailsFactory.ContentType;
        return Results.Json(body, ProblemDetailsFactory.SerializerOptions,
            contentType: ProblemDetailsFactory.ContentType,
            statusCode: StatusCodes.Status400BadRequest);
    }
}

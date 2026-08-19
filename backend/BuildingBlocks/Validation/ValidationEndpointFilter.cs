using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace BuildingBlocks.Validation;

/// <summary>
/// Endpoint filter chạy FluentValidation cho request DTO của kiểu <typeparamref name="TRequest"/>.
/// Trả 400 kèm payload chuẩn { errors: [{ field, message }] } khi không hợp lệ.
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
        if (!result.IsValid)
        {
            var errors = result.Errors
                .Select(e => new { field = ToCamelCase(e.PropertyName), message = e.ErrorMessage })
                .ToList();

            return Results.BadRequest(new { errors });
        }

        return await next(context);
    }

    private static string ToCamelCase(string propertyName)
    {
        if (string.IsNullOrEmpty(propertyName))
            return propertyName;

        // FluentValidation dùng đường dẫn property lồng nhau như "Address.Street" — chỉ camelCase từng đoạn.
        var segments = propertyName.Split('.');
        for (var i = 0; i < segments.Length; i++)
        {
            var s = segments[i];
            segments[i] = char.ToLowerInvariant(s[0]) + s[1..];
        }
        return string.Join('.', segments);
    }
}

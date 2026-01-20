using Microsoft.AspNetCore.Http;

namespace BuildingBlocks.Validation;

public static class ValidationExtensions
{
    public static IResult ToResult(this ValidationResult validationResult)
    {
        if (validationResult.IsValid)
        {
            return Results.Ok();
        }

        return Results.BadRequest(new
        {
            error = "Validation failed",
            errors = validationResult.Errors
        });
    }

    public static IResult ToResult<T>(this ValidationResult validationResult, T data)
    {
        if (validationResult.IsValid)
        {
            return Results.Ok(data);
        }

        return Results.BadRequest(new
        {
            error = "Validation failed",
            errors = validationResult.Errors
        });
    }
}

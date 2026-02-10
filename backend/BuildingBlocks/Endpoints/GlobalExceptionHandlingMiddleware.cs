using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.Endpoints;

/// <summary>
/// Standard error response format for the entire system
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
/// Global middleware to catch all unhandled exceptions and return standard error responses
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
            _logger.LogError(ex, "Unhandled exception occurred: {Message} at {Path}", ex.Message, context.Request.Path);

            if (context.Response.HasStarted)
            {
                _logger.LogWarning("The response has already started, the exception middleware will not be executed.");
                return;
            }

            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var response = new ErrorResponse
        {
            TraceId = context.TraceIdentifier,
            Instance = context.Request.Path,
            StatusCode = (int)HttpStatusCode.InternalServerError,
            Message = "An unexpected error occurred while processing your request."
        };

        // Handle specific exception types if needed
        switch (exception)
        {
            case UnauthorizedAccessException:
                response.StatusCode = (int)HttpStatusCode.Unauthorized;
                response.Message = "Unauthorized access.";
                break;
            case KeyNotFoundException:
                response.StatusCode = (int)HttpStatusCode.NotFound;
                response.Message = "The requested resource was not found.";
                break;
            case ArgumentException:
            case InvalidOperationException:
                response.StatusCode = (int)HttpStatusCode.BadRequest;
                response.Message = exception.Message;
                break;
        }

        context.Response.StatusCode = response.StatusCode;

        // In development, provide detailed exception information
        if (_env.IsDevelopment())
        {
            response.Detail = exception.ToString();
            // In dev, use the actual message if it's an internal error
            if (response.StatusCode == (int)HttpStatusCode.InternalServerError)
            {
                response.Message = exception.Message;
            }
        }

        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        var result = JsonSerializer.Serialize(response, options);
        await context.Response.WriteAsync(result);
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

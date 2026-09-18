using System.Text;
using System.Text.Json;
using BuildingBlocks.Endpoints;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using Xunit;

namespace UnitTests.Platform;

/// <summary>
/// Drives the real middleware over a real <see cref="DefaultHttpContext"/>, because the two rules it
/// enforces are both observable only in the response: a constraint violation must be a 4xx, and
/// outside Development the body must carry no exception text.
/// </summary>
public class GlobalExceptionHandlingMiddlewareTests
{
    private sealed class FakeEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "Tests";
        public string ContentRootPath { get; set; } = ".";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static async Task<(int Status, string ContentType, JsonElement Body)> RunAsync(
        Exception thrown, string environment)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/catalog/categories";
        context.Request.Method = "POST";
        context.Response.Body = new MemoryStream();

        var middleware = new GlobalExceptionHandlingMiddleware(
            _ => throw thrown,
            NullLogger<GlobalExceptionHandlingMiddleware>.Instance,
            new FakeEnvironment { EnvironmentName = environment });

        await middleware.InvokeAsync(context);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var raw = await new StreamReader(context.Response.Body, Encoding.UTF8).ReadToEndAsync();
        return (context.Response.StatusCode, context.Response.ContentType ?? "", JsonDocument.Parse(raw).RootElement);
    }

    private static DbUpdateException DuplicateKey() => new(
        "An error occurred while saving the entity changes.",
        new PostgresException(
            messageText: "duplicate key value violates unique constraint \"IX_Categories_Name_IsActive\"",
            severity: "ERROR", invariantSeverity: "ERROR", sqlState: "23505"));

    [Fact]
    public async Task DuplicateKey_Returns409ProblemDetails_NotA500()
    {
        var (status, contentType, body) = await RunAsync(DuplicateKey(), Environments.Production);

        status.Should().Be(409);
        contentType.Should().Be("application/problem+json");
        body.GetProperty("status").GetInt32().Should().Be(409);
        body.GetProperty("title").GetString().Should().Be("Duplicate Value");
        body.GetProperty("traceId").GetString().Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Production_LeaksNoExceptionText()
    {
        var (_, _, body) = await RunAsync(DuplicateKey(), Environments.Production);
        var raw = body.GetRawText();

        body.TryGetProperty("detail", out _).Should().BeFalse("exception text is Development-only");
        raw.Should().NotContain("IX_Categories_Name_IsActive", "an index name is schema information");
        raw.Should().NotContain("PostgresException");
        raw.Should().NotContain("DbUpdateException");
    }

    [Fact]
    public async Task Development_KeepsTheExceptionDetailForDebugging()
    {
        var (status, _, body) = await RunAsync(DuplicateKey(), Environments.Development);

        status.Should().Be(409);
        body.GetProperty("detail").GetString().Should().Contain("DbUpdateException");
    }

    [Fact]
    public async Task Body_CarriesTheLegacyErrorAndMessageKeysTheSpaReads()
    {
        // 73 frontend call sites read data.error and 26 read data.message. Dropping them would turn
        // every error toast blank, so they are part of the contract.
        var (_, _, body) = await RunAsync(DuplicateKey(), Environments.Production);

        body.GetProperty("error").GetString().Should().NotBeNullOrWhiteSpace();
        body.GetProperty("message").GetString().Should().Be(body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task UnknownException_StaysA500WithNoDetail_InProduction()
    {
        var (status, _, body) = await RunAsync(new Exception("connection pool exhausted at 0x1234"), Environments.Production);

        status.Should().Be(500);
        body.GetRawText().Should().NotContain("0x1234");
    }

    [Fact]
    public async Task UndefinedTable_StaysA500()
    {
        // 42P01 is schema drift, not a client mistake. The smoke check catches it at startup; if one
        // slips through at runtime it must NOT be disguised as a 4xx.
        var drift = new DbUpdateException("boom", new PostgresException(
            messageText: "relation \"payments.PaymentIntents\" does not exist",
            severity: "ERROR", invariantSeverity: "ERROR", sqlState: "42P01"));

        var (status, _, _) = await RunAsync(drift, Environments.Production);

        status.Should().Be(500);
    }

    [Fact]
    public async Task KeyNotFound_Returns404()
    {
        var (status, _, _) = await RunAsync(new KeyNotFoundException("no such product"), Environments.Production);

        status.Should().Be(404);
    }
}

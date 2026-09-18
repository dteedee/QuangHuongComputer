using BuildingBlocks.Endpoints;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Xunit;

namespace UnitTests.Platform;

/// <summary>
/// A violated constraint is the caller sending data the schema refuses — a 4xx. Before the mapper
/// every one of them surfaced as a 500 (audit rt-admin-12: a duplicate category name returned 500
/// with a stack trace in the body).
/// </summary>
public class DatabaseExceptionMapperTests
{
    /// <summary>
    /// PostgresException's public constructor is the only way to build one without a live server;
    /// the SQLSTATE is the fifth argument.
    /// </summary>
    private static PostgresException Pg(string sqlState)
        => new(messageText: "violates constraint", severity: "ERROR", invariantSeverity: "ERROR", sqlState: sqlState);

    [Theory]
    [InlineData("23505", 409)] // unique_violation      -> duplicate slug / duplicate category name
    [InlineData("23P01", 409)] // exclusion_violation
    [InlineData("23503", 400)] // foreign_key_violation -> unknown brand id, or row still referenced
    [InlineData("23502", 400)] // not_null_violation
    [InlineData("23514", 400)] // check_violation
    [InlineData("22001", 400)] // string_data_right_truncation
    public void ConstraintViolations_MapToClientErrors(string sqlState, int expectedStatus)
    {
        var mapping = DatabaseExceptionMapper.Map(Pg(sqlState));

        mapping.Should().NotBeNull();
        mapping!.Value.StatusCode.Should().Be(expectedStatus);
        mapping.Value.Message.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void WrappedInDbUpdateException_IsStillFound()
    {
        // This is the shape EF actually throws: DbUpdateException -> PostgresException.
        var wrapped = new DbUpdateException("An error occurred while saving", Pg("23505"));

        DatabaseExceptionMapper.Map(wrapped)!.Value.StatusCode.Should().Be(409);
    }

    [Fact]
    public void ConcurrencyConflict_Maps409()
    {
        DatabaseExceptionMapper.Map(new DbUpdateConcurrencyException("row changed"))!
            .Value.StatusCode.Should().Be(409);
    }

    [Fact]
    public void UnmappedSqlState_StaysAServerError()
    {
        // 42P01 = undefined_table: real schema drift, must NOT be softened into a 4xx.
        DatabaseExceptionMapper.Map(Pg("42P01")).Should().BeNull();
        // 53300 = too_many_connections: infrastructure, also a genuine 500.
        DatabaseExceptionMapper.Map(Pg("53300")).Should().BeNull();
    }

    [Fact]
    public void NonDatabaseException_IsNotClaimed()
    {
        DatabaseExceptionMapper.Map(new InvalidOperationException("business rule")).Should().BeNull();
    }

    [Fact]
    public void MappedMessages_LeakNoSchemaDetail()
    {
        var mapping = DatabaseExceptionMapper.Map(
            new DbUpdateException("INSERT INTO public.\"Products\" ...", Pg("23505")))!.Value;

        mapping.Message.Should().NotContain("Products");
        mapping.Message.Should().NotContain("INSERT");
        mapping.Message.Should().NotContain("constraint");
    }
}
